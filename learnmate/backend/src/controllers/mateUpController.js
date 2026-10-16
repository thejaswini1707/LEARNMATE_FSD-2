const mateUpService = require("../services/mateUpService");
const { ok } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitToUser } = require("../sockets");

/** Tells the other person's open tabs to refresh MateUp state + notifications. */
function pingBoth(meId, otherId, extra = {}) {
  emitToUser(otherId, "mateup:changed", { ...extra });
  emitToUser(otherId, "notifications:changed", {});
  emitToUser(meId, "mateup:changed", {});
}

const listMine = asyncHandler(async (req, res) => {
  ok(res, await mateUpService.listMine(req.user), "MateUp connections fetched.");
});

const send = asyncHandler(async (req, res) => {
  const { target, relationship, becameConnected } = await mateUpService.sendRequest(req.user, req.params.userId);
  pingBoth(req.user.id, target.id);
  emitToUser(target.id, "notifications:new", {
    kind: "mateup",
    text: becameConnected ? `You and ${req.user.name} are now MateUp connections` : `${req.user.name} sent you a MateUp request`,
    to: `/profile/${req.user.id}`,
  });
  ok(res, relationship, becameConnected ? "You're now connected!" : "MateUp request sent.", 201);
});

const respond = (action) =>
  asyncHandler(async (req, res) => {
    const { senderId, status } = await mateUpService.respond(req.user, req.params.requestId, action);
    pingBoth(req.user.id, senderId);
    if (status === "ACCEPTED") {
      emitToUser(senderId, "notifications:new", {
        kind: "mateup",
        text: `${req.user.name} accepted your MateUp request`,
        to: `/profile/${req.user.id}`,
      });
    }
    ok(res, { status }, status === "ACCEPTED" ? "You're now connected!" : "Request declined.");
  });

const remove = asyncHandler(async (req, res) => {
  const otherId = await mateUpService.remove(req.user, req.params.userId);
  pingBoth(req.user.id, otherId);
  ok(res, null, "MateUp updated.");
});

module.exports = { listMine, send, accept: respond("accept"), decline: respond("decline"), remove };
