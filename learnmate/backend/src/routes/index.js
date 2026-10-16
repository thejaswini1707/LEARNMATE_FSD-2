const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
// miscRoutes is mounted BEFORE bookingRoutes on purpose: bookingRoutes applies requireAuth to everything
// under "/", which would otherwise also block the public, logged-out /public-stats endpoint.
router.use("/", require("./miscRoutes")); // exposes /notifications, /activity, /public-stats
router.use("/", require("./bookingRoutes")); // exposes /tutors, /bookings...
router.use("/reviews", require("./reviewRoutes"));
router.use("/materials", require("./materialRoutes"));
router.use("/chats", require("./chatRoutes"));
router.use("/mateup", require("./mateUpRoutes"));

module.exports = router;
