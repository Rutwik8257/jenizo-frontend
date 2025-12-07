// server.js
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

const app = express();

// trust proxy for correct client ip detection (useful on Render)
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

/* ---------- Middleware ---------- */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// Simple request logger (helpful for debugging)
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.url} Origin:${req.headers.origin || "-"}`
  );
  next();
});

/* ---------- CORS ---------- */
// ALLOWED_ORIGIN may be "*" or comma-separated list of origins
const rawAllowed = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowAny = rawAllowed.includes("*");
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow non-browser requests
      if (allowAny) return callback(null, true);
      if (rawAllowed.indexOf(origin) !== -1) return callback(null, true);
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

/* ---------- Transporter creation (SendGrid primary) ---------- */
function createTransporterFromEnv() {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();

  // Common timeout options (optional)
  const timeouts = {
    connectionTimeout: process.env.SMTP_CONN_TIMEOUT ? Number(process.env.SMTP_CONN_TIMEOUT) : 15000,
    greetingTimeout: process.env.SMTP_GREET_TIMEOUT ? Number(process.env.SMTP_GREET_TIMEOUT) : 10000,
    socketTimeout: process.env.SMTP_SOCKET_TIMEOUT ? Number(process.env.SMTP_SOCKET_TIMEOUT) : 30000,
  };

  if (provider === "sendgrid") {
    // Use nodemailer SMTP auth with SendGrid API key
    // Note: nodemailer also supports direct HTTP transports, but SMTP with user "apikey" is simple
    if (!process.env.SENDGRID_API_KEY) return null;
    return nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        user: "apikey", // literal string required by SendGrid SMTP
        pass: process.env.SENDGRID_API_KEY,
      },
      ...timeouts,
    });
  }

  // Generic SMTP fallback (for other providers)
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
      ...timeouts,
    });
  }

  // Nothing configured
  return null;
}

let transporter = createTransporterFromEnv();
let mailReady = false;

/* Verify transporter (and fallback to Ethereal in dev if none configured) */
async function verifyTransporter() {
  if (!transporter) {
    console.warn("No SMTP transporter configured via env.");
    mailReady = false;

    // dev fallback: Ethereal test account
    if ((process.env.NODE_ENV || "development") !== "production") {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        await transporter.verify();
        mailReady = true;
        console.log("Using Ethereal test SMTP (dev). Preview URLs via nodemailer.getTestMessageUrl(info).");
      } catch (e) {
        mailReady = false;
        console.warn("Ethereal fallback failed:", e && e.message ? e.message : e);
      }
    }
    return;
  }

  try {
    await transporter.verify();
    mailReady = true;
    console.log("Mail transporter verified and ready.");
  } catch (err) {
    mailReady = false;
    console.warn("Mail transporter verification failed. Check env settings:", err && err.message ? err.message : err);
  }
}
verifyTransporter();

/* ---------- Utility: sanitize/validate inquiry input ---------- */
function validateInput(data = {}) {
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
app.get("/", (req, res) => {
  res.send("Jenizo backend running. Use /api endpoints.");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", mailReady });
});

/* POST /api/inquiries */
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInput(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send inquiry email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
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
      from: process.env.SMTP_FROM || process.env.COMPANY_EMAIL || process.env.EMAIL_USER,
      to: process.env.TO_EMAIL || process.env.COMPANY_EMAIL,
      subject,
      text,
      html,
      replyTo: out.email,
    };

    const info = await transporter.sendMail(mailOptions);

    // log Ethereal preview URL in dev
    if (nodemailer.getTestMessageUrl) {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log("Preview URL:", preview);
    }

    return res.status(200).json({ ok: true, message: "Inquiry sent", messageId: info.messageId });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* POST /api/contact */
app.post("/api/contact", async (req, res) => {
  try {
    if (!mailReady) {
      console.error("Mail transporter not ready - cannot send contact email.");
      return res.status(503).json({ error: "Email service unavailable. Please try again later." });
    }

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
      from: process.env.SMTP_FROM || process.env.COMPANY_EMAIL || process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL || process.env.TO_EMAIL,
      subject: `Contact Form — ${out.name}`,
      text,
      html,
      replyTo: out.email,
    };

    const info = await transporter.sendMail(mailOptions);
    if (nodemailer.getTestMessageUrl) {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log("Preview URL:", preview);
    }

    console.log("Contact mail sent, messageId:", info.messageId);
    return res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("Error in /api/contact handler:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
});
