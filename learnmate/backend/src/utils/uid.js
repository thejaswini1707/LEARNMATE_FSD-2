const crypto = require("crypto");

module.exports = function uid() {
  return crypto.randomUUID();
};
