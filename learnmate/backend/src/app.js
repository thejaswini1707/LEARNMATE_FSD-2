const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const apiRouter = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // allow uploaded files to be fetched by the frontend origin
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "2mb" })); // generous enough for base64 avatar images

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "LearnMate API is running." }));
app.use("/api", apiRouter);

// Uploaded material files are only ever reached through the authenticated
// /api/materials/:id/file controller route, never served directly as static files.

app.use(errorHandler);

module.exports = app;
