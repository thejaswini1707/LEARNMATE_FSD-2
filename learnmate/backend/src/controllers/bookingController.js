const bookingService = require("../services/bookingService");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitApp, emitToUser } = require("../sockets");

const listTutors = asyncHandler(async (req, res) => {
  const tutors = await bookingService.listTutors(req.user, req.query.exclude || req.user.email);
  ok(res, tutors, "Tutors fetched.");
});

const listAll = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listAllBookings();
  ok(res, bookings, "Bookings fetched.");
});

const listMine = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listMyBookings(req.user);
  ok(res, bookings, "Your sessions fetched.");
});

const create = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user, req.body);
  emitApp("bookings:changed", { reason: "created" });
  emitToUser(booking.tutorId, "notifications:new", {
    kind: "booking",
    text: `${booking.studentName} requested a ${booking.subject} session`,
    to: "/booking?tab=requests",
  });
  ok(res, booking, "Session request sent.", 201);
});

const updateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, req.user);
  emitApp("bookings:changed", { reason: "status-updated" });
  // Tell the other party (the one who did not make this change) their feed has something new.
  const otherId = req.user.id === booking.tutorId ? booking.studentId : booking.tutorId;
  emitToUser(otherId, "notifications:changed", {});
  ok(res, booking, "Session updated.");
});

const remove = asyncHandler(async (req, res) => {
  await bookingService.deleteBooking(req.params.id);
  emitApp("bookings:changed", { reason: "deleted" });
  ok(res, null, "Session deleted.");
});

module.exports = { listTutors, listAll, listMine, create, updateStatus, remove };
