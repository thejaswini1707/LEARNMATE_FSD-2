/*
  Client-side storage primitives: localStorage (only the signed-in session + token live there)
  plus a tiny pub/sub so pages re-fetch from the REST API when the backend reports a change.
  All application data (users, bookings, chat, materials...) lives in PostgreSQL, not in the browser.
*/

export const KEYS = {
  session: "learnmateUser",
  loggedIn: "isLoggedIn",
  token: "learnmateToken",
  users: "learnmateUsers",
  bookings: "bookings",
  reviews: "learnmateReviews",
  chats: "learnmateChats",
  materialsVersion: "learnmateMaterialsVersion",
  notifications: "learnmateNotifications",
  mateup: "learnmateMateUp",
  notifSeen: (email) => `learnmateNotifSeen:${email}`,
};

const listeners = new Set();

export function notify(key) {
  listeners.forEach((entry) => {
    if (entry.keys.has(key)) entry.callback();
  });
}

/* Calls `callback` whenever any of `keys` changes here or in another tab. */
export function subscribe(keys, callback) {
  const entry = { keys: new Set(keys), callback };
  listeners.add(entry);
  const onStorage = (event) => {
    if (event.key === null || entry.keys.has(event.key)) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(entry);
    window.removeEventListener("storage", onStorage);
  };
}

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("Your browser storage is full or unavailable. Free some space and try again.");
  }
  notify(key);
}

export function removeKey(key) {
  localStorage.removeItem(key);
  notify(key);
}
