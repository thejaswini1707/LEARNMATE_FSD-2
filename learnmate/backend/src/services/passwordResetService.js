const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const env = require("../config/env");
const { ApiError } = require("../utils/apiResponse");
const { sendMail, isEmailConfigured } = require("../utils/mailer");

/** Only the SHA-256 of a token is stored, so a database leak does not expose usable reset links. */
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function resetLink(rawToken) {
  return `${env.clientUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
}

function deliver(user, link) {
  const minutes = env.resetTokenTtlMinutes;
  if (isEmailConfigured()) {
    // Fire-and-forget on purpose: the HTTP response must not depend on (or reveal) delivery.
    sendMail({
      to: user.email,
      subject: "Reset your LearnMate password",
      text:
        `Hi ${user.name},\n\nWe received a request to reset your LearnMate password.\n` +
        `Open this link to choose a new one (valid for ${minutes} minutes, single use):\n\n${link}\n\n` +
        `If you didn't ask for this, you can ignore this email - your password won't change.`,
      html:
        `<p>Hi ${escapeHtml(user.name)},</p>` +
        `<p>We received a request to reset your LearnMate password. This link is valid for ${minutes} minutes and can be used once:</p>` +
        `<p><a href="${link}">Choose a new password</a></p>` +
        `<p>If you didn't ask for this, you can ignore this email - your password won't change.</p>`,
    });
    return;
  }
  if (env.isProduction) {
    console.warn("[password-reset] SMTP is not configured, so no reset email was sent. Set SMTP_HOST (see backend/.env.example).");
  } else {
    console.log(`\n[password-reset] SMTP not configured - dev reset link for ${user.email}:\n  ${link}\n`);
  }
}

/**
 * Starts a reset. Always resolves the same way whether or not the email is registered, so the
 * endpoint cannot be used to discover accounts. `devLink` is only ever set in development when
 * DEV_RETURN_RESET_LINK=true and no SMTP server is configured.
 */
async function requestReset(emailInput) {
  const email = emailInput.trim().toLowerCase();
  const now = new Date();

  // Housekeeping: expired tokens are useless, drop them.
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { devLink: null };

  // Only the newest link works: invalidate any earlier unused ones.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(now.getTime() + env.resetTokenTtlMinutes * 60 * 1000),
    },
  });

  const link = resetLink(rawToken);
  deliver(user, link);
  return { devLink: env.devReturnResetLink && !isEmailConfigured() ? link : null };
}

/** Consumes a token (atomically, so it can be used once) and sets the new bcrypt-hashed password. */
async function resetPassword(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  const userId = await prisma.$transaction(async (tx) => {
    // updateMany with the validity conditions is the single-use gate: two concurrent requests with
    // the same token cannot both see count === 1.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;

    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: now } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: row.id } } });
    return row.userId;
  });

  if (!userId) throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.");
  return userId;
}

module.exports = { requestReset, resetPassword, hashToken };
