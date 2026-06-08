import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { formatTokenAmount } from "@/lib/money";
import {
  formatDateTime,
  formatTimeLeft,
  getCheckoutUrl,
  getPaymentStatusClassName,
  getWebhookStatusClassName,
} from "@/features/merchant-payments/formatters";

export function PaymentOperationsPanel({
  confirmAction,
  copyText,
  loading,
  now,
  paymentAction,
  paymentPagination,
  payments,
  paymentSearch,
  runPaymentAction,
  setConfirmAction,
  setPaymentPage,
  setPaymentSearch,
  setStatusFilter,
  setWebhookStatusFilter,
  statusFilter,
  timeZone,
  t,
  webhookStatusFilter,
}) {
  return (
    <div className="merchant-payments-panel rounded-2xl border p-5 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t("merchantPayments.operations")}</h2>
          <p className="text-zinc-500 text-sm">
            {t("merchantPayments.showingPayments")
              .replace("{shown}", payments.length)
              .replace("{total}", paymentPagination.totalCount)}
          </p>
        </div>
        <button
          onClick={() => {
            setPaymentSearch("");
            setStatusFilter("ALL");
            setWebhookStatusFilter("ALL");
            setPaymentPage(1);
          }}
          className="operations-filter-button rounded-xl border px-4 py-2 font-semibold transition"
        >
          {t("merchantPayments.clearFilters")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder={t("merchantPayments.searchPlaceholder")}
          value={paymentSearch}
          onChange={(event) => {
            setPaymentSearch(event.target.value);
            setPaymentPage(1);
          }}
          className="operations-filter-field p-3 rounded-xl border outline-none transition"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPaymentPage(1);
          }}
          className="operations-filter-field p-3 rounded-xl border outline-none transition"
        >
          <option value="ALL">{t("merchantPayments.allPaymentStatuses")}</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={webhookStatusFilter}
          onChange={(event) => {
            setWebhookStatusFilter(event.target.value);
            setPaymentPage(1);
          }}
          className="operations-filter-field p-3 rounded-xl border outline-none transition"
        >
          <option value="ALL">{t("merchantPayments.allWebhookStatuses")}</option>
          <option value="SUCCESS">Webhook success</option>
          <option value="PENDING">Webhook pending</option>
          <option value="FAILED">Webhook failed</option>
          <option value="NONE">No webhook</option>
        </select>
      </div>

      <div className="space-y-3">
        {!loading && payments.length === 0 && <p className="text-zinc-400">{t("merchantPayments.noPayments")}</p>}

        {payments.map((payment) => (
          <PaymentOperationCard
            key={payment.id}
            confirmAction={confirmAction}
            copyText={copyText}
            now={now}
            payment={payment}
            paymentAction={paymentAction}
            runPaymentAction={runPaymentAction}
            setConfirmAction={setConfirmAction}
            timeZone={timeZone}
            t={t}
          />
        ))}
      </div>

      <div className="operations-list-footer mt-4 flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="operations-page-pill rounded-full border px-3 py-1 text-xs font-semibold">
            Page {paymentPagination.page} of {paymentPagination.totalPages}
          </span>
          <span className="operations-refresh-pill rounded-full border px-3 py-1 text-xs font-semibold">
            Auto refresh - 10s
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={() => setPaymentPage((page) => Math.max(page - 1, 1))} disabled={paymentPagination.page <= 1} className="operations-filter-button h-9 rounded-lg border px-4 text-sm font-semibold transition disabled:opacity-40">{t("merchantPayments.previous")}</button>
          <button onClick={() => setPaymentPage((page) => Math.min(page + 1, paymentPagination.totalPages))} disabled={paymentPagination.page >= paymentPagination.totalPages} className="operations-filter-button h-9 rounded-lg border px-4 text-sm font-semibold transition disabled:opacity-40">{t("merchantPayments.next")}</button>
        </div>
      </div>
    </div>
  );
}

function PaymentOperationCard({
  confirmAction,
  copyText,
  now,
  payment,
  paymentAction,
  runPaymentAction,
  setConfirmAction,
  timeZone,
  t,
}) {
  const latestWebhook = payment.webhookEvents?.[0];
  const canManagePayment = payment.status === "PENDING" && paymentAction?.paymentId !== payment.id;

  return (
    <div className="merchant-payment-card rounded-xl border p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[120px_minmax(0,1fr)_105px_minmax(280px,360px)] xl:items-center">
        <div>
          <p className="text-xl font-semibold">{formatTokenAmount(payment.amount, payment.currency)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{payment.network}</p>
        </div>
        <div className="payment-card-meta grid gap-2 text-sm">
          <div className="payment-card-info-cluster grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)]">
            <div className="payment-card-meta-row">
              <span>{t("merchantPayments.paymentId")}</span>
              <p>{payment.id}</p>
            </div>
            {payment.orderId && (
              <div className="payment-card-meta-row">
                <span>Order ID</span>
                <p>{payment.orderId}</p>
              </div>
            )}
          </div>
          <div className="payment-card-info-cluster">
            <div className="payment-card-meta-row">
              <span>Wallet</span>
              <p>{payment.walletAddress.slice(0, 10)}...{payment.walletAddress.slice(-8)}</p>
            </div>
          </div>
          <div className="payment-card-time-grid grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="payment-card-meta-row">
              <span>Created</span>
              <p>{formatDateTime(payment.createdAt, timeZone)}</p>
            </div>
            <div className="payment-card-meta-row">
              <span>Expires</span>
              <p>{formatTimeLeft(payment.expiresAt, now)}</p>
            </div>
          </div>
          {latestWebhook && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`webhook-status-badge inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(latestWebhook.status)}`}>
                Webhook: {latestWebhook.status}
              </span>
              <div className="payment-card-meta-row payment-card-attempts-row">
                <span>Attempts</span>
                <p>{latestWebhook.attempts}/{latestWebhook.maxAttempts}</p>
              </div>
            </div>
          )}
        </div>
        <div className="xl:justify-self-center">
          <span className={`payment-status-badge inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClassName(payment.status)}`}>{payment.status}</span>
        </div>
        <div className="flex flex-col gap-2 xl:items-end">
          <div className="grid w-full grid-cols-2 gap-2 xl:max-w-[320px]">
            <button onClick={() => copyText(payment.walletAddress, "Wallet address")} className="operation-action-button operation-action-muted h-8 rounded-lg border px-3 text-xs font-semibold transition">Copy Wallet</button>
            {payment.status === "PENDING" && (
              <button
                onClick={() => runPaymentAction(payment.id, "verify")}
                className="operation-action-button operation-action-success h-8 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-40"
                disabled={!canManagePayment}
              >
                {paymentAction?.paymentId === payment.id && paymentAction?.action === "verify" ? t("merchantPayments.verifying") : t("merchantPayments.verify")}
              </button>
            )}
            {payment.status === "PENDING" && (
              <button
                onClick={() => setConfirmAction({ type: "cancelPayment", paymentId: payment.id })}
                className="operation-action-button operation-action-danger h-8 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-40"
                disabled={!canManagePayment}
              >
                {t("merchantPayments.cancel")}
              </button>
            )}
            <button onClick={() => copyText(getCheckoutUrl(payment), t("merchantPayments.checkoutLink"))} className="operation-action-button operation-action-muted h-8 rounded-lg border px-3 text-xs font-semibold transition">{t("merchantPayments.copyLink")}</button>
            <a href={getCheckoutUrl(payment)} target="_blank" className="operation-action-button operation-action-secondary flex h-8 items-center justify-center rounded-lg border px-3 text-center text-xs font-semibold transition">{t("merchantPayments.checkout")}</a>
            <Link
              href={`/business-wallet/payments/${payment.id}`}
              className={`operation-action-button operation-action-details flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${payment.status === "PENDING" ? "col-span-2" : ""}`}
            >
              {t("merchantPayments.details")}
            </Link>
          </div>
          {payment.status === "PENDING" && (
            <div className="payment-card-qr hidden items-center justify-between gap-3 rounded-xl border px-3 py-1.5 xl:flex xl:max-w-[360px]">
              <div>
                <p className="text-xs font-bold uppercase">QR preview</p>
                <p className="mt-0.5 text-xs">Full payment view in Details</p>
              </div>
              <div className="rounded-lg bg-white p-1">
                <QRCodeSVG value={payment.walletAddress} size={48} />
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmAction?.type === "cancelPayment" &&
        confirmAction.paymentId === payment.id && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="mb-3">{t("merchantPayments.cancelPrompt")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runPaymentAction(payment.id, "cancel")}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
              >
                {t("merchantPayments.confirmCancel")}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
              >
                {t("merchantPayments.keepPayment")}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

