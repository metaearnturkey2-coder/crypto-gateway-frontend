"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Network,
  RefreshCcw,
  ReceiptText,
  Send,
  WalletCards,
  Webhook,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { DashboardButton, DashboardEmptyState, DashboardMetric, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import { merchantFetch } from "@/lib/api";
import { useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount } from "@/lib/money";
import {
  canRetryWebhook,
  formatDateTime,
  getEffectivePaymentStatus,
  getPaymentStatusClassName,
  getPaymentStatusGuidance,
  getWebhookStatusClassName,
  getWebhookStatusLabel,
  getWebhookSummary,
} from "@/features/merchant-payments/formatters";

export default function MerchantPaymentDetailPage() {
  const params = useParams();
  const paymentId = params.id;
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [copiedValue, setCopiedValue] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [webhookAction, setWebhookAction] = useState(null);

  const fetchPayment = useCallback(async () => {
    try {
      const { body: data, ok } = await merchantFetch(`/api/payments/${paymentId}`);

      if (!ok) {
        setNotice({ type: "error", message: data.message || t("merchantPayments.detailLoadError") });
        setPayment(null);
        return;
      }

      setPayment(data.payment);
      setNotice(null);
    } catch {
      setNotice({ type: "error", message: t("merchantPayments.detailLoadError") });
    } finally {
      setLoading(false);
    }
  }, [paymentId, t]);

  const refreshPayment = async () => {
    setRefreshing(true);
    await fetchPayment();
    setRefreshing(false);
  };

  const copyText = async (value, label) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedValue({ label, value: String(value) });
    setTimeout(() => setCopiedValue(null), 1500);
  };

  const retryWebhook = async (webhookId) => {
    setWebhookAction(webhookId);
    try {
      const { body: data, ok } = await merchantFetch(`/api/payments/${paymentId}/webhooks/${webhookId}/retry`, {
        method: "POST",
      });

      if (!ok) {
        setNotice({ type: "error", message: data.message || t("merchantPayments.webhookRetryFailed") });
        return;
      }

      setNotice({ type: "success", message: data.message || t("merchantPayments.webhookRetryQueued") });
      await fetchPayment();
    } catch {
      setNotice({ type: "error", message: t("merchantPayments.webhookRetryFailed") });
    } finally {
      setWebhookAction(null);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchPayment);
  }, [fetchPayment]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const webhookSummary = useMemo(
    () => getWebhookSummary(payment?.webhookEvents || []),
    [payment?.webhookEvents]
  );
  const effectiveStatus = getEffectivePaymentStatus(payment, now);
  const baseStatusGuidance = getPaymentStatusGuidance(effectiveStatus);
  const statusGuidance = getPaymentGuidanceText(effectiveStatus, baseStatusGuidance, t);
  const latestWebhook = webhookSummary.latest;
  const requiresAction =
    ["UNDERPAID", "EXPIRED_PAID_REVIEW"].includes(effectiveStatus) ||
    latestWebhook?.status === "FAILED";

  return (
    <OverviewShell>
      <div className="mx-auto w-full max-w-[1220px] space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Link href="/business-wallet/merchants" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-100">
              <ArrowLeft size={16} strokeWidth={2.2} />
              {t("merchantPayments.backToPayments")}
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100">
                <ReceiptText size={18} strokeWidth={2.2} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("merchantPayments.paymentDetails")}</h1>
              {payment && (
                <span className={`payment-status-badge rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(effectiveStatus)}`}>
                  {statusGuidance.label}
                </span>
              )}
              {payment?.mode && <DashboardPill>{payment.mode}</DashboardPill>}
            </div>
            {payment && (
              <div className="mt-2 max-w-3xl space-y-1 text-sm text-zinc-500">
                <p className="font-semibold text-zinc-300">
                  {formatTokenAmount(payment.amount, payment.currency)}
                  {payment.orderId ? ` - ${payment.orderId}` : ""}
                </p>
                <p>{statusGuidance.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <DashboardButton
              variant="secondary"
              onClick={refreshPayment}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCcw size={15} strokeWidth={2.2} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? t("common.refreshing") : t("common.refresh")}
            </DashboardButton>
            {payment?.checkoutUrl && (
              <a
                href={payment.checkoutUrl}
                target="_blank"
                className="business-wallet-primary-button inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition"
              >
                <ExternalLink size={15} strokeWidth={2.2} />
                {t("merchantPayments.checkout")}
              </a>
            )}
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              notice.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-100"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {notice.message}
          </div>
        )}

        {loading && <DashboardEmptyState>{t("merchantPayments.loadingPaymentDetail")}</DashboardEmptyState>}

        {!loading && !payment && (
          <DashboardEmptyState className="p-6">{t("merchantPayments.detailUnavailable")}</DashboardEmptyState>
        )}

        {payment && (
          <>
            <section className={`payment-detail-decision rounded-lg border p-4 sm:p-5 ${
              requiresAction
                ? "payment-detail-decision-warning"
                : effectiveStatus === "PAID"
                  ? "payment-detail-decision-success"
                  : "payment-detail-decision-neutral"
            }`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
                    {requiresAction ? <AlertTriangle size={14} strokeWidth={2.4} /> : <Check size={14} strokeWidth={2.4} />}
                    {requiresAction ? t("merchantPayments.actionRequired") : t("merchantPayments.paymentDecision")}
                  </p>
                  <h2 className="mt-2 text-lg font-bold md:text-xl">{statusGuidance.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-zinc-300">{statusGuidance.description}</p>
                  {latestWebhook?.status === "FAILED" && (
                    <p className="payment-detail-warning-text mt-2 text-sm text-amber-100">
                      {t("merchantPayments.latestWebhookFailedGuidance")}
                    </p>
                  )}
                </div>
                <span className={`payment-status-badge w-fit rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(effectiveStatus)}`}>
                  {requiresAction ? t("merchantPayments.needsAttentionStatus") : statusGuidance.label}
                </span>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={ReceiptText} label={t("merchantPayments.paymentId")} value={payment.id} mono />
              <MetricCard icon={Clock3} label={t("merchantPayments.timeLeft")} value={formatTimeLeftText(payment.expiresAt, now, t)} />
              <MetricCard icon={Webhook} label={t("merchantPayments.webhookEvents")} value={webhookSummary.total} />
              <MetricCard icon={Network} label={t("merchantPayments.network")} value={payment.network} />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <DashboardPanel className="rounded-lg p-4 sm:p-4">
                  <h2 className="text-base font-bold">{t("merchantPayments.timeline")}</h2>
                  <div className="mt-4 space-y-4">
                    {(payment.timeline || []).map((item, index) => (
                      <div className="flex gap-3" key={item.id || `${item.type}-${index}`}>
                        <div className="flex flex-col items-center">
                          <span className="payment-detail-step flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold">
                            {index + 1}
                          </span>
                          {index < (payment.timeline || []).length - 1 && <span className="payment-detail-step-line mt-2 h-8 w-px" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.message || item.type}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(item.at, timeZone)}</p>
                        </div>
                      </div>
                    ))}
                    {!payment.timeline?.length && (
                      <p className="text-sm text-zinc-500">{t("merchantPayments.noTimelineEvents")}</p>
                    )}
                  </div>
                </DashboardPanel>

                <DashboardPanel className="rounded-lg p-4 sm:p-4">
                  <h2 className="text-base font-bold">{t("merchantPayments.webhookDelivery")}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <WebhookStat label={t("merchantPayments.successful")} value={webhookSummary.successful} tone="success" />
                    <WebhookStat label={t("merchantPayments.pending")} value={webhookSummary.pending} tone="pending" />
                    <WebhookStat label={t("merchantPayments.failed")} value={webhookSummary.failed} tone="failed" />
                    <WebhookStat label={t("merchantPayments.events")} value={webhookSummary.total} />
                  </div>
                </DashboardPanel>
              </aside>

              <div className="space-y-4">
                <DashboardPanel className="grid grid-cols-1 gap-3 rounded-lg p-4 sm:p-4 md:grid-cols-3">
                  <EvidenceBox label={t("merchantPayments.customer")} value={payment.customerEmail || "-"} />
                  <EvidenceBox label={t("merchantPayments.orderId")} value={payment.orderId || "-"} />
                  <EvidenceBox label={t("merchantPayments.latestWebhook")} value={latestWebhook ? getWebhookLabel(latestWebhook, t) : t("merchantPayments.noWebhookEventsShort")} />
                </DashboardPanel>

                <DashboardPanel className="grid grid-cols-1 gap-4 rounded-lg p-4 sm:p-4 md:grid-cols-[148px_minmax(0,1fr)]">
                  <div className="payment-detail-qr w-fit rounded-lg border bg-white p-2">
                    <QRCodeSVG value={payment.walletAddress} size={124} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-500">{t("merchantPayments.checkoutUrl")}</p>
                    <p className="mt-1 break-all font-mono text-sm">{payment.checkoutUrl}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyText(payment.checkoutUrl, "checkout")}
                        className="operation-action-button operation-action-secondary inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition"
                      >
                        {copiedValue?.label === "checkout" ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.2} />}
                        {copiedValue?.label === "checkout" ? t("common.copied") : t("merchantPayments.copyCheckoutLink")}
                      </button>
                      <button
                        onClick={() => copyText(payment.walletAddress, "wallet")}
                        className="operation-action-button operation-action-secondary inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition"
                      >
                        {copiedValue?.label === "wallet" ? <Check size={14} strokeWidth={2.4} /> : <WalletCards size={14} strokeWidth={2.2} />}
                        {copiedValue?.label === "wallet" ? t("common.copied") : t("checkout.copyWallet")}
                      </button>
                    </div>
                    {(copiedValue?.label === "checkout" || copiedValue?.label === "wallet") && (
                      <CopyConfirmation
                        copiedText={t("common.copied")}
                        label={copiedValue.label === "checkout" ? t("merchantPayments.checkoutUrl") : t("merchantPayments.walletAddress")}
                        value={copiedValue.value}
                      />
                    )}
                  </div>
                </DashboardPanel>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DetailBox label={t("merchantPayments.orderId")} value={payment.orderId || "-"} />
                  <DetailBox label={t("security.currentMode")} value={payment.mode || "LIVE"} />
                  <DetailBox label={t("merchantPayments.customer")} value={payment.customerEmail || "-"} />
                  <DetailBox label={t("merchantPayments.walletAddress")} value={payment.walletAddress} mono />
                  <DetailBox label={t("merchantPayments.txHash")} value={payment.txHash || t("merchantPayments.notConfirmed")} mono />
                  <DetailBox label={t("merchantPayments.created")} value={formatDateTime(payment.createdAt, timeZone)} />
                  <DetailBox label={t("merchantPayments.expires")} value={formatDateTime(payment.expiresAt, timeZone)} />
                </div>

                <DashboardPanel className="rounded-lg p-4 sm:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-2 text-base font-bold">
                        <Webhook size={17} strokeWidth={2.2} />
                        {t("merchantPayments.webhookDelivery")}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {getWebhookMessage(webhookSummary.latest, t)}
                      </p>
                    </div>
                    <span className={`webhook-status-badge ${getWebhookToneClass(webhookSummary.latest?.status)} w-fit rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhookSummary.latest?.status)}`}>
                      {getWebhookLabel(webhookSummary.latest, t)}
                    </span>
                  </div>
                  {!payment.webhookEvents?.length ? (
                    <DashboardEmptyState className="mt-4 rounded-lg p-4">{t("merchantPayments.noWebhookEvents")}</DashboardEmptyState>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {payment.webhookEvents.map((webhook) => (
                        <WebhookEventCard
                          key={webhook.id}
                          retryWebhook={retryWebhook}
                          timeZone={timeZone}
                          t={t}
                          webhook={webhook}
                          webhookAction={webhookAction}
                        />
                      ))}
                    </div>
                  )}
                </DashboardPanel>
              </div>
            </section>
          </>
        )}
      </div>
    </OverviewShell>
  );
}

function DetailBox({ label, value, mono = false }) {
  return (
    <DashboardMetric className="rounded-lg">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className={`mt-2 break-all text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </DashboardMetric>
  );
}

function EvidenceBox({ label, value }) {
  return (
    <DashboardMetric className="payment-detail-submetric rounded-lg p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold">{value}</p>
    </DashboardMetric>
  );
}

function MetricCard({ icon: Icon, label, value, mono = false }) {
  return (
    <DashboardMetric className="rounded-lg">
      <div className="flex items-start gap-3">
        <span className="payment-detail-metric-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
          <p className={`mt-1 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
        </div>
      </div>
    </DashboardMetric>
  );
}

function CopyConfirmation({ copiedText, label, value }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
      <p className="font-semibold">{label}: {copiedText}</p>
      <p className="mt-1 break-all font-mono text-emerald-50">{value}</p>
    </div>
  );
}

function WebhookStat({ label, value, tone }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "pending"
        ? "text-amber-200"
        : tone === "failed"
          ? "text-rose-300"
          : "";

  return (
    <DashboardMetric className="payment-detail-submetric rounded-lg p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 font-semibold ${toneClass}`}>{value}</p>
    </DashboardMetric>
  );
}

function WebhookEventCard({ retryWebhook, timeZone, t, webhook, webhookAction }) {
  return (
    <div className="merchant-payment-card rounded-lg border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`webhook-status-badge ${getWebhookToneClass(webhook.status)} rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>
              {getWebhookLabel(webhook, t)}
            </span>
            <span className="text-xs text-zinc-500">{webhook.event}</span>
          </div>
          <p className="mt-2 break-all text-sm text-zinc-400">{webhook.url || "-"}</p>
        </div>
        {canRetryWebhook(webhook) ? (
          <button
            onClick={() => retryWebhook(webhook.id)}
            disabled={webhookAction === webhook.id}
            className="operation-action-button operation-action-success inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={14} strokeWidth={2.2} />
            {webhookAction === webhook.id ? t("merchantPayments.retrying") : t("merchantPayments.retryDelivery")}
          </button>
        ) : (
          <span className="operation-action-button operation-action-muted inline-flex h-10 items-center rounded-lg border px-4 text-xs font-semibold">
            {t("merchantPayments.noAction")}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-4">
        <WebhookMeta label={t("merchantPayments.attempts")} value={`${webhook.attempts}/${webhook.maxAttempts}`} />
        <WebhookMeta label={t("merchantPayments.lastStatus")} value={webhook.lastStatusCode || "-"} />
        <WebhookMeta label={t("merchantPayments.nextRetry")} value={formatDateTime(webhook.nextRetryAt, timeZone)} />
        <WebhookMeta label={t("merchantPayments.delivered")} value={formatDateTime(webhook.deliveredAt, timeZone)} />
      </div>

      {webhook.lastError && (
        <div className="payment-detail-error mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
          <p className="font-semibold">{t("merchantPayments.lastError")}</p>
          <p className="mt-1 break-all">{webhook.lastError}</p>
        </div>
      )}
    </div>
  );
}

function WebhookMeta({ label, value }) {
  return (
    <DashboardMetric className="payment-detail-submetric rounded-lg p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-semibold">{value}</p>
    </DashboardMetric>
  );
}

function getPaymentGuidanceText(status, fallback, t) {
  const guidanceKeys = {
    CANCELLED: ["merchantPayments.statusCancelled", "merchantPayments.statusCancelledTitle", "merchantPayments.statusCancelledDescription"],
    CONFIRMING: ["merchantPayments.statusConfirming", "merchantPayments.statusConfirmingTitle", "merchantPayments.statusConfirmingDescription"],
    EXPIRED: ["merchantPayments.statusExpired", "merchantPayments.statusExpiredTitle", "merchantPayments.statusExpiredDescription"],
    EXPIRED_PAID_REVIEW: ["merchantPayments.statusReview", "merchantPayments.statusReviewTitle", "merchantPayments.statusReviewDescription"],
    PAID: ["merchantPayments.statusPaid", "merchantPayments.statusPaidTitle", "merchantPayments.statusPaidDescription"],
    PENDING: ["merchantPayments.statusPending", "merchantPayments.statusPendingTitle", "merchantPayments.statusPendingDescription"],
    UNDERPAID: ["merchantPayments.statusUnderpaid", "merchantPayments.statusUnderpaidTitle", "merchantPayments.statusUnderpaidDescription"],
  };
  const keys = guidanceKeys[status] || guidanceKeys.PENDING;

  return {
    label: t(keys[0]) || fallback.label,
    title: t(keys[1]) || fallback.title,
    description: t(keys[2]) || fallback.description,
  };
}

function getWebhookLabel(webhook, t) {
  if (!webhook) return t("merchantPayments.webhookStatusNone");
  if (webhook.status === "SUCCESS") return t("merchantPayments.webhookStatusSuccess");
  if (webhook.status === "FAILED") return t("merchantPayments.webhookStatusFailed");
  if (webhook.status === "PENDING") return t("merchantPayments.webhookStatusPending");
  return getWebhookStatusLabel(webhook);
}

function getWebhookMessage(webhook, t) {
  if (!webhook) return t("merchantPayments.webhookNoDelivery");
  if (webhook.status === "SUCCESS") return t("merchantPayments.webhookDeliveredShort");
  if (webhook.status === "FAILED") return t("merchantPayments.webhookFailedShort");
  return t("merchantPayments.webhookPendingShort");
}

function getWebhookToneClass(status) {
  if (status === "SUCCESS") return "webhook-status-success";
  if (status === "FAILED") return "webhook-status-failed";
  if (status === "PENDING") return "webhook-status-pending";
  return "webhook-status-none";
}

function formatTimeLeftText(expiresAt, now, t) {
  if (!expiresAt) return t("checkout.noExpiration");
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return t("checkout.expired");
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
