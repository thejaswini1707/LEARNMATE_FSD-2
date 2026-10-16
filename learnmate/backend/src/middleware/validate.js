const { ApiError } = require("../utils/apiResponse");

/** Validates req.body against a Zod schema, replacing it with the parsed+defaulted result. */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Invalid request data.";
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
