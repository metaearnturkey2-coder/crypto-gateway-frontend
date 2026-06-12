const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const normalizeMerchantName = (name) => String(name || "").trim();

export const isValidEmail = (email) =>
  email.length > 0 &&
  email.length <= EMAIL_MAX_LENGTH &&
  EMAIL_PATTERN.test(email);
