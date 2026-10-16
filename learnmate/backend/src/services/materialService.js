const path = require("path");
const fs = require("fs");
const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const { toMs } = require("./userService");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "materials");

function decorate(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    type: row.type,
    description: row.description,
    uploadedBy: row.uploader?.name || "Unknown",
    uploaderEmail: row.uploader?.email || null,
    uploaderId: row.uploaderId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    fileType: row.fileType,
    storedName: row.storedName,
    fileUrl: `/api/materials/${row.id}/file`,
    createdAt: toMs(row.createdAt),
  };
}

async function listMaterials() {
  const rows = await prisma.material.findMany({ include: { uploader: true }, orderBy: { createdAt: "desc" } });
  return rows.map(decorate);
}

async function findById(id) {
  const row = await prisma.material.findUnique({ where: { id }, include: { uploader: true } });
  return row ? decorate(row) : null;
}

async function addMaterial(user, { title, subject, description }, file) {
  const type = file.originalname.split(".").pop().toUpperCase();
  const created = await prisma.material.create({
    include: { uploader: true },
    data: {
      title: title.trim(),
      subject,
      type,
      description: (description || "").trim() || "Uploaded study material.",
      uploaderId: user.id,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      storedName: file.filename,
    },
  });
  return decorate(created);
}

async function removeMaterial(id, user) {
  const row = await findById(id);
  if (!row) throw new ApiError(404, "This material no longer exists.");
  const isOwner = !row.uploaderId || row.uploaderId === user.id;
  if (!isOwner && user.role !== "Admin") throw new ApiError(403, "You can only remove materials you uploaded.");

  await prisma.material.delete({ where: { id } });
  const filePath = path.join(UPLOAD_DIR, row.storedName);
  fs.unlink(filePath, () => {}); // best-effort; ignore if already gone
}

module.exports = { listMaterials, findById, addMaterial, removeMaterial, decorate, UPLOAD_DIR };
