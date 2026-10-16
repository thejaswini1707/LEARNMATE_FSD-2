const express = require("express");
const mateUpController = require("../controllers/mateUpController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", mateUpController.listMine); // my mates + incoming + outgoing requests
router.post("/requests/:userId", mateUpController.send); // send a MateUp request to a user
router.post("/requests/:requestId/accept", mateUpController.accept); // receiver only
router.post("/requests/:requestId/decline", mateUpController.decline); // receiver only
router.delete("/:userId", mateUpController.remove); // remove a mate, or cancel a request I sent

module.exports = router;
