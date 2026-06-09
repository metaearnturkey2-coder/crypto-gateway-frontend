export const CLOSED_PAYMENT_STATUSES = new Set([
  "PAID",
  "EXPIRED",
  "CANCELLED",
  "UNDERPAID",
  "EXPIRED_PAID_REVIEW",
]);

export const isExpiredPendingPayment = (payment, now = Date.now()) => {
  if (!payment || payment.status !== "PENDING" || !payment.expiresAt) return false;
  const expiresAt = new Date(payment.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
};

export const getEffectivePaymentStatus = (payment, now = Date.now()) =>
  isExpiredPendingPayment(payment, now) ? "EXPIRED" : payment?.status;
