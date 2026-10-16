const prisma = require("../config/prisma");
const bookingService = require("./bookingService");
const reviewService = require("./reviewService");
const { toMs } = require("./userService");

const ACTOR = { id: true, name: true, email: true, avatar: true };

/**
 * The notification feed is derived from existing data (bookings, reviews, and now chat messages and
 * MateUp requests), exactly as before. Two kinds of read state coexist:
 *  - session / review / MateUp items use the existing "seen up to" watermark (User.notifSeenAt);
 *  - unread chat messages use Message.readAt, so they stay unread until the conversation is opened.
 */
async function getNotifications(user) {
  const [{ asStudent, asTutor }, reviews, unreadByCounterpart, mateRows] = await Promise.all([
    bookingService.listMyBookings(user),
    reviewService.listReviews(),
    prisma.message.groupBy({
      by: ["fromEmail"],
      where: { recipientEmail: user.email, readAt: null },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.mateUpRequest.findMany({
      where: {
        OR: [
          { receiverId: user.id, status: "PENDING" },
          { senderId: user.id, status: "ACCEPTED" },
        ],
      },
      include: { sender: { select: ACTOR }, receiver: { select: ACTOR } },
    }),
  ]);

  const seenAt = toMs(user.notifSeenAt) || 0;
  const items = [];

  asTutor.forEach((b) => {
    if (b.status === "Pending") {
      items.push({
        id: `req-${b.id}`,
        kind: "booking",
        ts: b.createdAt,
        text: `${b.studentName || "A student"} requested a ${b.subject} session`,
        to: "/booking?tab=requests",
      });
    }
  });
  asStudent.forEach((b) => {
    if (b.updatedAt > b.createdAt && b.status !== "Pending") {
      items.push({
        id: `upd-${b.id}-${b.status}`,
        kind: "booking",
        ts: b.updatedAt,
        text: `Your ${b.subject} session with ${b.tutor} was ${b.status.toLowerCase()}`,
        to: "/booking?tab=sessions",
      });
    }
  });
  reviews.forEach((r) => {
    if (r.tutorEmail === user.email) {
      items.push({
        id: `rev-${r.id}`,
        kind: "review",
        ts: r.createdAt,
        text: `${r.studentName} rated you ${r.rating}/5 for ${r.subject}`,
        to: "/reviews",
      });
    }
  });

  mateRows.forEach((r) => {
    if (r.status === "PENDING") {
      items.push({
        id: `mu-req-${r.id}`,
        kind: "mateup",
        ts: toMs(r.updatedAt),
        text: `${r.sender.name} sent you a MateUp request`,
        to: `/profile/${r.sender.id}`,
        mateUp: { requestId: r.id, actionable: true },
        actor: r.sender,
      });
    } else {
      items.push({
        id: `mu-acc-${r.id}`,
        kind: "mateup",
        ts: toMs(r.updatedAt),
        text: `${r.receiver.name} accepted your MateUp request`,
        to: `/profile/${r.receiver.id}`,
        actor: r.receiver,
      });
    }
  });

  // One entry per person who has unread messages for me.
  let unreadMessages = 0;
  if (unreadByCounterpart.length) {
    const senders = await prisma.user.findMany({
      where: { email: { in: unreadByCounterpart.map((r) => r.fromEmail) } },
      select: ACTOR,
    });
    const byEmail = Object.fromEntries(senders.map((u) => [u.email, u]));
    unreadByCounterpart.forEach((row) => {
      const sender = byEmail[row.fromEmail];
      if (!sender) return;
      const count = row._count._all;
      unreadMessages += count;
      items.push({
        id: `msg-${sender.id}`,
        kind: "message",
        ts: toMs(row._max.createdAt),
        text: count === 1 ? `New message from ${sender.name}` : `${count} new messages from ${sender.name}`,
        to: `/chat?with=${encodeURIComponent(sender.email)}`,
        unreadCount: count,
        actor: sender,
        unread: true,
      });
    });
  }

  items.forEach((i) => {
    if (i.kind !== "message") i.unread = i.ts > seenAt;
  });
  items.sort((a, b) => b.ts - a.ts);

  const unreadOther = items.filter((i) => i.kind !== "message" && i.unread).length;
  return {
    items: items.slice(0, 20),
    unread: unreadOther + unreadMessages,
    unreadMessages,
    seenAt,
  };
}

module.exports = { getNotifications };
