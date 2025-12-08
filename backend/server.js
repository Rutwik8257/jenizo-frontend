
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const nodemailer = require("nodemailer");

const app = express();

// Trust proxy for correct client IP (useful on Render, Vercel etc.)
app.set("trust proxy", process.env.TRUST_PROXY ?? 1);

const PORT = process.env.PORT || 8080;

/* ----------------- Middleware ----------------- */
app.use(helmet());
app.use(express.json({ limit: "150kb" }));

/* --------- CORS setup (comma-separated list) --------- */
const rawOrigins = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);

// If no ALLOWED_ORIGIN provided, default to allowing localhost:3000 in dev
if (!rawOrigins.length && (process.env.NODE_ENV || "development") === "development") {
  rawOrigins.push("http://localhost:3000");
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    if (rawOrigins.includes(origin)) return callback(null, true);

    // match exact hostnames without protocol (sometimes Vercel preview hosts differ)
    const originHostname = origin.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (rawOrigins.some(o => o.replace(/^https?:\/\//, "").replace(/\/.*$/, "") === originHostname)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"), false);
  },
  optionsSuccessStatus: 204,
  methods: ["GET", "POST", "OPTIONS"],
};

app.use(cors(corsOptions));

/* --------- Rate limiter for API endpoints --------- */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many requests, please try again later." }),
});
app.use("/api/", limiter);

/* ----------------- Email provider setup ----------------- */
let mailProvider = null; // "sendgrid" | "smtp" | null
let mailReady = false;
let sendGridClient = null;
let transporter = null;

// Try to configure SendGrid first
if (process.env.SENDGRID_API_KEY) {
  try {
    // require lazily so server can still start if package missing
    sendGridClient = require("@sendgrid/mail");
    sendGridClient.setApiKey(process.env.SENDGRID_API_KEY.trim());
    // quick test send will be skipped here; we will call sendGridClient when sending
    mailProvider = "sendgrid";
    mailReady = true;
    console.log("SendGrid API client configured.");
  } catch (e) {
    console.warn("Failed to configure @sendgrid/mail — package may be missing. Falling back to SMTP if configured.", e && e.message ? e.message : e);
    sendGridClient = null;
    mailProvider = null;
  }
}

// If SendGrid not available, try generic SMTP via nodemailer (if env provided)
if (!mailReady) {
  // build transporter if SMTP envs present
  const hasSmtp = !!(process.env.EMAIL_HOST || (process.env.EMAIL_USER && process.env.EMAIL_PASS));
  if (hasSmtp) {
    try {
      const opts = {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
        secure: (process.env.EMAIL_SECURE === "true") || false,
        auth: undefined,
      };
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        opts.auth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
      }
      // timeouts (optional)
      opts.connectionTimeout = process.env.SMTP_CONN_TIMEOUT ? Number(process.env.SMTP_CONN_TIMEOUT) : 15_000;
      transporter = nodemailer.createTransport(opts);

      // verify transporter
      transporter.verify()
        .then(() => {
          mailProvider = "smtp";
          mailReady = true;
          console.log("SMTP transporter verified and ready.");
        })
        .catch((err) => {
          mailReady = false;
          console.warn("SMTP transporter verification failed:", err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn("Failed to create SMTP transporter:", err && err.message ? err.message : err);
      transporter = null;
      mailReady = false;
    }
  } else {
    console.log("No SendGrid API key and no SMTP configuration detected — mail not configured.");
  }
}

/* ----------------- Helpers ----------------- */

/**
 * chooseDestinationEmail()
 * Returns destination email address for contact/inquiry (priority envs)
 */
function chooseDestinationEmail() {
  return (process.env.COMPANY_EMAIL || process.env.TO_EMAIL || "").trim();
}

/**
 * sanitizeText -> small helper to ensure output strings are present
 */
function sanitizeText(v) {
  return typeof v === "string" ? v.trim() : "";
}

/* ----------------- Routes ----------------- */

// Root friendly message
app.get("/", (req, res) => {
  res.send("Jenizo backend running. Use /api endpoints.");
});

// Health-check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    mailReady,
    provider: mailProvider || null,
  });
});

/* ---------- Validation helpers ---------- */

function validateInquiryInput(data = {}) {
  const out = {
    fullName: sanitizeText(data.fullName),
    email: sanitizeText(data.email),
    phone: sanitizeText(data.phone),
    projectType: sanitizeText(data.projectType),
    budget: sanitizeText(data.budget),
    description: sanitizeText(data.description),
  };

  const errors = {};
  if (!out.fullName) errors.fullName = "Full name is required.";
  if (!out.email) errors.email = "Email is required.";
  else if (!validator.isEmail(out.email)) errors.email = "Invalid email.";
  if (!out.phone) errors.phone = "Phone number is required.";
  else if (!/^[+0-9\s\-()]{7,50}$/.test(out.phone)) errors.phone = "Invalid phone number.";
  if (!out.projectType) errors.projectType = "Project type is required.";
  if (!out.budget) errors.budget = "Budget is required.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

function validateContactInput(data = {}) {
  const out = {
    name: sanitizeText(data.name),
    email: sanitizeText(data.email),
    phone: sanitizeText(data.phone),
    message: sanitizeText(data.message),
  };

  const errors = {};
  if (!out.name || out.name.length < 2) errors.name = "Name is required.";
  if (!out.email || !validator.isEmail(out.email)) errors.email = "Valid email is required.";
  if (!out.phone || out.phone.length < 7) errors.phone = "Valid phone number is required.";
  if (!out.message || out.message.length < 5) errors.message = "Message is too short.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

/* ---------- Email send helpers ---------- */

async function sendViaSendGrid({ to, from, subject, text, html, replyTo }) {
  if (!sendGridClient) throw new Error("SendGrid client not initialized.");
  const msg = {
    to,
    from,
    subject,
    text,
    html,
  };
  if (replyTo) msg.replyTo = replyTo;
  // sendGridClient.send returns an array of responses for some clients
  return sendGridClient.send(msg);
}

async function sendViaSMTP({ to, from, subject, text, html, replyTo }) {
  if (!transporter) throw new Error("SMTP transporter not initialized.");
  const mailOptions = { from, to, subject, text, html };
  if (replyTo) mailOptions.replyTo = replyTo;
  return transporter.sendMail(mailOptions);
}

/* ----------------- API Endpoints ----------------- */

/**
 * POST /api/inquiries
 * - expects fullName, email, phone, projectType, budget, description (optional)
 */
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInquiryInput(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send inquiry email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `New Project Inquiry — ${out.fullName}`;
    const safeHtmlDesc = out.description ? `<p><strong>Project Description:</strong><br/>${validator.escape(out.description).replace(/\n/g, "<br/>")}</p>` : "";
    const html = `
      <div style="font-family: Arial,Helvetica,sans-serif;color:#222;">
        <h2>New Project Inquiry</h2>
        <p><strong>Full Name:</strong> ${validator.escape(out.fullName)}</p>
        <p><strong>Email:</strong> ${validator.escape(out.email)}</p>
        <p><strong>Phone:</strong> ${validator.escape(out.phone)}</p>
        <p><strong>Project Type:</strong> ${validator.escape(out.projectType)}</p>
        <p><strong>Estimated Budget:</strong> ${validator.escape(out.budget)}</p>
        ${safeHtmlDesc}
        <p style="color:#666;font-size:12px;">Submitted at: ${submittedAt} (Asia/Kolkata)</p>
      </div>
    `;
    const text = `
New Project Inquiry

Full Name: ${out.fullName}
Email: ${out.email}
Phone: ${out.phone}
Project Type: ${out.projectType}
Estimated Budget: ${out.budget}

${out.description ? "Project Description:\n" + out.description + "\n\n" : ""}
Submitted at: ${submittedAt}
    `;

    const to = chooseDestinationEmail();
    if (!to) {
      console.error("Destination email not configured (COMPANY_EMAIL/TO_EMAIL).");
      return res.status(500).json({ error: "Server misconfiguration: destination email missing" });
    }

    // choose "from" address: prefer SENDGRID_FROM or SMTP_FROM or EMAIL_USER
    const from = (process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || "").trim() || `no-reply@${req.hostname}`;

    // send via configured provider
    if (mailProvider === "sendgrid") {
      try {
        const resp = await sendViaSendGrid({ to, from, subject, text, html, replyTo: out.email });
        console.log("Inquiry sent via SendGrid:", resp && resp.length ? resp[0].statusCode : "ok");
      } catch (err) {
        console.error("SendGrid send error:", (err && err.response && err.response.body) ? err.response.body : err);
        return res.status(500).json({ error: "Failed to send email via SendGrid" });
      }
    } else if (mailProvider === "smtp") {
      try {
        const info = await sendViaSMTP({ to, from, subject, text, html, replyTo: out.email });
        console.log("Inquiry sent via SMTP, messageId:", info && info.messageId);
      } catch (err) {
        console.error("SMTP send error:", err && err.stack ? err.stack : err);
        return res.status(500).json({ error: "Failed to send email via SMTP" });
      }
    } else {
      return res.status(503).json({ error: "No mail transport configured" });
    }

    return res.status(200).json({ ok: true, message: "Inquiry sent" });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * POST /api/contact
 * - expects name, email, phone, message
 */
app.post("/api/contact", async (req, res) => {
  try {
    const { valid, errors, out } = validateContactInput(req.body || {});
    if (!valid) return res.status(400).json({ errors });

    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send contact email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `Contact Form — ${out.name}`;
    const html = `
      <div style="font-family: Arial,Helvetica,sans-serif;color:#222;">
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${validator.escape(out.name)}</p>
        <p><strong>Email:</strong> ${validator.escape(out.email)}</p>
        <p><strong>Phone:</strong> ${validator.escape(out.phone)}</p>
        <p><strong>Message:</strong><br/>${validator.escape(out.message).replace(/\n/g, "<br/>")}</p>
        <p style="color:#666;font-size:12px;">Submitted at: ${submittedAt} (Asia/Kolkata)</p>
      </div>
    `;
    const text = `New Contact Message

Name: ${out.name}
Email: ${out.email}
Phone: ${out.phone}

Message:
${out.message}

Submitted at: ${submittedAt}
`;

    const to = chooseDestinationEmail();
    if (!to) {
      console.error("Destination email not configured (COMPANY_EMAIL/TO_EMAIL).");
      return res.status(500).json({ error: "Server misconfiguration: destination email missing" });
    }

    const from = (process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || "").trim() || `no-reply@${req.hostname}`;

    if (mailProvider === "sendgrid") {
      try {
        const resp = await sendViaSendGrid({ to, from, subject, text, html, replyTo: out.email });
        console.log("Contact sent via SendGrid:", resp && resp.length ? resp[0].statusCode : "ok");
      } catch (err) {
        console.error("SendGrid send error:", (err && err.response && err.response.body) ? err.response.body : err);
        return res.status(500).json({ error: "Failed to send email via SendGrid" });
      }
    } else if (mailProvider === "smtp") {
      try {
        const info = await sendViaSMTP({ to, from, subject, text, html, replyTo: out.email });
        console.log("Contact sent via SMTP, messageId:", info && info.messageId);
      } catch (err) {
        console.error("SMTP send error:", err && err.stack ? err.stack : err);
        return res.status(500).json({ error: "Failed to send email via SMTP" });
      }
    } else {
      return res.status(503).json({ error: "No mail transport configured" });
    }

    return res.status(200).json({ ok: true, message: "Contact message sent" });
  } catch (err) {
    console.error("Error in /api/contact handler:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

/* ----------------- Start server ----------------- */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
  console.log("Mail provider:", mailProvider || "none", "Mail ready:", mailReady);
});
