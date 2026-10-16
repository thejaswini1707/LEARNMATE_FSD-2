const express = require("express");
const userController = require("../controllers/userController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { updateProfileSchema, adminUpdateUserSchema } = require("../validators/schemas");

const router = express.Router();

router.use(requireAuth);

router.put("/me", validateBody(updateProfileSchema), userController.updateMe);
router.get("/", requireRole("Admin"), userController.list);
router.get("/:id/profile", userController.getProfile); // public profile of any member (no private fields)
router.patch("/:id", requireRole("Admin"), validateBody(adminUpdateUserSchema), userController.adminUpdate);
router.delete("/:id", requireRole("Admin"), userController.adminDelete);

module.exports = router;
