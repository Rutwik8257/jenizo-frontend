
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const validator = require("validator");

const app = express();

// trust proxy for correct client ip detection on Render/Vercel
app.set("trust proxy", process.env.TRUST_PROXY ?? 1);

const PORT = process.env.PORT || 8080;

/* ---------- Middleware ---------- */
app.use(helmet());
app.use(express.json({ limit: "150kb" }));

/* ---------- CORS: allow comma-separated origins ---------- */
const rawOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// default for local dev
if (!rawOrigins.length && (process.env.NODE_ENV || "development") === "development") {
  rawOrigins.push("http://localhost:3000");
}

const corsOptions = {
  origin: (origin, cb) => {
    // allow requests w/out origin (server-to-server, curl)
    if (!origin) return cb(null, true);

    if (rawOrigins.includes(origin)) return cb(null, true);

    // also match by hostname (strip protocol + path)
    const host = origin.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (rawOrigins.some(o => o.replace(/^https?:\/\//, "").replace(/\/.*$/, "") === host)) {
      return cb(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

/* ---------- Rate limiter ---------- */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many requests, please try again later." }),
});
app.use("/api/contact", limiter);
app.use("/api/inquiries", limiter);


/* ---------- Choose & configure mail provider ---------- */
let mailProvider = null; // "sendgrid" | "smtp" | null
let mailReady = false;
let sendGridClient = null;
let nodemailer = null;
let smtpTransporter = null;

// Prefer SendGrid if API key present
if (process.env.SENDGRID_API_KEY) {
  try {
    sendGridClient = require("@sendgrid/mail");
    sendGridClient.setApiKey(process.env.SENDGRID_API_KEY.trim());
    mailProvider = "sendgrid";
    mailReady = true;
    console.log("SendGrid API client configured.");
  } catch (e) {
    console.warn("SendGrid client not available or failed to initialize:", e && e.message ? e.message : e);
    sendGridClient = null;
    mailReady = false;
  }
}

// If SendGrid not ready, attempt SMTP (optional)
if (!mailReady && (process.env.EMAIL_HOST || (process.env.EMAIL_USER && process.env.EMAIL_PASS))) {
  try {
    nodemailer = require("nodemailer");

    const opts = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true",
      connectionTimeout: process.env.SMTP_CONN_TIMEOUT
        ? Number(process.env.SMTP_CONN_TIMEOUT)
        : 15000,
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      opts.auth = {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim(),
      };
    }

    smtpTransporter = nodemailer.createTransport(opts);

    // 🔥 NON-blocking verify
    smtpTransporter.verify()
      .then(() => console.log("SMTP ready"))
      .catch(err => console.warn("SMTP verify warning:", err?.message || err));

    // ✅ Mark SMTP usable immediately
    mailProvider = "smtp";
    mailReady = true;

  } catch (e) {
    console.warn("Failed to set up nodemailer:", e?.message || e);
  }
}


console.log("Mail provider:", mailProvider || "none", "mailReady:", mailReady);

/* ---------- Helpers ---------- */
function sanitizeText(v) { return typeof v === "string" ? v.trim() : ""; }
function chooseDestinationEmail() {
  return (process.env.COMPANY_EMAIL || process.env.TO_EMAIL || "").trim();
}
function chooseFromEmail() {
  // prefer explicit sendgrid from, then SMTP_FROM, then EMAIL_USER
  return (process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || "").trim();
}

/* ---------- Validation ---------- */
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
  if (!out.email || !validator.isEmail(out.email)) errors.email = "Valid email is required.";
  if (!out.phone || !/^[+0-9\s\-()]{7,50}$/.test(out.phone)) errors.phone = "Invalid phone number.";
  if (!out.projectType) errors.projectType = "Project type is required.";
  if (!out.budget) errors.budget = "Budget is required.";
  return { valid: Object.keys(errors).length === 0, errors, out };
}

/* ---------- Send helpers ---------- */
async function sendViaSendGrid({ to, from, subject, text, html, replyTo }) {
  if (!sendGridClient) throw new Error("SendGrid client not initialized");
  const msg = { to, from, subject, text, html };
  if (replyTo) msg.replyTo = replyTo;
  return sendGridClient.send(msg);
}
async function sendViaSMTP({ to, from, subject, text, html, replyTo }) {
  if (!smtpTransporter) throw new Error("SMTP transporter not initialized");
  const mailOptions = { from, to, subject, text, html };
  if (replyTo) mailOptions.replyTo = replyTo;
  return smtpTransporter.sendMail(mailOptions);
}

/* ---------- MongoDB + Auth routes (INSERT HERE) ---------- */
const mongoose = require('mongoose');

// connect to mongo
const mongoUri = (process.env.MONGODB_URI || "").trim();
if (!mongoUri) {
  console.warn("MONGODB_URI not set - auth/routes requiring DB will fail until configured.");
} else {
mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connect error:", err && err.message ? err.message : err));

}

// mount auth + application API routes if present
let authRoutes, applicationRoutes;
try {
  authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log("Mounted /api/auth routes");
} catch (e) {
  console.warn("Auth routes not found (./routes/auth). Create the file and export an Express router to enable authentication.", e && e.message ? e.message : e);
}




/* ---------- Routes ---------- */
app.get("/", (req, res) => res.send("Jenizo backend running. Use /api endpoints."));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", mailReady, provider: mailProvider || null });
});

/* POST /api/contact */
app.post("/api/contact", async (req, res) => {
  try {
    const { valid, errors, out } = validateContactInput(req.body || {});
    if (!valid) return res.status(400).json({ errors });

    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send contact email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const to = chooseDestinationEmail();
    if (!to) {
      console.error("Destination email not configured (COMPANY_EMAIL/TO_EMAIL).");
      return res.status(500).json({ error: "Server misconfiguration: destination email missing" });
    }

    const from = chooseFromEmail() || `no-reply@${req.hostname}`;
    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `Contact Form — ${out.name}`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #222;">
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${validator.escape(out.name)}</p>
        <p><strong>Email:</strong> ${validator.escape(out.email)}</p>
        <p><strong>Phone:</strong> ${validator.escape(out.phone)}</p>
        <p><strong>Message:</strong><br/>${validator.escape(out.message).replace(/\n/g, "<br/>")}</p>
        <p style="color:#666;font-size:12px;">Submitted at: ${submittedAt} (Asia/Kolkata)</p>
      </div>
    `;
    const text = `Contact message from ${out.name}\n\n${out.message}\n\nPhone: ${out.phone}\nEmail: ${out.email}\nSubmitted at: ${submittedAt}`;

    try {
      if (mailProvider === "sendgrid") {
        const resp = await sendViaSendGrid({ to, from, subject, text, html, replyTo: out.email });
        console.log("Contact sent via SendGrid:", resp && resp.length ? resp[0].statusCode : "ok");
      } else if (mailProvider === "smtp") {
        const info = await sendViaSMTP({ to, from, subject, text, html, replyTo: out.email });
        console.log("Contact sent via SMTP, messageId:", info && info.messageId);
      } else {
        return res.status(503).json({ error: "No mail transport configured" });
      }
    } catch (err) {
      // Log send provider response body when available (important for SendGrid errors)
      console.error("Send error:", (err && err.response && err.response.body) ? err.response.body : err);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ ok: true, message: "Contact message sent" });
  } catch (err) {
    console.error("Error in /api/contact:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

/* POST /api/inquiries (start-your-project form) */
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInquiryInput(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send inquiry email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

    const to = chooseDestinationEmail();
    if (!to) return res.status(500).json({ error: "Server misconfiguration: destination email missing" });

    const from = chooseFromEmail() || `no-reply@${req.hostname}`;
    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `New Project Inquiry — ${out.fullName}`;
    const safeDescHtml = out.description ? `<p><strong>Project Description:</strong><br/>${validator.escape(out.description).replace(/\n/g, "<br/>")}</p>` : "";
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#222;">
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
    const text = `New Project Inquiry\n\nFull Name: ${out.fullName}\nEmail: ${out.email}\nPhone: ${out.phone}\nProject Type: ${out.projectType}\nBudget: ${out.budget}\n\n${out.description ? "Description:\n" + out.description + "\n\n" : ""}Submitted at: ${submittedAt}`;

    try {
      if (mailProvider === "sendgrid") {
        const resp = await sendViaSendGrid({ to, from, subject, text, html, replyTo: out.email });
        console.log("Inquiry sent via SendGrid:", resp && resp.length ? resp[0].statusCode : "ok");
      } else if (mailProvider === "smtp") {
        const info = await sendViaSMTP({ to, from, subject, text, html, replyTo: out.email });
        console.log("Inquiry sent via SMTP, messageId:", info && info.messageId);
      } else {
        return res.status(503).json({ error: "No mail transport configured" });
      }
    } catch (err) {
      console.error("Send error:", (err && err.response && err.response.body) ? err.response.body : err);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ ok: true, message: "Inquiry sent" });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
  console.log("Mail provider:", mailProvider || "none", "Mail ready:", mailReady);
});
