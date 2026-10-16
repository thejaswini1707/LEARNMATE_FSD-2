require("dotenv").config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 25),
  allowedUploadExtensions: [".pdf", ".doc", ".docx", ".ppt", ".pptx"],

  isProduction: process.env.NODE_ENV === "production",

  // Password reset. Tokens are single-use and expire quickly.
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES || 30),
  // DEV ONLY: return the reset link in the API response when no SMTP server is configured.
  // Ignored (forced off) when NODE_ENV=production.
  devReturnResetLink: process.env.DEV_RETURN_RESET_LINK === "true" && process.env.NODE_ENV !== "production",

  // Outgoing email (optional). Leave SMTP_HOST empty to run without email: reset links are then
  // printed to the server console instead. No credentials ever live in source code.
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "LearnMate <no-reply@learnmate.local>",
  },
};
