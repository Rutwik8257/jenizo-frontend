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

const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

/* ------- Transporter helpers (robust) ------- */
function createTransporterFromEnv() {
  const svc = (process.env.EMAIL_SERVICE || "").toLowerCase();
  const timeouts = {
    connectionTimeout: process.env.SMTP_CONN_TIMEOUT ? Number(process.env.SMTP_CONN_TIMEOUT) : 15_000,
    greetingTimeout: process.env.SMTP_GREET_TIMEOUT ? Number(process.env.SMTP_GREET_TIMEOUT) : 10_000,
    socketTimeout: process.env.SMTP_SOCKET_TIMEOUT ? Number(process.env.SMTP_SOCKET_TIMEOUT) : 30_000,
  };

  if (svc === "gmail") {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      ...timeouts,
    });
  }

  // Generic SMTP
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

  return null;
}

let transporter = createTransporterFromEnv();
let mailReady = false; // set true when transporter verified

async function verifyTransporter() {
  if (!transporter) {
    console.warn("No SMTP transporter configured (missing envs).");
    mailReady = false;
    // try dev Ethereal fallback if not production
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
        console.log("Using Ethereal test SMTP (dev). Messages available via nodemailer.getTestMessageUrl(info).");
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
    console.warn("Mail transporter verification failed. Check env settings.", err && err.message ? err.message : err);
  }
}

verifyTransporter();

/* --------- Basic routes & helpers --------- */

// root friendly message
app.get("/", (req, res) => {
  res.send("Jenizo backend running. Use /api endpoints.");
});

// health-check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", mailReady });
});

// sanitize/validate inquiry input
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

// inquiries endpoint
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
Submitted at: ${submittedAt} (Asia/Kolkata)
`;

    const mailOptions = {
      from: `"Website Inquiry" <${process.env.EMAIL_USER || process.env.SMTP_FROM || process.env.COMPANY_EMAIL}>`,
      to: process.env.TO_EMAIL,
      subject,
      text,
      html,
      replyTo: out.email,
    };

    const info = await transporter.sendMail(mailOptions);

    // If Ethereal used, log preview URL
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

// contact endpoint
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

/* Start server */
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
});
