// server.js
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// CORS - only allow your frontend origin
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));

// Rate limiter for API endpoints
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 12, // adjust as needed
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Create transporter based on env config (Gmail app password or generic SMTP)
function createTransporter() {
  const svc = (process.env.EMAIL_SERVICE || "").toLowerCase();
  if (svc === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Generic SMTP fallback
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === "true", // true for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = createTransporter();

// Optional verify transporter at startup
transporter.verify().then(() => {
  console.log("Mail transporter is ready");
}).catch((err) => {
  console.warn("Mail transporter verification failed. Check env settings.", err && err.message ? err.message : err);
});

// Health-check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

// Helper: validate incoming data
// helper: sanitise + validate incoming data (updated to include description)
function validateInput(data = {}) {
  const errors = {};
  const out = {};

  out.fullName = (data.fullName || "").trim();
  out.email = (data.email || "").trim();
  out.phone = (data.phone || "").trim();
  out.projectType = (data.projectType || "").trim();
  out.budget = (data.budget || "").trim();
  out.description = (data.description || "").trim(); // NEW (optional)

  if (!out.fullName) errors.fullName = "Full name is required.";
  if (!out.email) errors.email = "Email is required.";
  else if (!validator.isEmail(out.email)) errors.email = "Invalid email.";
  if (!out.phone) errors.phone = "Phone number is required.";
  else if (!/^[+0-9\s\-()]{7,30}$/.test(out.phone)) errors.phone = "Invalid phone number.";
  if (!out.projectType) errors.projectType = "Project type is required.";
  if (!out.budget) errors.budget = "Budget is required.";

  // description is optional — you may add min/max length checks if desired
  // e.g. if (out.description.length > 1000) errors.description = "Description too long.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

// POST /api/inquiries
app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInput(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

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

    // mail options
    const mailOptions = {
      from: `"Website Inquiry" <${process.env.EMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject,
      text,
      html,
      replyTo: out.email, // reply goes to submitter
      // bcc: out.email // uncomment to send a copy to the submitter
    };

    const info = await transporter.sendMail(mailOptions);

    // Return basic success info (do not leak internals in prod)
    return res.status(200).json({ ok: true, message: "Inquiry sent", messageId: info.messageId });
  } catch (err) {
    console.error("Error in /api/inquiries:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});
// POST /api/contact
app.post("/api/contact", async (req, res) => {
  try {
    // Basic sanity: ensure transporter exists
    if (!transporter) {
      console.error("SMTP transporter is not initialized.");
      return res.status(500).json({ error: "Mail transporter not ready. Check server logs." });
    }

    // Check required env
    if (!process.env.COMPANY_EMAIL) {
      console.error("COMPANY_EMAIL not set in .env");
      return res.status(500).json({ error: "Server misconfiguration: missing COMPANY_EMAIL" });
    }

    const { name = "", email = "", phone = "", message = "" } = req.body || {};

    // Validate
    const errors = {};
    if (!name || name.trim().length < 2) errors.name = "Name is required.";
    if (!email || !validator.isEmail(String(email).trim())) errors.email = "Valid email is required.";
    if (!phone || String(phone).trim().length < 7) errors.phone = "Valid phone number is required.";
    if (!message || String(message).trim().length < 5) errors.message = "Message is too short.";

    if (Object.keys(errors).length) {
      return res.status(400).json({ errors });
    }

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
      from: process.env.SMTP_FROM || process.env.COMPANY_EMAIL,
      to: process.env.COMPANY_EMAIL,
      subject: `Contact Form — ${out.name}`,
      text,
      html,
      replyTo: out.email,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Contact mail sent, messageId:", info.messageId);
    return res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (err) {
    // Very important: show full stack in server logs for debugging
    console.error("Error in /api/contact handler:", err && err.stack ? err.stack : err);
    // Return minimal safe message to client but log details in server
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
});
