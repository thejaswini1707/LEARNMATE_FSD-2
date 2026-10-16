const express = require("express");
const materialController = require("../controllers/materialController");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { materialFieldsSchema } = require("../validators/schemas");
const { uploadMaterial } = require("../middleware/upload");

const router = express.Router();

router.use(requireAuth);

router.get("/", materialController.list);
router.post("/", uploadMaterial.single("file"), validateBody(materialFieldsSchema), materialController.create);
router.delete("/:id", materialController.remove);
router.get("/:id/file", materialController.download);

module.exports = router;
