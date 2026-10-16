const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uid = require("../utils/uid");
const env = require("../config/env");
const { ApiError } = require("../utils/apiResponse");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "materials");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uid()}${path.extname(file.originalname)}`),
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!env.allowedUploadExtensions.includes(ext)) {
    return cb(new ApiError(400, "Please choose a PDF, DOC, DOCX, PPT or PPTX file."));
  }
  cb(null, true);
}

const uploadMaterial = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

module.exports = { uploadMaterial };
