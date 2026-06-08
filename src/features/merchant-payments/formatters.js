import { formatDashboardDateTime } from "@/lib/i18n";

export const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "FAILED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

export const getPaymentStatusClassName = (status) => {
  if (status === "PAID") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "EXPIRED" || status === "CANCELLED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
};

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
      label: "Webhook",
      className: "bg-sky-400/15 text-sky-200 border border-sky-300/30",
    };
  }
  if (action?.includes("payment")) {
    return {
      label: "Payment",
      className: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/30",
    };
  }
  if (action?.includes("api_key") || action?.includes("secret")) {
    return {
      label: "Security",
      className: "bg-red-400/15 text-red-200 border border-red-300/30",
    };
  }
  if (action?.includes("callback")) {
    return {
      label: "Settings",
      className: "bg-amber-400/15 text-amber-100 border border-amber-300/30",
    };
  }
  return {
    label: "Activity",
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
