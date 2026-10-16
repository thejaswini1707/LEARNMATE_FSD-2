const jwt = require("../utils/jwt");
const prisma = require("../config/prisma");
const { ApiError } = require("../utils/apiResponse");

/** Verifies the Bearer token and attaches the current user row to req.user. */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "Missing authentication token");

    let payload;
    try {
      payload = jwt.verify(token);
    } catch {
      throw new ApiError(401, "Invalid or expired session. Please log in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new ApiError(401, "This account no longer exists.");

    // A password reset signs out every session that was issued before it.
    if ((payload.pv || 0) !== jwt.passwordVersion(user)) {
      throw new ApiError(401, "Your password was changed. Please log in again.");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Restricts a route to one or more roles. Use after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action."));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
