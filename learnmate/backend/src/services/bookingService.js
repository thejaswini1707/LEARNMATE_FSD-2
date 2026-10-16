const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const { toMs, toPublicProfile } = require("./userService");
const mateUpService = require("./mateUpService");

/** Statuses that occupy a tutor's calendar slot. Declined / Cancelled / Completed never block a slot. */
const ACTIVE_STATUSES = ["Pending", "Confirmed"];

/** Postgres unique violation (23505) as surfaced by Prisma (P2002) - i.e. the double-booking index fired. */
const isUniqueViolation = (err) => err && (err.code === "P2002" || err.code === "23505");

const SLOT_TAKEN_MESSAGE = "This tutor already has a session at that date and time. Please choose a different slot.";

function decorate(row) {
  return {
    id: row.id,
    tutorId: row.tutorId,
    studentId: row.studentId,
    tutor: row.tutor.name,
    tutorEmail: row.tutor.email,
    studentName: row.student.name,
    studentEmail: row.student.email,
    subject: row.subject,
    date: row.date,
    time: row.time,
    mode: row.mode,
    topic: row.topic,
    status: row.status,
    reviewed: Boolean(row.review),
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
    startsAt: new Date(`${row.date}T${row.time || "00:00"}`).getTime(),
  };
}

const WITH_PARTIES = { include: { tutor: true, student: true, review: { select: { id: true } } } };

async function listAllBookings() {
  const rows = await prisma.booking.findMany({ ...WITH_PARTIES, orderBy: { createdAt: "desc" } });
  return rows.map(decorate).sort((a, b) => b.startsAt - a.startsAt);
}

async function listMyBookings(user) {
  const rows = await prisma.booking.findMany({
    ...WITH_PARTIES,
    where: { OR: [{ tutorId: user.id }, { studentId: user.id }] },
    orderBy: { createdAt: "desc" },
  });
  const all = rows.map(decorate);
  return {
    asStudent: all.filter((b) => b.studentEmail === user.email),
    asTutor: all.filter((b) => b.tutorEmail === user.email),
  };
}

async function createBooking(user, data) {
  const tutor = await prisma.user.findFirst({ where: { email: data.tutorEmail.trim().toLowerCase(), role: "Tutor" } });
  if (!tutor) throw new ApiError(404, "Please choose a tutor from the list.");
  if (tutor.email === user.email) throw new ApiError(400, "You can't book a session with yourself.");

  const startsAt = new Date(`${data.date}T${data.time}`).getTime();
  if (Number.isNaN(startsAt)) throw new ApiError(400, "Please choose a valid date and time.");
  if (startsAt < Date.now()) throw new ApiError(400, "Please choose a date and time in the future.");

  // 1) Friendly pre-check, so the common case gets a clear message.
  const taken = await prisma.booking.findFirst({
    where: { tutorId: tutor.id, date: data.date, time: data.time, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });
  if (taken) throw new ApiError(409, SLOT_TAKEN_MESSAGE);

  // 2) The real guarantee: a partial UNIQUE index on (tutorId, date, time) for active statuses.
  //    If two requests race past the pre-check, exactly one INSERT wins and the other lands here.
  try {
    const created = await prisma.booking.create({
      ...WITH_PARTIES,
      data: {
        tutorId: tutor.id,
        studentId: user.id,
        subject: data.subject,
        date: data.date,
        time: data.time,
        mode: data.mode,
        topic: data.topic.trim(),
        status: "Pending",
      },
    });
    return decorate(created);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, SLOT_TAKEN_MESSAGE);
    throw err;
  }
}

const TRANSITIONS = {
  Confirmed: { from: ["Pending"], by: "tutor" },
  Declined: { from: ["Pending"], by: "tutor" },
  Completed: { from: ["Confirmed"], by: "tutor" },
  Cancelled: { from: ["Pending", "Confirmed"], by: "either" },
};

async function updateBookingStatus(id, status, actor) {
  const booking = await prisma.booking.findUnique({ where: { id }, ...WITH_PARTIES });
  if (!booking) throw new ApiError(404, "This session no longer exists.");

  const rule = TRANSITIONS[status];
  const isTutor = booking.tutor.email === actor.email;
  const isStudent = booking.student.email === actor.email;
  const allowed = rule && rule.from.includes(booking.status) && (rule.by === "tutor" ? isTutor : isTutor || isStudent);
  if (!allowed) throw new ApiError(400, "That change isn't available for this session.");

  const updated = await prisma.booking.update({ where: { id }, data: { status }, ...WITH_PARTIES });
  return decorate(updated);
}

async function deleteBooking(id) {
  await prisma.booking.delete({ where: { id } });
}

async function listTutors(me, excludeEmail) {
  const tutors = await prisma.user.findMany({
    where: { role: "Tutor", email: { not: excludeEmail || "" } },
    orderBy: { createdAt: "desc" },
  });

  const [relationships, reviewAggs, completedAggs] = await Promise.all([
    mateUpService.relationshipsFor(me.id),
    prisma.review.groupBy({ by: ["tutorId"], _avg: { rating: true }, _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["tutorId"], where: { status: "Completed" }, _count: { _all: true } }),
  ]);
  const reviewByTutor = Object.fromEntries(reviewAggs.map((r) => [r.tutorId, r]));
  const completedByTutor = Object.fromEntries(completedAggs.map((c) => [c.tutorId, c._count._all]));

  return tutors.map((row) => ({
    ...toPublicProfile(row),
    mateUp: relationships[row.id] || { status: "none", requestId: null },
    rating: reviewByTutor[row.id]?._avg.rating || 0,
    reviewCount: reviewByTutor[row.id]?._count._all || 0,
    sessionsTaught: completedByTutor[row.id] || 0,
  }));
}

module.exports = { listAllBookings, listMyBookings, createBooking, updateBookingStatus, deleteBooking, listTutors, decorate };
