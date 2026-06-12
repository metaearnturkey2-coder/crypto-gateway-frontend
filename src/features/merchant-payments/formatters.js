import { formatDashboardDateTime } from "@/lib/i18n";
import {
  getEffectivePaymentStatus,
  isExpiredPendingPayment,
} from "@/lib/payment-status";

export {
  getEffectivePaymentStatus,
  isExpiredPendingPayment,
};

export const MERCHANT_PAYMENT_STATUS_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Underpaid", value: "UNDERPAID" },
  { label: "Expired paid review", value: "EXPIRED_PAID_REVIEW" },
  { label: "Confirming", value: "CONFIRMING" },
];

export const WEBHOOK_STATUS_OPTIONS = [
  { label: "Webhook success", value: "SUCCESS" },
  { label: "Webhook pending", value: "PENDING" },
  { label: "Webhook failed", value: "FAILED" },
  { label: "No webhook", value: "NONE" },
];

export const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "FAILED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  if (status === "PENDING") return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

export const getWebhookStatusLabel = (webhook) => webhook?.status || "NO EVENTS";

export const getWebhookStatusDescription = (webhook) => {
  if (!webhook) return "No webhook delivery has been recorded.";
  if (webhook.status === "SUCCESS") return "Delivered";
  if (webhook.status === "FAILED") return "Failed";
  return "Pending retry";
};

export const getPaymentStatusClassName = (status) => {
  if (status === "PAID") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "EXPIRED" || status === "CANCELLED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  if (status === "UNDERPAID") return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
  if (status === "EXPIRED_PAID_REVIEW" || status === "CONFIRMING") {
    return "bg-sky-400/20 text-sky-200 border border-sky-300/40";
  }
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
};

export const getPaymentStatusGuidance = (status) => {
  if (status === "PAID") {
    return {
      label: "Paid",
      title: "Payment confirmed",
      description: "Funds are confirmed and the payment can be fulfilled.",
    };
  }

  if (status === "EXPIRED") {
    return {
      label: "Expired",
      title: "Payment window closed",
      description: "Do not ask the customer to send funds to this checkout. Create a new payment link if needed.",
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      title: "Payment was cancelled",
      description: "This checkout no longer accepts payment. Share a new checkout link if the order should continue.",
    };
  }

  if (status === "UNDERPAID") {
    return {
      label: "Underpaid",
      title: "Manual review needed",
      description: "The detected transfer is below the required amount. Review the tx before fulfilling the order.",
    };
  }

  if (status === "EXPIRED_PAID_REVIEW") {
    return {
      label: "Review",
      title: "Late payment detected",
      description: "Funds arrived after expiry. Review the payment before settlement or fulfillment.",
    };
  }

  if (status === "CONFIRMING") {
    return {
      label: "Confirming",
      title: "Network confirmation pending",
      description: "A transfer was detected and is waiting for confirmation.",
    };
  }

  return {
    label: "Pending",
    title: "Awaiting customer payment",
    description: "The checkout is still open. Customer should send the exact amount before expiry.",
  };
};

export const getPaymentStatusCounts = (payments = [], now = Date.now(), fallbackStats = {}) =>
  payments.reduce(
    (counts, payment) => {
      const status = getEffectivePaymentStatus(payment, now);

      return {
        total: counts.total,
        paid: counts.paid + (status === "PAID" ? 1 : 0),
        pending: counts.pending + (status === "PENDING" ? 1 : 0),
        expired: counts.expired + (status === "EXPIRED" || status === "CANCELLED" ? 1 : 0),
      };
    },
    {
      total: fallbackStats.total ?? payments.length,
      paid: 0,
      pending: 0,
      expired: 0,
    }
  );

export const formatTimeLeft = (expiresAt, now) => {
  if (!expiresAt) return "No expiration";
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "Expired";
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

export const formatDateTime = (value, timeZone) => {
  if (!value) return "-";
  return formatDashboardDateTime(value, timeZone);
};

export const getCheckoutUrl = (payment) => payment.checkoutUrl || `/pay/${payment.id}`;

export const canRetryWebhook = (webhook) =>
  webhook &&
  webhook.status !== "SUCCESS" &&
  Number(webhook.attempts || 0) < Number(webhook.maxAttempts || 0);

export const getWebhookSummary = (events = []) => {
  const latest = events[0] || null;
  const successful = events.filter((event) => event.status === "SUCCESS").length;
  const failed = events.filter((event) => event.status === "FAILED").length;
  const pending = events.filter((event) => event.status === "PENDING").length;

  return {
    latest,
    successful,
    failed,
    pending,
    total: events.length,
  };
};

export const getWebhookStatusMessage = (webhook) => {
  if (!webhook) return "No delivery attempts recorded yet.";
  if (webhook.status === "SUCCESS") return "Delivered to the merchant callback URL.";
  if (webhook.status === "FAILED") return "Delivery failed after the available attempts.";
  return "Delivery is pending or waiting for retry.";
};

export const getActivityMeta = (action) => {
  if (action?.includes("webhook")) {
    return {
      labelKey: "merchantPayments.activityWebhook",
      className: "bg-sky-400/15 text-sky-200 border border-sky-300/30",
    };
  }
  if (action?.includes("payment")) {
    return {
      labelKey: "merchantPayments.activityPayment",
      className: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/30",
    };
  }
  if (action?.includes("api_key") || action?.includes("secret")) {
    return {
      labelKey: "merchantPayments.activitySecurity",
      className: "bg-red-400/15 text-red-200 border border-red-300/30",
    };
  }
  if (action?.includes("callback")) {
    return {
      labelKey: "merchantPayments.activitySettings",
      className: "bg-amber-400/15 text-amber-100 border border-amber-300/30",
    };
  }
  return {
    labelKey: "merchantPayments.activityGeneric",
    className: "bg-zinc-700/50 text-zinc-100 border border-zinc-500/40",
  };
};

export const formatActivityAction = (action) =>
  String(action || "activity")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

export const formatMetadataValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
