// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const nodemailer = require("nodemailer");

const app = express();

// Trust proxy (important on Render / many PaaS)
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

/* ----------------- CORS Setup ----------------- */
/**
 * ALLOWED_ORIGIN env may be:
 * - "*" (allow all) OR
 * - a single origin string OR
 * - a comma-separated list of origins
 */
const rawAllowed = process.env.ALLOWED_ORIGIN || "*";
const allowedOrigins =
  rawAllowed === "*"
    ? ["*"]
    : rawAllowed.split(",").map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes("*") || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200,
};
app.use((req, res, next) => {
  // For preflight CORS errors to show clearer logs
  next();
});
app.use(cors(corsOptions));

/* ----------------- Security & Parsing ----------------- */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

/* ----------------- Rate Limiting ----------------- */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many requests, please try again later." }),
});
app.use("/api/", limiter);

/* ----------------- Mail provider setup ----------------- */
let mailProvider = null; // "sendgrid" or "smtp" or null
let sendGridClient = null;
let smtpTransporter = null;
let mailReady = false;

// Try to configure SendGrid if API key present
if (process.env.SENDGRID_API_KEY) {
  try {
    // lazy require so file doesn't crash if package missing during local dev
    sendGridClient = require("@sendgrid/mail");
    sendGridClient.setApiKey(process.env.SENDGRID_API_KEY);
    mailProvider = "sendgrid";
    mailReady = true; // will remain true unless send fails at runtime
    console.log("SendGrid API client configured.");
  } catch (e) {
    console.warn("Failed to require @sendgrid/mail — continuing without SendGrid.", e && e.message ? e.message : e);
    sendGridClient = null;
    mailReady = false;
  }
}

// nodemailer SMTP fallback if SendGrid not configured or you prefer SMTP as fallback
function createSmtpTransporterFromEnv() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true", // true for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      requireTLS: true,
      // optional timeouts can be set via env if needed
    });
    return transport;
  } catch (e) {
    console.warn("Failed to create SMTP transporter:", e && e.message ? e.message : e);
    return null;
  }
}

if (!sendGridClient) {
  smtpTransporter = createSmtpTransporterFromEnv();
  if (smtpTransporter) {
    mailProvider = "smtp";
    // verify transporter
    smtpTransporter.verify().then(() => {
      mailReady = true;
      console.log("SMTP transporter verified and ready.");
    }).catch((err) => {
      mailReady = false;
      console.warn("SMTP verification failed:", err && err.message ? err.message : err);
    });
  } else {
    mailReady = false;
    console.warn("No mail transporter configured (SendGrid missing and SMTP vars not set).");
  }
} else {
  // If sendGrid configured, optionally we could do a simple test (skip heavy network op)
  // We'll assume mailReady true here; any runtime errors will be logged.
  mailProvider = "sendgrid";
}

/* ----------------- Utilities ----------------- */
function sanitizeText(s) {
  return String(s || "").trim();
}

/* ----------------- Routes ----------------- */
app.get("/", (req, res) => {
  res.send("Jenizo backend running. Use /api endpoints.");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", mailReady, provider: mailProvider });
});

/* ---------- Validation helpers (inquiry + contact) ---------- */
function validateInquiryPayload(data = {}) {
  const errors = {};
  const out = {};
  out.fullName = sanitizeText(data.fullName);
  out.email = sanitizeText(data.email);
  out.phone = sanitizeText(data.phone);
  out.projectType = sanitizeText(data.projectType);
  out.budget = sanitizeText(data.budget);
  out.description = sanitizeText(data.description);

  if (!out.fullName) errors.fullName = "Full name is required.";
  if (!out.email) errors.email = "Email is required.";
  else if (!validator.isEmail(out.email)) errors.email = "Invalid email address.";
  if (!out.phone) errors.phone = "Phone number is required.";
  else if (!/^[+0-9\s\-()]{7,40}$/.test(out.phone)) errors.phone = "Invalid phone number.";
  if (!out.projectType) errors.projectType = "Project type is required.";
  if (!out.budget) errors.budget = "Budget is required.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

function validateContactPayload(data = {}) {
  const errors = {};
  const out = {};
  out.name = sanitizeText(data.name);
  out.email = sanitizeText(data.email);
  out.phone = sanitizeText(data.phone);
  out.message = sanitizeText(data.message);

  if (!out.name || out.name.length < 2) errors.name = "Name is required.";
  if (!out.email || !validator.isEmail(out.email)) errors.email = "Valid email is required.";
  if (!out.phone || out.phone.length < 7) errors.phone = "Valid phone number is required.";
  if (!out.message || out.message.length < 5) errors.message = "Message is too short.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

/* ----------------- Mail sending wrapper ----------------- */
async function sendMailUsingProvider({ to, subject, text, html, replyTo }) {
  if (mailProvider === "sendgrid" && sendGridClient) {
    const from = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER;
    if (!from) throw new Error("SENDGRID_FROM (or SMTP_FROM/EMAIL_USER) not set");
    const msg = {
      to,
      from,
      subject,
      text,
      html,
      replyTo: replyTo || undefined,
    };
    // sendGridClient.send returns a Promise
    return sendGridClient.send(msg);
  }

  if (mailProvider === "smtp" && smtpTransporter) {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SENDGRID_FROM,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || undefined,
    };
    return smtpTransporter.sendMail(mailOptions);
  }

  throw new Error("No mail provider configured");
}

/* ----------------- /api/inquiries ----------------- */
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInquiryPayload(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    if (!mailReady) {
      console.error("Mail transporter not ready.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `New Project Inquiry — ${out.fullName}`;

    const safeDescHtml = out.description ? `<p><strong>Project Description:</strong><br/>${validator.escape(out.description).replace(/\n/g, "<br/>")}</p>` : "";
    const html = `
      <div style="font-family: Arial,Helvetica,sans-serif;color:#222;">
        <h2>New Project Inquiry</h2>
        <p><strong>Full Name:</strong> ${validator.escape(out.fullName)}</p>
        <p><strong>Email:</strong> ${validator.escape(out.email)}</p>
        <p><strong>Phone:</strong> ${validator.escape(out.phone)}</p>
        <p><strong>Project Type:</strong> ${validator.escape(out.projectType)}</p>
        <p><strong>Estimated Budget:</strong> ${validator.escape(out.budget)}</p>
        ${safeDescHtml}
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
Submitted at: ${submittedAt} (Asia/Kolkata)
`;

    const to = process.env.TO_EMAIL || process.env.COMPANY_EMAIL;
    if (!to) return res.status(500).json({ error: "Server misconfiguration: destination email not set" });

    const info = await sendMailUsingProvider({
      to,
      subject,
      text,
      html,
      replyTo: out.email, // reply goes to submitter
    });

    // If using nodemailer, info.messageId exists; SendGrid returns array/res object
    const messageId = (info && info.messageId) || (Array.isArray(info) && info[0] && info[0].headers && info[0].headers["x-message-id"]) || null;

    return res.status(200).json({ ok: true, message: "Inquiry sent", messageId });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* ----------------- /api/contact ----------------- */
app.post("/api/contact", async (req, res) => {
  try {
    if (!mailReady) {
      console.error("Mail transporter not ready.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const { valid, errors, out } = validateContactPayload(req.body || {});
    if (!valid) return res.status(400).json({ errors });

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

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

    const to = process.env.COMPANY_EMAIL || process.env.TO_EMAIL;
    if (!to) return res.status(500).json({ error: "Server misconfiguration: destination email not set" });

    const info = await sendMailUsingProvider({
      to,
      subject: `Contact Form — ${out.name}`,
      text,
      html,
      replyTo: out.email,
    });

    const messageId = (info && info.messageId) || (Array.isArray(info) && info[0] && info[0].headers && info[0].headers["x-message-id"]) || null;

    console.log("Contact mail sent, messageId:", messageId);

    return res.status(200).json({ ok: true, messageId });
  } catch (err) {
    console.error("Error in /api/contact handler:", err && err.stack ? err.stack : err);
    // If sendgrid returns Forbidden/401, it will surface here - logs will show details
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

/* ----------------- Start ----------------- */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
  console.log(`Mail provider: ${mailProvider || "none"}, mailReady: ${mailReady}`);
});
