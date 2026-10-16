const { Server } = require("socket.io");
const jwt = require("../utils/jwt");
const env = require("../config/env");

let io = null;

function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing auth token"));
      const payload = jwt.verify(token);
      socket.userId = payload.userId;
      socket.userEmail = payload.email;
      next();
    } catch {
      next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`email:${socket.userEmail}`);
    socket.join("app"); // app-wide room for events relevant to every connected client
  });

  return io;
}

/** Emits to every socket belonging to one user (their own other tabs/devices included). */
function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

/** Emits to every socket signed in as this email - used for private chat delivery. */
function emitToEmail(email, event, payload) {
  if (io) io.to(`email:${email}`).emit(event, payload);
}

/** Emits to every connected, authenticated client. */
function emitApp(event, payload) {
  if (io) io.to("app").emit(event, payload);
}

/** Closes every live connection of one user (used after a password reset). */
function disconnectUser(userId) {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
}

module.exports = { initSockets, emitToUser, emitToEmail, emitApp, disconnectUser };
