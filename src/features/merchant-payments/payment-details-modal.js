import { QRCodeSVG } from "qrcode.react";
import { formatTokenAmount } from "@/lib/money";
import {
  canRetryWebhook,
  formatDateTime,
  formatTimeLeft,
  getCheckoutUrl,
  getPaymentStatusClassName,
  getWebhookStatusClassName,
  getWebhookStatusMessage,
  getWebhookSummary,
} from "@/features/merchant-payments/formatters";

export function PaymentDetailsModal({
  confirmAction,
  copyText,
  now,
  onClose,
  paymentAction,
  retryWebhook,
  runPaymentAction,
  selectedPayment,
  setConfirmAction,
  setConfirmActionEmpty,
  timeZone,
  t,
  verificationResult,
  webhookAction,
}) {
  if (!selectedPayment) {
    return null;
  }

  const webhookSummary = getWebhookSummary(selectedPayment.webhookEvents || []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h2 className="text-4xl font-bold">{t("merchantPayments.paymentDetails")}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(selectedPayment.status)}`}>
                {selectedPayment.status}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              {formatTokenAmount(selectedPayment.amount, selectedPayment.currency)}
              {selectedPayment.orderId ? ` - ${selectedPayment.orderId}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runPaymentAction(selectedPayment.id, "verify")}
              disabled={selectedPayment.status !== "PENDING" || paymentAction?.paymentId === selectedPayment.id}
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black disabled:opacity-40"
            >
              {paymentAction?.paymentId === selectedPayment.id && paymentAction?.action === "verify" ? t("merchantPayments.verifying") : t("merchantPayments.verifyNow")}
            </button>
            <button
              onClick={() => setConfirmAction({ type: "cancelPayment", paymentId: selectedPayment.id })}
              disabled={selectedPayment.status !== "PENDING" || paymentAction?.paymentId === selectedPayment.id}
              className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-black disabled:opacity-40"
            >
              {t("merchantPayments.cancel")}
            </button>
            <button onClick={() => copyText(getCheckoutUrl(selectedPayment), t("merchantPayments.checkoutLink"))} className="rounded-lg bg-zinc-800 px-4 py-2 font-semibold">{t("merchantPayments.copyLink")}</button>
            <a href={getCheckoutUrl(selectedPayment)} target="_blank" className="rounded-lg bg-white px-4 py-2 font-semibold text-black">{t("merchantPayments.checkout")}</a>
            <button onClick={onClose} className="rounded-lg bg-zinc-800 px-4 py-2 font-semibold">{t("merchantPayments.close")}</button>
          </div>
        </div>

        {confirmAction?.type === "cancelPayment" &&
          confirmAction.paymentId === selectedPayment.id && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="mb-3">{t("merchantPayments.cancelPrompt")}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => runPaymentAction(selectedPayment.id, "cancel")}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  {t("merchantPayments.confirmCancel")}
                </button>
                <button
                  onClick={setConfirmActionEmpty}
                  className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  {t("merchantPayments.keepPayment")}
                </button>
              </div>
            </div>
          )}

        {verificationResult?.paymentId === selectedPayment.id && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              verificationResult.type === "underpaid"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            <p className="font-semibold">
              {verificationResult.type === "underpaid"
                ? t("merchantPayments.underpaid")
                : t("merchantPayments.verificationSucceeded")}
            </p>
            {verificationResult.type === "underpaid" ? (
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <p>{t("merchantPayments.received")}: {verificationResult.amountReceived} USDT</p>
                <p>{t("merchantPayments.missing")}: {verificationResult.amountMissing} USDT</p>
                <p className="break-all">Tx: {verificationResult.txHash}</p>
              </div>
            ) : (
              <p className="mt-2 break-all">Tx: {verificationResult.txHash || "-"}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-4 text-2xl font-bold">{t("merchantPayments.timeline")}</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{t("merchantPayments.created")}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(selectedPayment.createdAt, timeZone)}</p>
                </div>
                <div>
                  <p className="font-semibold">{t("merchantPayments.awaitingPayment")}</p>
                  <p className="text-xs text-zinc-500">{t("merchantPayments.expires")} {formatDateTime(selectedPayment.expiresAt, timeZone)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-3 text-2xl font-bold">{t("merchantPayments.operationSummary")}</h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p><span className="text-zinc-500">{t("merchantPayments.timeLeft")}:</span> {formatTimeLeft(selectedPayment.expiresAt, now)}</p>
                <p><span className="text-zinc-500">{t("merchantPayments.webhookEvents")}:</span> {selectedPayment.webhookEvents?.length || 0}</p>
                <p><span className="text-zinc-500">{t("merchantPayments.network")}:</span> {selectedPayment.network}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[160px_1fr]">
              <div className="w-fit rounded-lg bg-white p-1">
                <QRCodeSVG value={selectedPayment.walletAddress} size={120} />
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("merchantPayments.checkoutUrl")}</p>
                <p className="mt-1 break-all">{getCheckoutUrl(selectedPayment)}</p>
                <button
                  onClick={() => copyText(getCheckoutUrl(selectedPayment), t("merchantPayments.checkoutLink"))}
                  className="mt-3 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  {t("merchantPayments.copyCheckoutLink")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{t("merchantPayments.paymentId")}</p><p className="break-all">{selectedPayment.id}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{t("merchantPayments.orderId")}</p><p>{selectedPayment.orderId || "-"}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{t("merchantPayments.customer")}</p><p className="break-all">{selectedPayment.customerEmail || "-"}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{t("merchantPayments.walletAddress")}</p><p className="break-all">{selectedPayment.walletAddress}</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2"><p className="text-xs text-zinc-500">{t("merchantPayments.txHash")}</p><p className="break-all">{selectedPayment.txHash || t("merchantPayments.notConfirmed")}</p></div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{t("merchantPayments.webhookDelivery")}</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {getWebhookStatusMessage(webhookSummary.latest)}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  webhookSummary.latest
                    ? getWebhookStatusClassName(webhookSummary.latest.status)
                    : "border border-zinc-700 bg-zinc-950 text-zinc-400"
                }`}>
                  {webhookSummary.latest?.status || "NO EVENTS"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <WebhookMetric label={t("merchantPayments.events")} value={webhookSummary.total} />
                <WebhookMetric label={t("merchantPayments.successful")} value={webhookSummary.successful} className="text-emerald-300" />
                <WebhookMetric label={t("merchantPayments.pending")} value={webhookSummary.pending} className="text-amber-200" />
                <WebhookMetric label={t("merchantPayments.failed")} value={webhookSummary.failed} className="text-rose-300" />
              </div>

              {!selectedPayment.webhookEvents?.length ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                  {t("merchantPayments.noWebhookEvents")}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedPayment.webhookEvents.map((webhook) => (
                    <WebhookEventCard
                      key={webhook.id}
                      paymentId={selectedPayment.id}
                      retryWebhook={retryWebhook}
                      timeZone={timeZone}
                      t={t}
                      webhook={webhook}
                      webhookAction={webhookAction}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookMetric({ className = "", label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}

function WebhookEventCard({ paymentId, retryWebhook, timeZone, t, webhook, webhookAction }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>{webhook.status}</span>
            <span className="text-xs text-zinc-500">{webhook.event}</span>
          </div>
          <p className="mt-2 break-all text-sm text-zinc-400">{webhook.url || "No callback URL recorded"}</p>
        </div>
        {canRetryWebhook(webhook) ? (
          <button
            onClick={() => retryWebhook(paymentId, webhook.id)}
            disabled={webhookAction?.webhookId === webhook.id}
            className="h-10 rounded-lg bg-amber-200 px-4 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {webhookAction?.webhookId === webhook.id ? t("merchantPayments.retrying") : t("merchantPayments.retryDelivery")}
          </button>
        ) : (
          <span className="inline-flex h-10 items-center rounded-lg border border-zinc-800 px-4 text-xs font-semibold text-zinc-500">
            {t("merchantPayments.noAction")}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-4">
        <WebhookDetail label={t("merchantPayments.attempts")} value={`${webhook.attempts}/${webhook.maxAttempts}`} />
        <WebhookDetail label={t("merchantPayments.lastStatus")} value={webhook.lastStatusCode || "-"} />
        <WebhookDetail label={t("merchantPayments.nextRetry")} value={formatDateTime(webhook.nextRetryAt, timeZone)} />
        <WebhookDetail label={t("merchantPayments.delivered")} value={formatDateTime(webhook.deliveredAt, timeZone)} />
      </div>

      {webhook.lastError && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
          <p className="font-semibold">{t("merchantPayments.lastError")}</p>
          <p className="mt-1 break-all">{webhook.lastError}</p>
        </div>
      )}
    </div>
  );
}

function WebhookDetail({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

