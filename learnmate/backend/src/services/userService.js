const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");
const env = require("../config/env");

const PROFILE_FIELDS = ["name", "mobile", "department", "college", "year", "skills", "bio", "level", "mode", "availability", "avatar"];
const ADMIN_EDITABLE_FIELDS = ["name", "department", "year", "role"];

function toMs(date) {
  return date ? new Date(date).getTime() : null;
}

/** Strips passwordHash and reshapes the Prisma row -> the exact public user shape the frontend expects. */
function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    department: row.department,
    year: row.year,
    college: row.college,
    skills: row.skills,
    bio: row.bio,
    level: row.level,
    mode: row.mode,
    availability: row.availability,
    avatar: row.avatar,
    createdAt: toMs(row.createdAt),
  };
}

/**
 * What any signed-in user may see about another user. Deliberately omits the mobile number
 * (and, like toPublic, never includes passwordHash). Email stays because the app already uses it
 * as the chat/booking identifier for every user.
 */
function toPublicProfile(row) {
  if (!row) return null;
  const { mobile, ...rest } = toPublic(row); // eslint-disable-line no-unused-vars
  return rest;
}

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function registerUser(form) {
  const email = form.email.trim().toLowerCase();
  const existing = await findByEmail(email);
  if (existing) throw new ApiError(409, "An account with this email already exists. Try logging in instead.");

  const role = env.adminEmails.includes(email) ? "Admin" : form.role;
  const passwordHash = await bcrypt.hash(form.password, 10);

  const user = await prisma.user.create({
    data: {
      name: form.name.trim(),
      email,
      mobile: form.mobile.trim(),
      role,
      department: form.department.trim(),
      year: form.year,
      passwordHash,
    },
  });
  return toPublic(user);
}

async function verifyLogin(emailInput, password) {
  const email = emailInput.trim().toLowerCase();
  const user = await findByEmail(email);
  if (!user) throw new ApiError(401, "The email or password you entered is incorrect.");
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, "The email or password you entered is incorrect.");
  return user;
}

async function updateProfile(email, patch) {
  const user = await findByEmail(email);
  if (!user) throw new ApiError(404, "We couldn't find your account. Please log in again.");

  const data = {};
  for (const field of PROFILE_FIELDS) {
    if (field in patch) data[field] = patch[field];
  }
  if (Object.keys(data).length === 0) return toPublic(user);

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return toPublic(updated);
}

async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(toPublic);
}

async function adminUpdateUser(id, patch) {
  const user = await findById(id);
  if (!user) throw new ApiError(404, "This user no longer exists.");

  const data = {};
  for (const field of ADMIN_EDITABLE_FIELDS) {
    if (field in patch) data[field] = patch[field];
  }
  if (Object.keys(data).length === 0) return toPublic(user);

  const updated = await prisma.user.update({ where: { id }, data });
  return toPublic(updated);
}

async function adminDeleteUser(id, actingUser) {
  const target = await findById(id);
  if (!target) throw new ApiError(404, "This user no longer exists.");
  if (target.email === actingUser.email) throw new ApiError(400, "You can't delete your own account.");
  await prisma.user.delete({ where: { id } });
}

async function markNotifSeen(userId) {
  await prisma.user.update({ where: { id: userId }, data: { notifSeenAt: new Date() } });
}

module.exports = {
  toPublic,
  toPublicProfile,
  toMs,
  findByEmail,
  findById,
  registerUser,
  verifyLogin,
  updateProfile,
  listUsers,
  adminUpdateUser,
  adminDeleteUser,
  markNotifSeen,
};
