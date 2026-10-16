/*
  Bridges real-time server events to the client-side notify()/subscribe() pub-sub in storage.js.
  Pages call useAsync(fn, [KEYS.x]) to reload whenever KEYS.x changes, so mapping each server event
  to notify(KEYS.x) here keeps every page live without it knowing about sockets.
*/
import { io } from "socket.io-client";
import { KEYS, notify } from "./storage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;
const liveHandlers = new Set();

/** Calls `handler(payload)` for each real-time "notifications:new" event (used for toasts). Returns an unsubscribe fn. */
export function onLiveNotification(handler) {
  liveHandlers.add(handler);
  return () => liveHandlers.delete(handler);
}

function refreshNotificationState() {
  notify(KEYS.notifications);
  notify(KEYS.chats);
  notify(KEYS.mateup);
}

export function connectSocket(token) {
  if (!token) return;
  if (socket) {
    if (socket.auth?.token === token && socket.connected) return;
    socket.disconnect();
  }
  socket = io(API_URL, { auth: { token }, autoConnect: true });

  socket.on("users:changed", () => notify(KEYS.users));
  socket.on("bookings:changed", () => { notify(KEYS.bookings); notify(KEYS.notifications); });
  socket.on("reviews:changed", () => { notify(KEYS.reviews); notify(KEYS.notifications); });
  socket.on("materials:changed", () => notify(KEYS.materialsVersion));
  socket.on("messages:new", () => { notify(KEYS.chats); notify(KEYS.notifications); });
  socket.on("mateup:changed", () => { notify(KEYS.mateup); notify(KEYS.notifications); });
  socket.on("notifications:changed", () => notify(KEYS.notifications));
  socket.on("notifications:new", (payload) => {
    notify(KEYS.notifications);
    liveHandlers.forEach((handler) => handler(payload));
  });
  socket.on("notifications:seen", (payload) => {
    if (payload?.email) notify(KEYS.notifSeen(payload.email));
  });
  // After a dropped connection, anything sent meanwhile is picked up by re-fetching.
  socket.io.on("reconnect", refreshNotificationState);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
