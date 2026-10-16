const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** True when real email delivery is configured. */
const isEmailConfigured = () => Boolean(env.smtp.host);

/**
 * Sends one email. Never throws: callers use it fire-and-forget so response timing does not reveal
 * whether an address is registered. Returns true when the message was handed to the SMTP server.
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error(`[mailer] Could not send email to ${to}: ${err.message}`);
    return false;
  }
}

module.exports = { sendMail, isEmailConfigured };
