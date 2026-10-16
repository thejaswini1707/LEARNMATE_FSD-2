const express = require("express");
const notificationController = require("../controllers/notificationController");
const miscController = require("../controllers/miscController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/notifications", requireAuth, notificationController.get);
router.post("/notifications/seen", requireAuth, notificationController.markSeen);
router.get("/activity", requireAuth, miscController.activity);
router.get("/public-stats", miscController.publicStats); // shown on the logged-out landing page

module.exports = router;
