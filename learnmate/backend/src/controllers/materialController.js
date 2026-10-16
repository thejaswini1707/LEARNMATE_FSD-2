const path = require("path");
const materialService = require("../services/materialService");
const { ok, fail } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { emitApp } = require("../sockets");

const list = asyncHandler(async (req, res) => {
  const materials = await materialService.listMaterials();
  ok(res, materials, "Materials fetched.");
});

const create = asyncHandler(async (req, res) => {
  if (!req.file) return fail(400, "Please choose a PDF, DOC, DOCX, PPT or PPTX file.");
  const material = await materialService.addMaterial(req.user, req.body, req.file);
  emitApp("materials:changed", { reason: "created" });
  ok(res, material, "Material uploaded successfully.", 201);
});

const remove = asyncHandler(async (req, res) => {
  await materialService.removeMaterial(req.params.id, req.user);
  emitApp("materials:changed", { reason: "deleted" });
  ok(res, null, "Material removed.");
});

const download = asyncHandler(async (req, res) => {
  const row = await materialService.findById(req.params.id);
  if (!row) return fail(404, "This material no longer exists.");
  const filePath = path.join(materialService.UPLOAD_DIR, row.storedName);
  res.download(filePath, row.fileName);
});

module.exports = { list, create, remove, download };
