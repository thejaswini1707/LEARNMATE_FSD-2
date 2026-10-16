const express = require("express");
const reviewController = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { reviewCreateSchema } = require("../validators/schemas");

const router = express.Router();

router.use(requireAuth);

router.get("/", reviewController.list);
router.get("/eligible", reviewController.eligibleSessions); // my completed sessions + whether each is already reviewed
router.post("/", validateBody(reviewCreateSchema), reviewController.create);
router.delete("/:id", reviewController.remove);

module.exports = router;
