"use client";

import { formatDashboardDateTime } from "@/lib/i18n";
import { formatTokenAmount } from "@/lib/money";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardInput,
  DashboardMetric,
  DashboardPanel,
  DashboardPill,
} from "@/components/dashboard-ui";

export function PaymentOverviewPanel({ paymentStats, t }) {
  return (
    <DashboardPanel>
      <h2 className="mb-1 text-xl font-semibold sm:text-[22px]">{t("businessWallet.overview")}</h2>
      <p className="mb-4 text-sm text-zinc-500">{t("businessWallet.snapshot")}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric><p className="text-sm text-zinc-500">{t("businessWallet.totalPayments")}</p><p className="text-2xl font-bold">{paymentStats.total}</p></DashboardMetric>
        <DashboardMetric><p className="text-sm text-zinc-500">{t("businessWallet.paidPayments")}</p><p className="text-2xl font-bold">{paymentStats.paid}</p></DashboardMetric>
        <DashboardMetric><p className="text-sm text-zinc-500">{t("businessWallet.pendingPayments")}</p><p className="text-2xl font-bold">{paymentStats.pending}</p></DashboardMetric>
        <DashboardMetric><p className="text-sm text-zinc-500">{t("businessWallet.expiredPayments")}</p><p className="text-2xl font-bold">{paymentStats.expired}</p></DashboardMetric>
      </div>
    </DashboardPanel>
  );
}

export function FinancePayoutPanel({
  addPayoutAddress,
  amount,
  createPayoutRequest,
  isPayoutAddressActive,
  MIN_PAYOUT_AMOUNT,
  note,
  payoutAddressLabel,
  payoutAddresses,
  payoutAvailability,
  payoutStatusClass,
  payoutSubmitDisabled,
  setAmount,
  setNote,
  setPayoutAddressLabel,
  setWalletAddress,
  setWhitelistAddress,
  settlements,
  t,
  timeZone,
  walletAddress,
  whitelistAddress,
  whitelisting,
}) {
  return (
    <DashboardPanel className="p-4 sm:p-4">
      <div className="mb-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-[22px]">{t("businessWallet.finance")}</h2>
          <p className="text-sm text-zinc-500">{t("businessWallet.financeDescription")}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-4">
        <DashboardMetric className="py-2.5"><p className="text-xs text-zinc-500">{t("overview.available")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.available, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="py-2.5"><p className="text-xs text-zinc-500">{t("overview.pending")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.pendingBalance, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="py-2.5"><p className="text-xs text-zinc-500">{t("overview.grossPaid")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.grossPaid, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="py-2.5"><p className="text-xs text-zinc-500">{t("overview.reserved")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.reservedForPayouts, settlements.summary.currency)}</p></DashboardMetric>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-4">
        <DashboardMetric className="py-2.5">
          <p className="text-xs text-zinc-500">{t("businessWallet.maxWithdrawable")}</p>
          <p className="break-words text-lg font-bold">{formatTokenAmount(payoutAvailability.maxWithdrawable, settlements.summary.currency)}</p>
          <p className="text-[11px] text-zinc-500">{t("businessWallet.balanceBound")}</p>
        </DashboardMetric>
        <DashboardMetric className="py-2.5">
          <p className="text-xs text-zinc-500">{t("businessWallet.perTransactionLimit")}</p>
          <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.perTransactionLimit, settlements.payoutLimits?.currency || "USDT")}</p>
        </DashboardMetric>
        <DashboardMetric className="py-2.5">
          <p className="text-xs text-zinc-500">{t("businessWallet.dailyRemaining")}</p>
          <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.dailyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
          <p className="text-[11px] text-zinc-500">{t("businessWallet.used")} {formatTokenAmount(settlements.payoutLimits?.dailyUsed, settlements.payoutLimits?.currency || "USDT")}</p>
        </DashboardMetric>
        <DashboardMetric className="py-2.5">
          <p className="text-xs text-zinc-500">{t("businessWallet.weeklyRemaining")}</p>
          <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.weeklyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
          <p className="text-[11px] text-zinc-500">{t("businessWallet.used")} {formatTokenAmount(settlements.payoutLimits?.weeklyUsed, settlements.payoutLimits?.currency || "USDT")}</p>
        </DashboardMetric>
      </div>

      <PayoutRequestForm
        amount={amount}
        createPayoutRequest={createPayoutRequest}
        isPayoutAddressActive={isPayoutAddressActive}
        MIN_PAYOUT_AMOUNT={MIN_PAYOUT_AMOUNT}
        note={note}
        payoutAddresses={payoutAddresses}
        payoutAvailability={payoutAvailability}
        payoutSubmitDisabled={payoutSubmitDisabled}
        setAmount={setAmount}
        setNote={setNote}
        setWalletAddress={setWalletAddress}
        settlements={settlements}
        t={t}
        walletAddress={walletAddress}
      />

      <PayoutAddressWhitelistPanel
        addPayoutAddress={addPayoutAddress}
        isPayoutAddressActive={isPayoutAddressActive}
        payoutAddressLabel={payoutAddressLabel}
        payoutAddresses={payoutAddresses}
        setPayoutAddressLabel={setPayoutAddressLabel}
        setWalletAddress={setWalletAddress}
        setWhitelistAddress={setWhitelistAddress}
        whitelistAddress={whitelistAddress}
        whitelisting={whitelisting}
      />

      <PayoutHistoryList
        payoutRequests={settlements.payoutRequests}
        payoutStatusClass={payoutStatusClass}
        t={t}
        timeZone={timeZone}
      />
    </DashboardPanel>
  );
}

function PayoutRequestForm({
  amount,
  createPayoutRequest,
  isPayoutAddressActive,
  MIN_PAYOUT_AMOUNT,
  note,
  payoutAddresses,
  payoutAvailability,
  payoutSubmitDisabled,
  setAmount,
  setNote,
  setWalletAddress,
  settlements,
  t,
  walletAddress,
}) {
  return (
    <>
      <form onSubmit={createPayoutRequest} className="mb-2.5 grid grid-cols-1 gap-2.5 lg:grid-cols-[160px_minmax(250px,1.15fr)_minmax(210px,0.95fr)_190px] lg:items-end">
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.amount")}</span>
          <DashboardInput type="number" min={MIN_PAYOUT_AMOUNT} max={payoutAvailability.maxWithdrawable} step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
        </label>
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.walletPlaceholder")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.walletPlaceholder")} value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} list="payout-address-whitelist" className="h-9" />
          <datalist id="payout-address-whitelist">
            {payoutAddresses.filter(isPayoutAddressActive).map((address) => (
              <option key={address.id} value={address.walletAddress}>{address.label || address.walletAddress}</option>
            ))}
          </datalist>
        </label>
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.optionalNote")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.optionalNote")} value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
        </label>
        <DashboardButton disabled={payoutSubmitDisabled} className="h-9 px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {t("businessWallet.requestPayout")}
        </DashboardButton>
      </form>

      <p className="mb-2.5 text-xs text-zinc-500">
        {t("businessWallet.minimumPayout")} {MIN_PAYOUT_AMOUNT} USDT. {t("businessWallet.availableNow")}: {formatTokenAmount(settlements.summary.available, settlements.summary.currency)}. {t("businessWallet.maxWithdrawable")}: {formatTokenAmount(payoutAvailability.maxWithdrawable, settlements.summary.currency)}. {t("businessWallet.activeWhitelistHint")}
      </p>
      {!payoutAvailability.hasActiveAddress && (
        <p className="mb-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
          {t("businessWallet.noActivePayoutAddress")}
        </p>
      )}
    </>
  );
}

function PayoutAddressWhitelistPanel({
  addPayoutAddress,
  isPayoutAddressActive,
  payoutAddressLabel,
  payoutAddresses,
  setPayoutAddressLabel,
  setWalletAddress,
  setWhitelistAddress,
  whitelistAddress,
  whitelisting,
}) {
  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-white/60 p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end">
        <label className="grid flex-1 gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">Whitelist label</span>
          <DashboardInput type="text" placeholder="Main payout wallet" value={payoutAddressLabel} onChange={(e) => setPayoutAddressLabel(e.target.value)} className="h-9" />
        </label>
        <label className="grid flex-[1.4] gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">Whitelist wallet address</span>
          <DashboardInput type="text" placeholder="TRON payout wallet address" value={whitelistAddress} onChange={(e) => setWhitelistAddress(e.target.value)} className="h-9" />
        </label>
        <DashboardButton type="button" onClick={addPayoutAddress} disabled={whitelisting} className="h-9 px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {whitelisting ? "Whitelisting..." : "Whitelist address"}
        </DashboardButton>
      </div>
      {payoutAddresses.length === 0 ? (
        <p className="text-xs text-zinc-500">Henuz whitelist payout adresi yok.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {payoutAddresses.map((address) => (
            <button key={address.id} type="button" onClick={() => { if (isPayoutAddressActive(address)) setWalletAddress(address.walletAddress); }} disabled={!isPayoutAddressActive(address)} className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
              {address.label || "Payout"} - {address.walletAddress.slice(0, 8)}...{address.walletAddress.slice(-6)} - {address.effectiveStatus || address.status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutHistoryList({ payoutRequests, payoutStatusClass, t, timeZone }) {
  return (
    <div className="business-wallet-payout-list overflow-hidden rounded-xl border">
      {payoutRequests.length === 0 ? (
        <DashboardEmptyState className="rounded-none border-0">{t("businessWallet.noPayoutRequests")}</DashboardEmptyState>
      ) : (
        payoutRequests.map((request) => (
          <div key={request.id} className="grid grid-cols-1 gap-3 border-t px-4 py-3 first:border-t-0 lg:grid-cols-[160px_1fr_140px_170px]">
            <div><p className="font-semibold">{formatTokenAmount(request.amount, request.currency)}</p><p className="text-xs text-zinc-500">{request.network}</p></div>
            <div><p className="break-all text-sm">{request.walletAddress}</p>{request.note && <p className="text-xs text-zinc-500">{request.note}</p>}</div>
            <div><span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${payoutStatusClass(request.status)}`}>{request.status}</span></div>
            <p className="text-xs text-zinc-500 lg:text-right">{formatDashboardDateTime(request.createdAt, timeZone)}</p>
          </div>
        ))
      )}
    </div>
  );
}

export function RecentActivityPanel({
  formatActivityAction,
  getActivityMeta,
  recentActivity,
  t,
  timeZone,
}) {
  return (
    <DashboardPanel>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold sm:text-[22px]">{t("businessWallet.recentActivity")}</h2>
            {recentActivity.some((log) => getActivityMeta(log.action).critical) && (
              <span className="business-wallet-alert-pill rounded-full border px-3 py-1 text-xs font-semibold">
                {t("businessWallet.reviewWarning")}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">{t("businessWallet.activityDescription")}</p>
        </div>
        <DashboardPill as="a" href="/business-wallet/webhooks" className="flex w-full justify-center px-4 py-2 text-sm sm:w-fit">
          {t("webhooks.openLogs")}
        </DashboardPill>
      </div>

      {recentActivity.length === 0 ? (
        <DashboardEmptyState>{t("businessWallet.noActivity")}</DashboardEmptyState>
      ) : (
        <div className="business-wallet-activity-list divide-y rounded-xl border">
          {recentActivity.map((log) => {
            const activityMeta = getActivityMeta(log.action);
            return (
              <div key={log.id} className="business-wallet-activity-row grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[140px_1fr_155px] md:items-center">
                <div className="space-y-1">
                  <span className={`business-wallet-activity-badge inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>{activityMeta.label}</span>
                  <p className="break-words text-[11px] text-zinc-500">{formatActivityAction(log.action)}</p>
                </div>
                <div className="min-w-0">
                  <p className="business-wallet-activity-title text-sm font-semibold">{log.message || formatActivityAction(log.action)}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-500" title={`${log.targetType || "merchant"}: ${log.targetId || "-"}`}>{log.targetType || "merchant"}: {log.targetId || "-"}</p>
                </div>
                <p className="business-wallet-activity-date justify-self-start text-xs font-medium text-zinc-500 md:justify-self-end md:text-right">
                  {formatDashboardDateTime(log.createdAt, timeZone)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
