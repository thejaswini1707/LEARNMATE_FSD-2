const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const { toMs } = require("./userService");

const isUniqueViolation = (err) => err && (err.code === "P2002" || err.code === "23505");

/** After someone declines, the person they declined must wait this long before asking again. */
const REREQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** One row per pair of users, whichever way the request went. */
const pairKey = (a, b) => [a, b].sort().join("|");

/** Relationship of `meId` to the other user, in the vocabulary the UI uses. */
function describe(row, meId) {
  if (!row) return { status: "none", requestId: null };
  if (row.status === "ACCEPTED") return { status: "connected", requestId: row.id };
  if (row.status === "PENDING") return { status: row.senderId === meId ? "sent" : "received", requestId: row.id };
  return { status: "none", requestId: null }; // DECLINED reads as "no relationship" to both sides
}

async function getRelationship(meId, otherId) {
  if (meId === otherId) return { status: "self", requestId: null };
  const row = await prisma.mateUpRequest.findUnique({ where: { pairKey: pairKey(meId, otherId) } });
  return describe(row, meId);
}

/** Relationship of `meId` to every user they have a live (pending/accepted) MateUp row with, in one query. */
async function relationshipsFor(meId) {
  const rows = await prisma.mateUpRequest.findMany({
    where: { OR: [{ senderId: meId }, { receiverId: meId }], status: { in: ["PENDING", "ACCEPTED"] } },
  });
  const map = {};
  rows.forEach((r) => { map[r.senderId === meId ? r.receiverId : r.senderId] = describe(r, meId); });
  return map;
}

async function findTarget(me, receiverId) {
  if (receiverId === me.id) throw new ApiError(400, "You can't send a MateUp request to yourself.");
  const target = await prisma.user.findUnique({ where: { id: receiverId } });
  // Admin accounts are not part of the social side of the app.
  if (!target || target.role === "Admin") throw new ApiError(404, "That user could not be found.");
  return target;
}

/**
 * Sends a request. Returns { target, relationship, becameConnected }.
 * - already connected / already pending from me  -> 409
 * - they already asked me                         -> treated as accepting (both sides want it)
 * - previously declined                           -> allowed again after a cooldown
 */
async function sendRequest(me, receiverId) {
  const target = await findTarget(me, receiverId);
  const key = pairKey(me.id, target.id);

  const existing = await prisma.mateUpRequest.findUnique({ where: { pairKey: key } });

  if (existing) {
    if (existing.status === "ACCEPTED") throw new ApiError(409, "You're already connected on MateUp.");

    if (existing.status === "PENDING") {
      if (existing.senderId === me.id) throw new ApiError(409, "You've already sent this person a MateUp request.");
      const accepted = await prisma.mateUpRequest.updateMany({
        where: { id: existing.id, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      if (accepted.count !== 1) throw new ApiError(409, "This request was already handled.");
      return { target, relationship: { status: "connected", requestId: existing.id }, becameConnected: true };
    }

    // DECLINED
    if (existing.senderId === me.id && Date.now() - toMs(existing.updatedAt) < REREQUEST_COOLDOWN_MS) {
      throw new ApiError(429, "You can send this person another MateUp request a little later.");
    }
    const reopened = await prisma.mateUpRequest.updateMany({
      where: { id: existing.id, status: "DECLINED" },
      data: { status: "PENDING", senderId: me.id, receiverId: target.id },
    });
    if (reopened.count !== 1) throw new ApiError(409, "This request was already updated. Please refresh.");
    return { target, relationship: { status: "sent", requestId: existing.id }, becameConnected: false };
  }

  try {
    const created = await prisma.mateUpRequest.create({
      data: { senderId: me.id, receiverId: target.id, pairKey: key, status: "PENDING" },
    });
    return { target, relationship: { status: "sent", requestId: created.id }, becameConnected: false };
  } catch (err) {
    // Two requests raced; the UNIQUE(pairKey) index let only one through.
    if (isUniqueViolation(err)) throw new ApiError(409, "A MateUp request between you two already exists.");
    throw err;
  }
}

/** Receiver accepts or declines. Only the receiver of a PENDING request may do so. */
async function respond(me, requestId, action) {
  const row = await prisma.mateUpRequest.findUnique({ where: { id: requestId } });
  if (!row || (row.receiverId !== me.id && row.senderId !== me.id)) {
    throw new ApiError(404, "This MateUp request no longer exists.");
  }
  if (row.receiverId !== me.id) throw new ApiError(403, "Only the person who received a request can respond to it.");
  if (row.status !== "PENDING") throw new ApiError(400, "This request has already been answered.");

  const status = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated = await prisma.mateUpRequest.updateMany({ where: { id: row.id, status: "PENDING" }, data: { status } });
  if (updated.count !== 1) throw new ApiError(400, "This request has already been answered.");
  return { senderId: row.senderId, status };
}

/** Removes a connection, or cancels a request the caller sent. Returns the other user's id. */
async function remove(me, otherId) {
  const row = await prisma.mateUpRequest.findUnique({ where: { pairKey: pairKey(me.id, otherId) } });
  const removable = row && (row.status === "ACCEPTED" || (row.status === "PENDING" && row.senderId === me.id));
  if (!removable) throw new ApiError(404, "There is no MateUp connection or pending request to remove.");
  await prisma.mateUpRequest.delete({ where: { id: row.id } });
  return otherId;
}

const BRIEF = { id: true, name: true, email: true, role: true, department: true, year: true, avatar: true };

/** Everything the signed-in user needs for their MateUp lists. */
async function listMine(me) {
  const rows = await prisma.mateUpRequest.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }], status: { in: ["PENDING", "ACCEPTED"] } },
    include: { sender: { select: BRIEF }, receiver: { select: BRIEF } },
    orderBy: { updatedAt: "desc" },
  });

  const mates = [];
  const incoming = [];
  const outgoing = [];
  for (const r of rows) {
    const other = r.senderId === me.id ? r.receiver : r.sender;
    if (r.status === "ACCEPTED") mates.push({ ...other, requestId: r.id, since: toMs(r.updatedAt) });
    else if (r.receiverId === me.id) incoming.push({ requestId: r.id, from: other, sentAt: toMs(r.updatedAt) });
    else outgoing.push({ requestId: r.id, to: other, sentAt: toMs(r.updatedAt) });
  }
  return { mates, incoming, outgoing };
}

async function countMates(userId) {
  return prisma.mateUpRequest.count({
    where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
  });
}

module.exports = { getRelationship, relationshipsFor, sendRequest, respond, remove, listMine, countMates };
