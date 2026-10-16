const chatService = require("../services/chatService");
const { ok, fail } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitToEmail, emitToUser } = require("../sockets");

function otherParticipant(convId, myEmail) {
  const [a, b] = convId.split("|");
  if (a !== myEmail && b !== myEmail) return null;
  return a === myEmail ? b : a;
}

const listPartners = asyncHandler(async (req, res) => {
  const partners = await chatService.listChatPartners(req.user);
  ok(res, partners, "Conversations fetched.");
});

const listMessages = asyncHandler(async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const other = otherParticipant(convId, req.user.email);
  if (!other) return fail(403, "You don't have access to this conversation.");
  const messages = await chatService.listMessages(convId);
  ok(res, messages, "Messages fetched.");
});

const sendMessage = asyncHandler(async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const other = otherParticipant(convId, req.user.email);
  if (!other) return fail(403, "You don't have access to this conversation.");

  const message = await chatService.sendMessage(convId, req.user.email, other, req.body.text, req.body.replyTo);
  emitToEmail(other, "messages:new", { convId });
  emitToEmail(req.user.email, "messages:new", { convId });
  // Real-time notification for the recipient only (never the sender).
  emitToEmail(other, "notifications:new", {
    kind: "message",
    convId,
    fromName: req.user.name,
    fromEmail: req.user.email,
    text: `New message from ${req.user.name}`,
    preview: message.text.length > 80 ? `${message.text.slice(0, 77)}...` : message.text,
    to: `/chat?with=${encodeURIComponent(req.user.email)}`,
  });
  ok(res, message, "Message sent.", 201);
});

const markRead = asyncHandler(async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const other = otherParticipant(convId, req.user.email);
  if (!other) return fail(403, "You don't have access to this conversation.");

  const count = await chatService.markConversationRead(convId, req.user.email);
  // Only my own tabs/devices need to update their badges.
  if (count > 0) emitToUser(req.user.id, "notifications:changed", {});
  ok(res, { marked: count }, "Conversation marked as read.");
});

const togglePin = asyncHandler(async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const other = otherParticipant(convId, req.user.email);
  if (!other) return fail(403, "You don't have access to this conversation.");

  await chatService.togglePin(convId, req.params.id);
  emitToEmail(other, "messages:new", { convId });
  emitToEmail(req.user.email, "messages:new", { convId });
  ok(res, null, "Message updated.");
});

const deleteMessages = asyncHandler(async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const other = otherParticipant(convId, req.user.email);
  if (!other) return fail(403, "You don't have access to this conversation.");

  await chatService.deleteMessages(convId, req.body.ids);
  emitToEmail(other, "messages:new", { convId });
  emitToEmail(req.user.email, "messages:new", { convId });
  ok(res, null, "Messages deleted.");
});

module.exports = { listPartners, listMessages, sendMessage, markRead, togglePin, deleteMessages };
