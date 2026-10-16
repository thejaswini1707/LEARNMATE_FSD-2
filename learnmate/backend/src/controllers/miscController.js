const activityService = require("../services/activityService");
const statsService = require("../services/statsService");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const activity = asyncHandler(async (req, res) => {
  const mine = req.query.mine === "true";
  const events = await activityService.buildActivity(mine ? req.user.email : null);
  ok(res, events, "Activity fetched.");
});

const publicStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getPublicStats();
  ok(res, stats, "Public stats fetched.");
});

module.exports = { activity, publicStats };
