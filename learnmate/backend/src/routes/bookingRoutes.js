const express = require("express");
const bookingController = require("../controllers/bookingController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { bookingCreateSchema, bookingStatusSchema } = require("../validators/schemas");

const router = express.Router();

router.use(requireAuth);

router.get("/tutors", bookingController.listTutors);
router.get("/bookings/mine", bookingController.listMine);
router.get("/bookings", requireRole("Admin"), bookingController.listAll);
router.post("/bookings", validateBody(bookingCreateSchema), bookingController.create);
router.patch("/bookings/:id/status", validateBody(bookingStatusSchema), bookingController.updateStatus);
router.delete("/bookings/:id", requireRole("Admin"), bookingController.remove);

module.exports = router;
