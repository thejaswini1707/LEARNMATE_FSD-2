const jwt = require("jsonwebtoken");
const env = require("../config/env");

const sign = (payload) => jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const verify = (token) => jwt.verify(token, env.jwtSecret);

/**
 * Identifies "which password" a token was issued for: 0 until the first password reset, then the
 * reset timestamp. A token whose version no longer matches is rejected, so resetting a password
 * signs out every older session. Tokens issued before this existed carry no version (= 0), so they
 * stay valid for users who have never reset.
 */
const passwordVersion = (user) => (user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0);

module.exports = { sign, verify, passwordVersion };
