class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ok = (res, data, message = "Operation successful", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (status, message) => {
  throw new ApiError(status, message);
};

module.exports = { ApiError, ok, fail };
