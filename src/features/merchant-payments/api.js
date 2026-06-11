import { merchantFetch } from "@/lib/api";

export const listPayments = async ({
  needsAttention,
  page,
  search,
  status,
  webhookStatus,
  limit = 5,
}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) params.set("search", search.trim());
  if (needsAttention) params.set("needsAttention", "true");
  if (status && status !== "ALL") params.set("status", status);
  if (webhookStatus && webhookStatus !== "ALL") {
    params.set("webhookStatus", webhookStatus);
  }

  return merchantFetch(`/api/payments?${params.toString()}`);
};

export const listAuditLogs = async ({
  action,
  limit = 5,
  page,
  targetType,
}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (action && action !== "ALL") params.set("action", action);
  if (targetType && targetType !== "ALL") params.set("targetType", targetType);

  return merchantFetch(`/api/merchant/audit-logs?${params.toString()}`);
};

export const createDashboardPayment = async ({
  amount,
  customerEmail,
  orderId,
}) =>
  merchantFetch("/api/payments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      orderId: orderId || undefined,
      customerEmail: customerEmail || undefined,
    }),
  });

export const runDashboardPaymentAction = async ({ action, paymentId }) => {
  const actionPath = action === "verify" ? "verify" : "cancel";

  return merchantFetch(`/api/payments/${paymentId}/${actionPath}`, {
    method: "POST",
  });
};

export const getPaymentDetails = async (paymentId) =>
  merchantFetch(`/api/payments/${paymentId}`);

export const retryPaymentWebhook = async ({ paymentId, webhookId }) =>
  merchantFetch(`/api/payments/${paymentId}/webhooks/${webhookId}/retry`, {
    method: "POST",
  });
