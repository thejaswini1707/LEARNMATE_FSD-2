/*
  The app's data layer. Every function calls the Express REST API, which reads and writes
  PostgreSQL through Prisma; Socket.IO pushes live updates through services/socket.js
  + storage.js's notify(), so pages refresh without a reload.
*/
import { KEYS, notify, read, removeKey, subscribe, write } from "./storage";
import { connectSocket, disconnectSocket } from "./socket";

export { subscribe, KEYS, notify };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = read(KEYS.token, null);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // no JSON body (e.g. a network-level failure)
  }

  if (!res.ok) {
    if (res.status === 401) {
      // The session is no longer valid server-side (deleted account, expired token...).
      // Clear it locally so ProtectedRoute naturally sends the user back to /login.
      removeKey(KEYS.session);
      removeKey(KEYS.token);
      write(KEYS.loggedIn, false);
      disconnectSocket();
    }
    throw new Error(payload?.message || "Something went wrong. Please try again.");
  }
  return payload?.data;
}

/* ---------- Auth ---------- */

export async function registerUser(form) {
  return request("/auth/register", { method: "POST", body: form });
}

export async function loginUser(emailInput, password) {
  const { user, token } = await request("/auth/login", { method: "POST", body: { email: emailInput, password } });
  write(KEYS.token, token);
  write(KEYS.session, user);
  write(KEYS.loggedIn, true);
  connectSocket(token);
  return user;
}

/* Password reset (the server answers identically whether or not the email is registered). */
export async function requestPasswordReset(email) {
  return request("/auth/forgot-password", { method: "POST", body: { email } });
}

export async function resetPassword(token, password) {
  return request("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function logoutUser() {
  removeKey(KEYS.session);
  removeKey(KEYS.token);
  write(KEYS.loggedIn, false);
  disconnectSocket();
}

export function getSessionUser() {
  const token = read(KEYS.token, null);
  const user = read(KEYS.session, null);
  if (!token || !user) return null;
  connectSocket(token); // idempotent - reconnects the live-update socket after a page refresh
  return user;
}

/* ---------- Profile / admin ---------- */

export async function updateProfile(email, patch) {
  const updated = await request("/users/me", { method: "PUT", body: patch });
  write(KEYS.session, updated); // keep the cached session (and AuthProvider's user) in sync
  return updated;
}

export async function listUsers() {
  return request("/users");
}

export async function adminUpdateUser(id, patch) {
  return request(`/users/${id}`, { method: "PATCH", body: patch });
}

export async function adminDeleteUser(id) {
  return request(`/users/${id}`, { method: "DELETE" });
}

/* ---------- Public profiles & MateUp ---------- */

export async function getPublicProfile(userId) {
  return request(`/users/${encodeURIComponent(userId)}/profile`);
}

export async function listMateUp() {
  return request("/mateup");
}

export async function sendMateUpRequest(userId) {
  const result = await request(`/mateup/requests/${encodeURIComponent(userId)}`, { method: "POST" });
  notify(KEYS.mateup);
  return result;
}

export async function acceptMateUp(requestId) {
  const result = await request(`/mateup/requests/${encodeURIComponent(requestId)}/accept`, { method: "POST" });
  notify(KEYS.mateup);
  return result;
}

export async function declineMateUp(requestId) {
  const result = await request(`/mateup/requests/${encodeURIComponent(requestId)}/decline`, { method: "POST" });
  notify(KEYS.mateup);
  return result;
}

/** Removes a mate, or cancels a request I sent. */
export async function removeMateUp(userId) {
  const result = await request(`/mateup/${encodeURIComponent(userId)}`, { method: "DELETE" });
  notify(KEYS.mateup);
  return result;
}

/* ---------- Reviews ---------- */

export async function listReviews() {
  return request("/reviews");
}

/** Reviews are tied to one completed session; the server re-checks eligibility. */
export async function createReview(user, { bookingId, rating, comment }) {
  return request("/reviews", { method: "POST", body: { bookingId, rating, comment } });
}

/** My completed sessions as a student, each flagged `reviewed` or not. */
export async function listReviewableSessions() {
  return request("/reviews/eligible");
}

export async function deleteReview(id) {
  return request(`/reviews/${id}`, { method: "DELETE" });
}

/* ---------- Tutors / bookings ---------- */

export async function listTutors(excludeEmail) {
  const qs = excludeEmail ? `?exclude=${encodeURIComponent(excludeEmail)}` : "";
  return request(`/tutors${qs}`);
}

export async function listAllBookings() {
  return request("/bookings");
}

export async function listMyBookings() {
  return request("/bookings/mine");
}

export async function createBooking(user, data) {
  return request("/bookings", { method: "POST", body: data });
}

export async function updateBookingStatus(id, status) {
  return request(`/bookings/${id}/status`, { method: "PATCH", body: { status } });
}

export async function deleteBooking(id) {
  return request(`/bookings/${id}`, { method: "DELETE" });
}

/* ---------- Materials ---------- */

export async function listMaterials() {
  return request("/materials");
}

export async function addMaterial(user, { title, subject, description, file }) {
  const form = new FormData();
  form.append("title", title);
  form.append("subject", subject);
  form.append("description", description || "");
  form.append("file", file);
  return request("/materials", { method: "POST", body: form, isForm: true });
}

export async function removeMaterial(id) {
  return request(`/materials/${id}`, { method: "DELETE" });
}

/** Fetches a material's file as a Blob (auth required), for in-browser preview/download. */
export async function fetchMaterialFile(item) {
  const token = read(KEYS.token, null);
  const res = await fetch(`${API_URL}${item.fileUrl}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("The file for this material isn't available.");
  return res.blob();
}

/* ---------- Chat ---------- */

export const conversationId = (a, b) => [a, b].sort().join("|");

export async function listChatPartners() {
  return request("/chats");
}

export async function listMessages(convId) {
  return request(`/chats/${encodeURIComponent(convId)}/messages`);
}

export async function sendMessage(convId, from, text, replyTo) {
  return request(`/chats/${encodeURIComponent(convId)}/messages`, { method: "POST", body: { text, replyTo } });
}

/** Marks everything I received in this conversation as read (clears its unread badge). */
export async function markConversationRead(convId) {
  const result = await request(`/chats/${encodeURIComponent(convId)}/read`, { method: "POST" });
  if (result?.marked > 0) { notify(KEYS.notifications); notify(KEYS.chats); }
  return result;
}

export async function togglePin(convId, id) {
  return request(`/chats/${encodeURIComponent(convId)}/messages/${id}/pin`, { method: "PATCH" });
}

export async function deleteMessages(convId, ids) {
  return request(`/chats/${encodeURIComponent(convId)}/messages`, { method: "DELETE", body: { ids } });
}

/* ---------- Notifications / activity / stats ---------- */

export async function getNotifications() {
  return request("/notifications");
}

export async function markNotificationsSeen() {
  return request("/notifications/seen", { method: "POST" });
}

export async function buildActivity(meEmail = null) {
  return request(`/activity?mine=${meEmail ? "true" : "false"}`);
}

export async function getPublicStats() {
  return request("/public-stats");
}
