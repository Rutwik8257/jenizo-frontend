// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const sgMail = require("@sendgrid/mail");

const app = express();

// trust proxy (needed on Render so IP detection & rate limiting work correctly)
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const PORT = process.env.PORT || 8080;

// ─────────────────────────────────────────────
//  SENDGRID CONFIG
// ─────────────────────────────────────────────

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("SendGrid API client configured.");
} else {
  console.error("SENDGRID_API_KEY is missing! Email sending will not work.");
}

// Defaults using your emails (can be overridden by env)
const FROM_EMAIL = process.env.FROM_EMAIL || "rutwik710@gmail.com";
const TO_EMAIL = process.env.TO_EMAIL || FROM_EMAIL;
const REPLY_TO_DEFAULT = process.env.REPLY_TO || "rutwikbanda2022@gmail.com";

// Helper to send email via SendGrid
async function sendMail({ subject, text, html, replyTo }) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SendGrid API key not configured");
  }

  const msg = {
    to: TO_EMAIL,
    from: {
      email: FROM_EMAIL,
      name: "Jenizo Website",
    },
    subject,
    text,
    html,
    replyTo: replyTo || REPLY_TO_DEFAULT,
  };

  const [resp] = await sgMail.send(msg);
  return resp;
}

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

// CORS: support multiple origins via ALLOWED_ORIGIN env (comma-separated)
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = server-to-server / curl / Postman -> allow
      if (!origin) return callback(null, true);

      if (!allowedOrigins.length) {
        // If no ALLOWED_ORIGIN set, allow all (you can tighten later)
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// Rate limiter for all /api/ routes
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Small logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path} Origin:${req.headers.origin || "-"
    }`
  );
  next();
});

// ─────────────────────────────────────────────
//  BASIC ROUTES
// ─────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Jenizo backend running. Use /api endpoints.");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    provider: "sendgrid",
    hasKey: !!process.env.SENDGRID_API_KEY,
    from: FROM_EMAIL,
    to: TO_EMAIL,
  });
});

// ─────────────────────────────────────────────
//  VALIDATION HELPERS
// ─────────────────────────────────────────────

function validateInquiry(data = {}) {
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

function validateContact(data = {}) {
  const errors = {};
  const out = {};

  out.name = (data.name || "").trim();
  out.email = (data.email || "").trim();
  out.phone = (data.phone || "").trim();
  out.message = (data.message || "").trim();

  if (!out.name || out.name.length < 2) errors.name = "Name is required.";
  if (!out.email || !validator.isEmail(out.email)) errors.email = "Valid email is required.";
  if (!out.phone || out.phone.length < 7) errors.phone = "Valid phone number is required.";
  if (!out.message || out.message.length < 5) errors.message = "Message is too short.";

  return { valid: Object.keys(errors).length === 0, errors, out };
}

// ─────────────────────────────────────────────
//  /api/inquiries  (Start Your Project form)
// ─────────────────────────────────────────────

app.post("/api/inquiries", async (req, res) => {
  try {
    const { valid, errors, out } = validateInquiry(req.body || {});
    if (!valid) return res.status(400).json({ ok: false, errors });

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `New Project Inquiry — ${out.fullName}`;

    const safeDescHtml = out.description
      ? `<p><strong>Project Description:</strong><br/>${validator
        .escape(out.description)
        .replace(/\n/g, "<br/>")}</p>`
      : "";
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

${safeDescText}Submitted at: ${submittedAt} (Asia/Kolkata)
`.trim();

    await sendMail({
      subject,
      text,
      html,
      replyTo: out.email, // reply will go to the client who submitted
    });

    return res.status(200).json({ ok: true, message: "Inquiry sent" });
  } catch (err) {
    console.error("Error in /api/inquiries:", err && err.response && err.response.body
      ? err.response.body
      : err.stack || err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
//  /api/contact  (Contact page form)
// ─────────────────────────────────────────────

app.post("/api/contact", async (req, res) => {
  try {
    const { valid, errors, out } = validateContact(req.body || {});
    if (!valid) return res.status(400).json({ errors });

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const html = `
      <div style="font-family: Arial,Helvetica,sans-serif;color:#222;">
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${validator.escape(out.name)}</p>
        <p><strong>Email:</strong> ${validator.escape(out.email)}</p>
        <p><strong>Phone:</strong> ${validator.escape(out.phone)}</p>
        <p><strong>Message:</strong><br/>${validator
          .escape(out.message)
          .replace(/\n/g, "<br/>")}</p>
        <p style="color:#666;font-size:12px;">Submitted at: ${submittedAt} (Asia/Kolkata)</p>
      </div>
    `;

    const text = `
New Contact Message

Name: ${out.name}
Email: ${out.email}
Phone: ${out.phone}

Message:
${out.message}

Submitted at: ${submittedAt}
`.trim();

    await sendMail({
      subject: `Contact Form — ${out.name}`,
      text,
      html,
      replyTo: out.email, // reply goes to person who filled form
    });

    console.log("Contact mail sent successfully.");
    return res.status(200).json({ ok: true, message: "Message sent" });
  } catch (err) {
    console.error("Error in /api/contact handler:", err && err.response && err.response.body
      ? err.response.body
      : err.stack || err);
    return res.status(500).json({ error: "Internal Server Error — check server logs" });
  }
});

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Inquiry server listening on port ${PORT}`);
});
