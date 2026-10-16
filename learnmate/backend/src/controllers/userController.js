const userService = require("../services/userService");
const profileService = require("../services/profileService");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitApp } = require("../sockets");

const updateMe = asyncHandler(async (req, res) => {
  const updated = await userService.updateProfile(req.user.email, req.body);
  emitApp("users:changed", { reason: "profile-updated" });
  ok(res, updated, "Profile updated successfully.");
});

const list = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  ok(res, users, "Users fetched.");
});

const adminUpdate = asyncHandler(async (req, res) => {
  const updated = await userService.adminUpdateUser(req.params.id, req.body);
  emitApp("users:changed", { reason: "admin-updated" });
  ok(res, updated, "User updated successfully.");
});

const adminDelete = asyncHandler(async (req, res) => {
  await userService.adminDeleteUser(req.params.id, req.user);
  emitApp("users:changed", { reason: "admin-deleted" });
  ok(res, null, "User deleted successfully.");
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getPublicProfile(req.user, req.params.id);
  ok(res, profile, "Profile fetched.");
});

module.exports = { updateMe, list, adminUpdate, adminDelete, getProfile };
