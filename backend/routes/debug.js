const express = require('express');
const router = express.Router();

router.get('/send-test-email', async (req, res) => {
  const to = (process.env.COMPANY_EMAIL || process.env.TO_EMAIL || '').trim();
  if (!to) return res.status(500).json({ ok:false, message: 'COMPANY_EMAIL/TO_EMAIL not set' });

  const from = (process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`).trim();
  const subject = 'Test email from Jenizo backend';
  const text = 'This is a test email to verify mail sending.';
  const html = `<p>This is a test email to verify mail sending. Time: ${new Date().toISOString()}</p>`;

  // prefer sendgrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sg = require('@sendgrid/mail');
      sg.setApiKey(process.env.SENDGRID_API_KEY.trim());
      const msg = { to, from, subject, text, html };
      const resp = await sg.send(msg);
      console.log('SendGrid test resp:', resp);
      return res.json({ ok:true, provider:'sendgrid', resp });
    } catch (err) {
      console.error('SendGrid test send error:', err);
      if (err && err.response && err.response.body) console.error('SendGrid error body:', err.response.body);
      return res.status(500).json({ ok:false, provider:'sendgrid', error: 'send failed - check server logs' });
    }
  }

  // fallback SMTP
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
        secure: (process.env.EMAIL_SECURE === 'true') || false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const info = await transporter.sendMail({ from, to, subject, text, html });
      console.log('SMTP test info:', info);
      return res.json({ ok:true, provider:'smtp', info });
    } catch (err) {
      console.error('SMTP test error:', err);
      return res.status(500).json({ ok:false, provider:'smtp', error:'send failed - check server logs' });
    }
  }

  return res.status(503).json({ ok:false, message:'No mail provider configured' });
});

module.exports = router;
