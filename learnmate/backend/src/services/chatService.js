const prisma = require("../config/prisma");
const { toMs, toPublicProfile } = require("./userService");
const mateUpService = require("./mateUpService");

function conversationId(a, b) {
  return [a, b].sort().join("|");
}

function decorateMessage(row) {
  return {
    id: row.id,
    from: row.fromEmail,
    text: row.text,
    time: toMs(row.createdAt),
    pinned: row.pinned,
    replyTo: row.replyTo || null,
  };
}

async function listChatPartners(me) {
  const [relationships, candidates, unreadRows] = await Promise.all([
    mateUpService.relationshipsFor(me.id),
    prisma.user.findMany({ where: { email: { not: me.email }, role: { not: "Admin" } } }),
    prisma.message.groupBy({
      by: ["fromEmail"],
      where: { recipientEmail: me.email, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const unreadBySender = Object.fromEntries(unreadRows.map((r) => [r.fromEmail, r._count._all]));

  const withLast = await Promise.all(
    candidates.map(async (u) => {
      const convId = conversationId(me.email, u.email);
      const last = await prisma.message.findFirst({
        where: { conversationId: convId },
        orderBy: { createdAt: "desc" },
      });
      return { ...toPublicProfile(u), last: last ? decorateMessage(last) : null, unread: unreadBySender[u.email] || 0, mateUp: relationships[u.id] || { status: "none", requestId: null } };
    })
  );

  return withLast.sort((a, b) => {
    const at = a.last?.time || 0;
    const bt = b.last?.time || 0;
    if (bt !== at) return bt - at;
    return a.name.localeCompare(b.name);
  });
}

async function listMessages(convId) {
  const rows = await prisma.message.findMany({ where: { conversationId: convId }, orderBy: { createdAt: "asc" } });
  return rows.map(decorateMessage);
}

async function sendMessage(convId, fromEmail, recipientEmail, text, replyTo) {
  const created = await prisma.message.create({
    data: {
      conversationId: convId,
      fromEmail,
      recipientEmail,
      text: text.trim(),
      replyTo: replyTo || undefined,
    },
  });
  return decorateMessage(created);
}

/** Marks everything the user has received in this conversation as read. Returns how many changed. */
async function markConversationRead(convId, myEmail) {
  const result = await prisma.message.updateMany({
    where: { conversationId: convId, recipientEmail: myEmail, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

async function togglePin(convId, id) {
  const existing = await prisma.message.findFirst({ where: { id, conversationId: convId } });
  if (!existing) return;
  await prisma.message.update({ where: { id }, data: { pinned: !existing.pinned } });
}

async function deleteMessages(convId, ids) {
  await prisma.message.deleteMany({ where: { conversationId: convId, id: { in: ids } } });
}

module.exports = { conversationId, listChatPartners, listMessages, sendMessage, markConversationRead, togglePin, deleteMessages };
