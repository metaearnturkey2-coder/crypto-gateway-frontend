"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import OverviewShell from "@/components/overview-shell";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount } from "@/lib/money";

const getPaymentStatusClassName = (status) => {
  if (status === "PAID") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "EXPIRED" || status === "CANCELLED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  if (status === "UNDERPAID") return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
  if (status === "EXPIRED_PAID_REVIEW") return "bg-sky-400/20 text-sky-200 border border-sky-300/40";
  return "bg-yellow-400/20 text-yellow-100 border border-yellow-300/40";
};

const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "FAILED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

const formatDateTime = (value, timeZone) => {
  if (!value) return "-";
  return formatDashboardDateTime(value, timeZone);
};

const getTimeLeft = (expiresAt, now) => {
  if (!expiresAt) return "No expiration";
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "Expired";
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const getWebhookSummary = (events = []) => ({
  total: events.length,
  successful: events.filter((event) => event.status === "SUCCESS").length,
  pending: events.filter((event) => event.status === "PENDING").length,
  failed: events.filter((event) => event.status === "FAILED").length,
});

const canRetryWebhook = (webhook) =>
  webhook &&
  webhook.status !== "SUCCESS" &&
  Number(webhook.attempts || 0) < Number(webhook.maxAttempts || 0);

export default function MerchantPaymentDetailPage() {
  const params = useParams();
  const paymentId = params.id;
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [copiedLabel, setCopiedLabel] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [webhookAction, setWebhookAction] = useState(null);

  const fetchPayment = useCallback(async () => {
    try {
      const { body: data, ok } = await merchantFetch(`/api/payments/${paymentId}`);

      if (!ok) {
        setNotice({ type: "error", message: data.message || "Payment detail could not be loaded." });
        setPayment(null);
        return;
      }

      setPayment(data.payment);
      setNotice(null);
    } catch {
      setNotice({ type: "error", message: "Payment detail could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const refreshPayment = async () => {
    setRefreshing(true);
    await fetchPayment();
    setRefreshing(false);
  };

  const copyText = async (value, label) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(""), 1500);
  };

  const retryWebhook = async (webhookId) => {
    setWebhookAction(webhookId);
    try {
      const { body: data, ok } = await merchantFetch(`/api/payments/${paymentId}/webhooks/${webhookId}/retry`, {
        method: "POST",
      });

      if (!ok) {
        setNotice({ type: "error", message: data.message || "Webhook retry failed." });
        return;
      }

      setNotice({ type: "success", message: data.message || "Webhook retry queued." });
      await fetchPayment();
    } catch {
      setNotice({ type: "error", message: "Webhook retry failed." });
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

  return (
    <OverviewShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/business-wallet/merchants" className="text-sm font-semibold text-zinc-400 hover:text-zinc-100">
              Back to payments
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold md:text-4xl">{t("merchantPayments.paymentDetails")}</h1>
              {payment && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(payment.status)}`}>
                  {payment.status}
                </span>
              )}
              {payment?.mode && (
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {payment.mode}
                </span>
              )}
            </div>
            {payment && (
              <p className="mt-2 text-sm text-zinc-500">
                {formatTokenAmount(payment.amount, payment.currency)}
                {payment.orderId ? ` - ${payment.orderId}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshPayment}
              disabled={refreshing}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
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

        {loading && <p className="text-zinc-400">Loading payment detail...</p>}

        {!loading && !payment && (
          <div className="rounded-xl border border-zinc-800 p-6 text-zinc-400">
            Payment detail was not found or cannot be displayed.
          </div>
        )}

        {payment && (
          <>
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">{t("merchantPayments.paymentId")}</p>
                <p className="mt-2 break-all font-mono text-sm">{payment.id}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">{t("merchantPayments.timeLeft")}</p>
                <p className="mt-2 text-lg font-semibold">{getTimeLeft(payment.expiresAt, now)}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">{t("merchantPayments.webhookEvents")}</p>
                <p className="mt-2 text-lg font-semibold">{webhookSummary.total}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">{t("merchantPayments.network")}</p>
                <p className="mt-2 text-lg font-semibold">{payment.network}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
              <aside className="space-y-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
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
                      <p className="text-sm text-zinc-500">No timeline events recorded yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                  <h2 className="text-xl font-bold">{t("merchantPayments.webhookDelivery")}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-zinc-800 bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.successful")}</p>
                      <p className="mt-1 font-semibold text-emerald-300">{webhookSummary.successful}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.pending")}</p>
                      <p className="mt-1 font-semibold text-amber-200">{webhookSummary.pending}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.failed")}</p>
                      <p className="mt-1 font-semibold text-rose-300">{webhookSummary.failed}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-3">
                      <p className="text-xs text-zinc-500">{t("merchantPayments.events")}</p>
                      <p className="mt-1 font-semibold">{webhookSummary.total}</p>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:grid-cols-[150px_1fr]">
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
                        {copiedLabel === "checkout" ? "Copied" : t("merchantPayments.copyCheckoutLink")}
                      </button>
                      <button
                        onClick={() => copyText(payment.walletAddress, "wallet")}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-800"
                      >
                        {copiedLabel === "wallet" ? "Copied" : t("checkout.copyWallet")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DetailBox label={t("merchantPayments.orderId")} value={payment.orderId || "-"} />
                  <DetailBox label={t("security.currentMode")} value={payment.mode || "LIVE"} />
                  <DetailBox label={t("merchantPayments.customer")} value={payment.customerEmail || "-"} />
                  <DetailBox label={t("merchantPayments.walletAddress")} value={payment.walletAddress} mono />
                  <DetailBox label={t("merchantPayments.txHash")} value={payment.txHash || t("merchantPayments.notConfirmed")} mono />
                  <DetailBox label={t("merchantPayments.created")} value={formatDateTime(payment.createdAt, timeZone)} />
                  <DetailBox label={t("merchantPayments.expires")} value={formatDateTime(payment.expiresAt, timeZone)} />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                  <h2 className="text-xl font-bold">{t("merchantPayments.webhookDelivery")}</h2>
                  {!payment.webhookEvents?.length ? (
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                      {t("merchantPayments.noWebhookEvents")}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {payment.webhookEvents.map((webhook) => (
                        <div key={webhook.id} className="rounded-xl border border-zinc-800 bg-black p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>
                                  {webhook.status}
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
                </div>
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-2 break-all text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function WebhookMeta({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
