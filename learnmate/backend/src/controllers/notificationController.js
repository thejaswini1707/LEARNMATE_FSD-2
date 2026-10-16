const notificationService = require("../services/notificationService");
const userService = require("../services/userService");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitToUser } = require("../sockets");

const get = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user);
  ok(res, notifications, "Notifications fetched.");
});

const markSeen = asyncHandler(async (req, res) => {
  await userService.markNotifSeen(req.user.id);
  emitToUser(req.user.id, "notifications:seen", { email: req.user.email });
  ok(res, null, "Notifications marked as read.");
});

module.exports = { get, markSeen };
