const userService = require("./userService");
const bookingService = require("./bookingService");
const materialService = require("./materialService");
const reviewService = require("./reviewService");

/**
 * @param {string|null} meEmail - when set, scopes the feed to events involving this user
 *   (matches original buildActivity() semantics exactly).
 */
async function buildActivity(meEmail = null) {
  const [users, bookings, materials, reviews] = await Promise.all([
    userService.listUsers(),
    bookingService.listAllBookings(),
    materialService.listMaterials(),
    reviewService.listReviews(),
  ]);

  const who = (name, email) => (meEmail && email === meEmail ? "You" : name);
  const events = [];

  users.forEach((u) => {
    if (u.createdAt && (!meEmail || u.email === meEmail)) {
      events.push({ id: `u-${u.id}`, ts: u.createdAt, kind: "user", people: [{ id: u.id, name: u.name }], text: `${who(u.name, u.email)} joined LearnMate as a ${u.role.toLowerCase()}` });
    }
  });

  bookings.forEach((b) => {
    if (meEmail && b.studentEmail !== meEmail && b.tutorEmail !== meEmail) return;
    const target = meEmail && b.tutorEmail === meEmail ? "you" : b.tutor;
    events.push({ id: `b-${b.id}`, ts: b.createdAt, kind: "booking", people: [{ id: b.studentId, name: b.studentName }, { id: b.tutorId, name: b.tutor }], text: `${who(b.studentName || "A student", b.studentEmail)} requested a ${b.subject} session with ${target}` });
  });

  materials.forEach((m) => {
    if (meEmail && m.uploaderEmail !== meEmail) return;
    events.push({ id: `m-${m.id}`, ts: m.createdAt, kind: "material", people: [{ id: m.uploaderId, name: m.uploadedBy }], text: `${who(m.uploadedBy, m.uploaderEmail)} uploaded \u201c${m.title}\u201d` });
  });

  reviews.forEach((r) => {
    if (meEmail && r.studentEmail !== meEmail && r.tutorEmail !== meEmail) return;
    const target = meEmail && r.tutorEmail === meEmail ? "you" : r.tutorName;
    events.push({ id: `r-${r.id}`, ts: r.createdAt, kind: "review", people: [{ id: r.studentId, name: r.studentName }, { id: r.tutorId, name: r.tutorName }], text: `${who(r.studentName, r.studentEmail)} rated ${target} ${r.rating}/5` });
  });

  return events.sort((a, b) => b.ts - a.ts);
}

module.exports = { buildActivity };
