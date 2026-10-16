/*
  Password rule, identical to the backend (backend/src/validators/schemas.js, PASSWORD_MIN_LENGTH).
  The server is the authority; this only gives instant feedback. Login deliberately does NOT use it,
  so accounts created under an older rule can still sign in.
*/
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RULE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

/** Returns an error message, or "" when the password is acceptable. */
export const checkNewPassword = (password) => (password.length >= PASSWORD_MIN_LENGTH ? "" : PASSWORD_RULE);
