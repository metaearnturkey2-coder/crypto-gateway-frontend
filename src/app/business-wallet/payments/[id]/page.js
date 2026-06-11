"use client";

import Link from "next/link";
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
  formatTimeLeft,
  getEffectivePaymentStatus,
  getPaymentStatusClassName,
  getPaymentStatusGuidance,
  getWebhookStatusClassName,
  getWebhookStatusLabel,
  getWebhookStatusMessage,
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
  const statusGuidance = getPaymentStatusGuidance(effectiveStatus);
  const latestWebhook = webhookSummary.latest;
  const requiresAction =
    ["UNDERPAID", "EXPIRED_PAID_REVIEW"].includes(effectiveStatus) ||
    latestWebhook?.status === "FAILED";

  return (
    <OverviewShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/business-wallet/merchants" className="text-sm font-semibold text-zinc-400 hover:text-zinc-100">
              {t("merchantPayments.backToPayments")}
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold md:text-4xl">{t("merchantPayments.paymentDetails")}</h1>
              {payment && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(effectiveStatus)}`}>
                  {statusGuidance.label}
                </span>
              )}
              {payment?.mode && (
                <DashboardPill>
                  {payment.mode}
                </DashboardPill>
              )}
            </div>
            {payment && (
              <div className="mt-2 max-w-3xl space-y-1 text-sm text-zinc-500">
                <p>
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
              className="rounded-lg px-4 py-2 disabled:cursor-wait disabled:opacity-60"
            >
              {refreshing ? t("common.refreshing") : t("common.refresh")}
            </DashboardButton>
            {payment?.checkoutUrl && (
              <a
                href={payment.checkoutUrl}
                target="_blank"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-80"
              >
                {t("merchantPayments.checkout")}
              </a>
            )}
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-xl border p-4 text-sm ${
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
            <section className={`rounded-xl border p-5 ${
              requiresAction
                ? "border-amber-400/40 bg-amber-400/10"
                : effectiveStatus === "PAID"
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-zinc-800 bg-zinc-950"
            }`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {requiresAction ? t("merchantPayments.actionRequired") : t("merchantPayments.paymentDecision")}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{statusGuidance.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-zinc-300">{statusGuidance.description}</p>
                  {latestWebhook?.status === "FAILED" && (
                    <p className="mt-2 text-sm text-amber-100">
                      {t("merchantPayments.latestWebhookFailedGuidance")}
                    </p>
                  )}
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(effectiveStatus)}`}>
                  {requiresAction ? t("merchantPayments.needsAttentionStatus") : statusGuidance.label}
                </span>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <DashboardMetric>
                <p className="text-xs text-zinc-500">{t("merchantPayments.paymentId")}</p>
                <p className="mt-2 break-all font-mono text-sm">{payment.id}</p>
              </DashboardMetric>
              <DashboardMetric>
                <p className="text-xs text-zinc-500">{t("merchantPayments.timeLeft")}</p>
                <p className="mt-2 text-lg font-semibold">{formatTimeLeft(payment.expiresAt, now)}</p>
              </DashboardMetric>
              <DashboardMetric>
                <p className="text-xs text-zinc-500">{t("merchantPayments.webhookEvents")}</p>
                <p className="mt-2 text-lg font-semibold">{webhookSummary.total}</p>
              </DashboardMetric>
              <DashboardMetric>
                <p className="text-xs text-zinc-500">{t("merchantPayments.network")}</p>
                <p className="mt-2 text-lg font-semibold">{payment.network}</p>
              </DashboardMetric>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
              <aside className="space-y-5">
                <DashboardPanel className="p-5 sm:p-5">
                  <h2 className="text-xl font-bold">{t("merchantPayments.timeline")}</h2>
                  <div className="mt-4 space-y-4">
                    {(payment.timeline || []).map((item, index) => (
                      <div className="flex gap-3" key={item.id || `${item.type}-${index}`}>
                        <div className="flex flex-col items-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-bold">
                            {index + 1}
                          </span>
                          {index < (payment.timeline || []).length - 1 && <span className="mt-2 h-8 w-px bg-zinc-800" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{item.message || item.type}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(item.at, timeZone)}</p>
                        </div>
                      </div>
                    ))}
                    {!payment.timeline?.length && (
                      <p className="text-sm text-zinc-500">{t("merchantPayments.noTimelineEvents")}</p>
                    )}
                  </div>
                </DashboardPanel>

                <DashboardPanel className="p-5 sm:p-5">
                  <h2 className="text-xl font-bold">{t("merchantPayments.webhookDelivery")}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DashboardMetric className="rounded-lg bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.successful")}</p>
                      <p className="mt-1 font-semibold text-emerald-300">{webhookSummary.successful}</p>
                    </DashboardMetric>
                    <DashboardMetric className="rounded-lg bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.pending")}</p>
                      <p className="mt-1 font-semibold text-amber-200">{webhookSummary.pending}</p>
                    </DashboardMetric>
                    <DashboardMetric className="rounded-lg bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.failed")}</p>
                      <p className="mt-1 font-semibold text-rose-300">{webhookSummary.failed}</p>
                    </DashboardMetric>
                    <DashboardMetric className="rounded-lg bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.events")}</p>
                      <p className="mt-1 font-semibold">{webhookSummary.total}</p>
                    </DashboardMetric>
                  </div>
                </DashboardPanel>
              </aside>

              <div className="space-y-5">
                <DashboardPanel className="grid grid-cols-1 gap-3 p-5 sm:p-5 md:grid-cols-3">
                  <EvidenceBox label={t("merchantPayments.customer")} value={payment.customerEmail || "-"} />
                  <EvidenceBox label={t("merchantPayments.orderId")} value={payment.orderId || "-"} />
                  <EvidenceBox label={t("merchantPayments.latestWebhook")} value={latestWebhook ? getWebhookStatusLabel(latestWebhook) : t("merchantPayments.noWebhookEventsShort")} />
                </DashboardPanel>

                <DashboardPanel className="grid grid-cols-1 gap-4 p-5 sm:p-5 md:grid-cols-[150px_1fr]">
                  <div className="w-fit rounded-lg bg-white p-2">
                    <QRCodeSVG value={payment.walletAddress} size={126} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-500">{t("merchantPayments.checkoutUrl")}</p>
                    <p className="mt-1 break-all font-mono text-sm">{payment.checkoutUrl}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyText(payment.checkoutUrl, "checkout")}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-800"
                      >
                        {copiedValue?.label === "checkout" ? t("common.copied") : t("merchantPayments.copyCheckoutLink")}
                      </button>
                      <button
                        onClick={() => copyText(payment.walletAddress, "wallet")}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-800"
                      >
                        {copiedValue?.label === "wallet" ? t("common.copied") : t("checkout.copyWallet")}
                      </button>
                    </div>
                    {(copiedValue?.label === "checkout" || copiedValue?.label === "wallet") && (
                      <CopyConfirmation
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

                <DashboardPanel className="p-5 sm:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{t("merchantPayments.webhookDelivery")}</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {getWebhookStatusMessage(webhookSummary.latest)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhookSummary.latest?.status)}`}>
                      {getWebhookStatusLabel(webhookSummary.latest)}
                    </span>
                  </div>
                  {!payment.webhookEvents?.length ? (
                    <DashboardEmptyState className="mt-4 bg-black p-4">{t("merchantPayments.noWebhookEvents")}</DashboardEmptyState>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {payment.webhookEvents.map((webhook) => (
                        <div key={webhook.id} className="rounded-xl border border-zinc-800 bg-black p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>
                                  {getWebhookStatusLabel(webhook)}
                                </span>
                                <span className="text-xs text-zinc-500">{webhook.event}</span>
                              </div>
                              <p className="mt-2 break-all text-sm text-zinc-400">{webhook.url || "-"}</p>
                            </div>
                            {canRetryWebhook(webhook) ? (
                              <button
                                onClick={() => retryWebhook(webhook.id)}
                                disabled={webhookAction === webhook.id}
                                className="h-10 rounded-lg bg-amber-200 px-4 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {webhookAction === webhook.id ? t("merchantPayments.retrying") : t("merchantPayments.retryDelivery")}
                              </button>
                            ) : (
                              <span className="inline-flex h-10 items-center rounded-lg border border-zinc-800 px-4 text-xs font-semibold text-zinc-500">
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
                            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
                              <p className="font-semibold">{t("merchantPayments.lastError")}</p>
                              <p className="mt-1 break-all">{webhook.lastError}</p>
                            </div>
                          )}
                        </div>
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
    <DashboardMetric>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-2 break-all text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </DashboardMetric>
  );
}

function EvidenceBox({ label, value }) {
  return (
    <DashboardMetric className="rounded-lg bg-black p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-zinc-100">{value}</p>
    </DashboardMetric>
  );
}

function CopyConfirmation({ label, value }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
      <p className="font-semibold">{label} copied</p>
      <p className="mt-1 break-all font-mono text-emerald-50">{value}</p>
    </div>
  );
}

function WebhookMeta({ label, value }) {
  return (
    <DashboardMetric className="rounded-lg p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-zinc-100">{value}</p>
    </DashboardMetric>
  );
}
