const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validators/schemas");

const router = express.Router();

// Tight limits on the endpoints that can be abused to spam inboxes or guess tokens.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RESET_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
});

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/forgot-password", resetLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", resetLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.get("/me", requireAuth, authController.me);

module.exports = router;
