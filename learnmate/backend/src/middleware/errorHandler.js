const { ApiError } = require("../utils/apiResponse");

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // Postgres unique-violation (raw driver code, or Prisma's P2002 wrapper)
  if (err.code === "23505" || err.code === "P2002") {
    return res.status(409).json({ success: false, message: "That value is already in use." });
  }
  // Postgres foreign-key violation
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Related record not found." });
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      const env = require("../config/env");
      return res.status(400).json({ success: false, message: `This file is larger than ${env.maxUploadMb} MB. Please choose a smaller file.` });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error(err);
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};
