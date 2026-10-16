const reviewService = require("../services/reviewService");
const { ok, fail } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitApp, emitToUser } = require("../sockets");

const list = asyncHandler(async (req, res) => {
  const reviews = await reviewService.listReviews();
  ok(res, reviews, "Reviews fetched.");
});

const eligibleSessions = asyncHandler(async (req, res) => {
  const sessions = await reviewService.listReviewableSessions(req.user);
  ok(res, sessions, "Completed sessions fetched.");
});

const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user, req.body);
  emitApp("reviews:changed", { reason: "created" });
  emitToUser(review.tutorId, "notifications:new", {
    kind: "review",
    text: `${review.studentName} rated you ${review.rating}/5 for ${review.subject}`,
    to: "/reviews",
  });
  ok(res, review, "Review submitted. Thank you!", 201);
});

const remove = asyncHandler(async (req, res) => {
  const review = await reviewService.findById(req.params.id);
  if (!review) return fail(404, "This review no longer exists.");
  const canDelete = req.user.role === "Admin" || review.studentEmail === req.user.email;
  if (!canDelete) return fail(403, "You can only delete your own review.");
  await reviewService.deleteReview(req.params.id);
  emitApp("reviews:changed", { reason: "deleted" });
  ok(res, null, "Review deleted.");
});

module.exports = { list, eligibleSessions, create, remove };
