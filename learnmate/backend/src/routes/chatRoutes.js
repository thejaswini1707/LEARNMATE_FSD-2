const express = require("express");
const chatController = require("../controllers/chatController");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { messageCreateSchema, deleteMessagesSchema } = require("../validators/schemas");

const router = express.Router();

router.use(requireAuth);

router.get("/", chatController.listPartners);
router.get("/:convId/messages", chatController.listMessages);
router.post("/:convId/messages", validateBody(messageCreateSchema), chatController.sendMessage);
router.post("/:convId/read", chatController.markRead);
router.patch("/:convId/messages/:id/pin", chatController.togglePin);
router.delete("/:convId/messages", validateBody(deleteMessagesSchema), chatController.deleteMessages);

module.exports = router;
