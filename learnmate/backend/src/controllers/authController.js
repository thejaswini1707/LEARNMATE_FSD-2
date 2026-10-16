const userService = require("../services/userService");
const passwordResetService = require("../services/passwordResetService");
const jwt = require("../utils/jwt");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitApp, disconnectUser } = require("../sockets");

const register = asyncHandler(async (req, res) => {
  const user = await userService.registerUser(req.body);
  emitApp("users:changed", { reason: "created" });
  ok(res, user, "Account created successfully.", 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.verifyLogin(email, password);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, pv: jwt.passwordVersion(user) });
  ok(res, { user: userService.toPublic(user), token }, "Logged in successfully.");
});

const me = asyncHandler(async (req, res) => {
  ok(res, userService.toPublic(req.user), "Current user.");
});

// Same response whether or not the email is registered (no account enumeration).
const forgotPassword = asyncHandler(async (req, res) => {
  const { devLink } = await passwordResetService.requestReset(req.body.email);
  const data = devLink ? { devResetLink: devLink } : null;
  ok(res, data, "If an account exists for that email, we've sent a link to reset the password.");
});

const resetPassword = asyncHandler(async (req, res) => {
  const userId = await passwordResetService.resetPassword(req.body.token, req.body.password);
  disconnectUser(userId); // drop live Socket.IO connections that belong to the old password
  ok(res, null, "Your password has been updated. You can now log in with it.");
});

module.exports = { register, login, me, forgotPassword, resetPassword };
