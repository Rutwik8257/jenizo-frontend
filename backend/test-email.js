// test-email.js
require("dotenv").config();
const nodemailer = require("nodemailer");

async function run() {
  const svc = (process.env.EMAIL_SERVICE || "").toLowerCase();

  const transporter = svc === "gmail"
    ? nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
    : nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === "true",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

  try {
    await transporter.verify();
    console.log("Transporter verified — ready to send.");

    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject: "Test email from Jenizo inquiry system",
      text: "This is a test email to verify SMTP settings.",
    });

    console.log("Test email sent:", info.messageId);
  } catch (err) {
    console.error("Test send failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
