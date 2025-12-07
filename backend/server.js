// server.js
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

const app = express();

// trust proxy (useful on Render and other platforms behind proxies)
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

/* ---------- SendGrid HTTP client (optional) ---------- */
let sgMail = null;
const USING_SENDGRID_API = (process.env.EMAIL_PROVIDER || "").toLowerCase() === "sendgrid";
if (USING_SENDGRID_API) {
  try {
    sgMail = require("@sendgrid/mail");
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log("SendGrid API client configured.");
    } else {
      console.warn("EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY missing.");
      sgMail = null;
    }
  } catch (e) {
    console.warn("Failed to require @sendgrid/mail. Did you install it?", e && e.message);
    sgMail = null;
  }
}

/* ---------- Middleware ---------- */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// Simple request logger (helpful while debugging)
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.url} Origin:${req.headers.origin || "-"}`
  );
  next();
});

/* ---------- CORS setup ---------- */
// ALLOWED_ORIGIN may be comma-separated list, or "*" to allow all
const rawAllowed = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowAny = rawAllowed.includes("*");

function isVercelPreview(origin) {
  try {
    if (!origin) return false;
    const u = new URL(origin);
    return /\.vercel\.app$/.test(u.hostname);
  } catch (e) {
    return false;
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser (curl, server-to-server) with no origin
      if (!origin) return callback(null, true);
      if (allowAny) return callback(null, true);
      if (rawAllowed.indexOf(origin) !== -1) return callback(null, true);
      // allow vercel preview domains automatically
      if (isVercelPreview(origin)) return callback(null, true);
      console.warn("CORS: origin not allowed:", origin);
      return callback(new Error("CORS: origin not allowed"), false);
    },
    optionsSuccessStatus: 200,
  })
);

/* ---------- Rate limiter ---------- */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 12,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

/* ---------- SMTP transporter creation (fallback) ---------- */
function createSmtpTransporterFromEnv() {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();

  // Optionally allow SendGrid SMTP (using API key)
  if ((provider === "sendgrid" || provider === "sendgrid-smtp") && process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    });
  }

  // Generic SMTP from env
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    });
  }

  return null;
}

let smtpTransporter = createSmtpTransporterFromEnv();
let mailReady = false;

/* ---------- Initialize mail sending capability ---------- */
async function initMail() {
  // Prefer SendGrid HTTP API if configured
  if (USING_SENDGRID_API && sgMail && process.env.SENDGRID_API_KEY) {
    mailReady = true;
    console.log("Using SendGrid HTTP API for email sending.");
    return;
  }

  // Try SMTP transporter verify
  if (smtpTransporter) {
    try {
      await smtpTransporter.verify();
      mailReady = true;
      console.log("SMTP transporter verified and ready.");
      return;
    } catch (err) {
      mailReady = false;
      console.warn("SMTP transporter verification failed.", err && err.message ? err.message : err);
    }
  }

  // Development fallback: Ethereal (only in non-production)
  if ((process.env.NODE_ENV || "development") !== "production") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      smtpTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      await smtpTransporter.verify();
      mailReady = true;
      console.log("Using Ethereal test SMTP (dev).");
      return;
    } catch (e) {
      mailReady = false;
      console.warn("Ethereal fallback failed:", e && e.message ? e.message : e);
    }
  }

  mailReady = false;
  console.warn("No mail transport ready. Set SENDGRID_API_KEY or SMTP envs.");
}
initMail();

/* ---------- sendMail abstraction ---------- */
async function sendMail({ from, to, subject, text, html, replyTo }) {
  // Use SendGrid HTTP API if configured
  if (USING_SENDGRID_API && sgMail && process.env.SENDGRID_API_KEY) {
    const msg = {
      to,
      from,
      subject,
      text: text || "",
      html: html || undefined,
      replyTo: replyTo || undefined,
    };
    return sgMail.send(msg);
  }

  // Else use SMTP transporter
  if (smtpTransporter) {
    return smtpTransporter.sendMail({ from, to, subject, text, html, replyTo });
  }

  throw new Error("No email sending mechanism configured");
}

/* ---------- Helpers: validate inputs ---------- */
function validateInquiryInput(data = {}) {
  const errors = {};
  const out = {};

  out.fullName = (data.fullName || "").trim();
  out.email = (data.email || "").trim();
  out.phone = (data.phone || "").trim();
  out.projectType = (data.projectType || "").trim();
  out.budget = (data.budget || "").trim();
  out.description = (data.description || "").trim();

  if (!out.fullName) errors.fullName = "Full name is required.";
  if (!out.email) errors.email = "Email is required.";
  else if (!validator.isEmail(out.email)) errors.email = "Invalid email.";
  if (!out.phone) errors.phone = "Phone number is required.";
  else if (!/^[+0-9\s\-()]{7,30}$/.test(out.phone)) errors.phone = "Invalid phone number.";
  if (!out.projectType) errors.projectType = "Project type is required.";
  if (!out.budget) errors.budget = "Budget is required.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

/* ---------- Routes ---------- */
app.get("/", (req, res) => res.send("Jenizo backend running. Use /api endpoints."));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", mailReady, provider: process.env.EMAIL_PROVIDER || null });
});

/* POST /api/inquiries */
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInquiryInput(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    if (!mailReady) {
      console.warn("Mail not ready; logging inquiry payload.");
      console.log("INQUIRY PAYLOAD:", req.body);
      return res.status(202).json({ ok: true, note: "Received (email temporarily disabled)" });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `New Project Inquiry — ${out.fullName}`;

    const safeDescHtml = out.description ? `<p><strong>Project Description:</strong><br/>${validator.escape(out.description).replace(/\n/g, "<br/>")}</p>` : "";
    const safeDescText = out.description ? `Project Description:\n${out.description}\n\n` : "";

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

${safeDescText}
Submitted at: ${submittedAt}
`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.COMPANY_EMAIL || process.env.EMAIL_USER || "no-reply@jenizo.in",
      to: process.env.TO_EMAIL || process.env.COMPANY_EMAIL,
      subject,
      text,
      html,
      replyTo: out.email,
    };

    const info = await sendMail(mailOptions);

    // If Ethereal, log preview URL
    if (nodemailer.getTestMessageUrl) {
      try {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log("Preview URL:", preview);
      } catch (e) {}
    }

    return res.status(200).json({ ok: true, message: "Inquiry sent", messageId: info && info.messageId ? info.messageId : undefined });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* POST /api/contact */
app.post("/api/contact", async (req, res) => {
  try {
    if (!process.env.COMPANY_EMAIL && !process.env.TO_EMAIL) {
      console.error("COMPANY_EMAIL/TO_EMAIL not set");
      return res.status(500).json({ error: "Server misconfiguration: missing destination email" });
    }

    const { name = "", email = "", phone = "", message = "" } = req.body || {};

    const errors = {};
    if (!name || name.trim().length < 2) errors.name = "Name is required.";
    if (!email || !validator.isEmail(String(email).trim())) errors.email = "Valid email is required.";
    if (!phone || String(phone).trim().length < 7) errors.phone = "Valid phone number is required.";
    if (!message || String(message).trim().length < 5) errors.message = "Message is too short.";

    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const out = {
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      message: String(message).trim(),
    };

    if (!mailReady) {
      console.warn("Mail not ready; logging contact payload.");
      console.log("CONTACT PAYLOAD:", req.body);
      return res.status(202).json({ ok: true, note: "Received (email temporarily disabled)" });
    }

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

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.COMPANY_EMAIL || process.env.EMAIL_USER || "no-reply@jenizo.in",
      to: process.env.COMPANY_EMAIL || process.env.TO_EMAIL,
      subject: `Contact Form — ${out.name}`,
      text,
      html,
      replyTo: out.email,
    };

    const info = await sendMail(mailOptions);

    if (nodemailer.getTestMessageUrl) {
      try {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log("Preview URL:", preview);
      } catch (e) {}
    }

    console.log("Contact mail sent, messageId:", info && info.messageId ? info.messageId : undefined);
    return res.status(200).json({ ok: true, messageId: info && info.messageId ? info.messageId : undefined });
  } catch (err) {
    console.error("Error in /api/contact handler:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
});
