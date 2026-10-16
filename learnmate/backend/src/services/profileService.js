const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const { toMs, toPublicProfile } = require("./userService");
const mateUpService = require("./mateUpService");

/**
 * Public profile of one user as seen by `viewer`. Contains only information meant to be shown to
 * other members: no mobile number, no password data, no tokens.
 */
async function getPublicProfile(viewer, userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isSelf = Boolean(user) && user.id === viewer.id;
  // Admin accounts have no public profile (except to admins and to the admin themselves).
  if (!user || (user.role === "Admin" && !isSelf && viewer.role !== "Admin")) {
    throw new ApiError(404, "This profile could not be found.");
  }

  const profile = { ...toPublicProfile(user), isSelf };

  const [mateUp, mateCount] = await Promise.all([
    mateUpService.getRelationship(viewer.id, user.id),
    mateUpService.countMates(user.id),
  ]);
  profile.mateUp = mateUp;
  profile.mateCount = mateCount;

  if (user.role === "Tutor") {
    const [agg, sessionsTaught, reviews] = await Promise.all([
      prisma.review.aggregate({ where: { tutorId: user.id }, _avg: { rating: true }, _count: { _all: true } }),
      prisma.booking.count({ where: { tutorId: user.id, status: "Completed" } }),
      prisma.review.findMany({
        where: { tutorId: user.id },
        include: { student: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    profile.rating = agg._avg.rating || 0;
    profile.reviewCount = agg._count._all;
    profile.sessionsTaught = sessionsTaught;
    profile.reviews = reviews.map((r) => ({
      id: r.id,
      studentId: r.student.id,
      studentName: r.student.name,
      studentAvatar: r.student.avatar || "",
      subject: r.subject,
      rating: r.rating,
      comment: r.comment,
      createdAt: toMs(r.createdAt),
    }));
  }
  return profile;
}

module.exports = { getPublicProfile };
