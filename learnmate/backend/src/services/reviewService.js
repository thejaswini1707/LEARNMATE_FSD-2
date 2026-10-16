const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const { toMs } = require("./userService");

const WITH_PARTIES = { include: { tutor: true, student: true } };

const isUniqueViolation = (err) => err && (err.code === "P2002" || err.code === "23505");

function decorate(row) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    tutorId: row.tutorId,
    tutorEmail: row.tutor.email,
    tutorName: row.tutor.name,
    studentId: row.studentId,
    studentEmail: row.student.email,
    studentName: row.student.name,
    studentAvatar: row.student.avatar || "",
    subject: row.subject,
    rating: row.rating,
    comment: row.comment,
    createdAt: toMs(row.createdAt),
  };
}

async function listReviews() {
  const rows = await prisma.review.findMany({ ...WITH_PARTIES, orderBy: { createdAt: "desc" } });
  return rows.map(decorate);
}

/**
 * Completed sessions the signed-in user attended as the student, each flagged with whether it has
 * already been reviewed. This is what the Reviews page offers; createReview() re-checks everything.
 */
async function listReviewableSessions(user) {
  const rows = await prisma.booking.findMany({
    where: { studentId: user.id, status: "Completed" },
    include: { tutor: true, review: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((b) => ({
    bookingId: b.id,
    tutorId: b.tutorId,
    tutorName: b.tutor.name,
    tutorEmail: b.tutor.email,
    subject: b.subject,
    date: b.date,
    time: b.time,
    reviewed: Boolean(b.review),
  }));
}

/**
 * A review must be about one specific COMPLETED session that belongs to the reviewer, and each
 * session can be reviewed once (also enforced by the UNIQUE index on Review.bookingId).
 * The tutor, subject and student are all derived from the booking - never trusted from the client.
 */
async function createReview(user, { bookingId, rating, comment }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tutor: true, student: true, review: { select: { id: true } } },
  });
  if (!booking) throw new ApiError(404, "That session could not be found.");
  if (booking.tutorId === user.id) throw new ApiError(400, "You can't review yourself.");
  if (booking.studentId !== user.id) throw new ApiError(403, "You can only review sessions you attended as the student.");
  if (booking.status !== "Completed") {
    throw new ApiError(400, "You can review a tutor only after the session has been marked as completed.");
  }
  if (booking.review) throw new ApiError(409, "You've already reviewed this session.");

  try {
    const created = await prisma.review.create({
      ...WITH_PARTIES,
      data: {
        bookingId: booking.id,
        tutorId: booking.tutorId,
        studentId: user.id,
        subject: booking.subject,
        rating: Number(rating),
        comment: comment.trim(),
      },
    });
    return decorate(created);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "You've already reviewed this session.");
    throw err;
  }
}

async function findById(id) {
  const row = await prisma.review.findUnique({ where: { id }, ...WITH_PARTIES });
  return row ? decorate(row) : null;
}

async function deleteReview(id) {
  await prisma.review.delete({ where: { id } });
}

module.exports = { listReviews, listReviewableSessions, createReview, deleteReview, findById };
