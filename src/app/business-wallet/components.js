"use client";

import {
  Activity,
  ArrowRight,
  Banknote,
  Clock3,
  CreditCard,
  Landmark,
  ListChecks,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
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
  const metrics = [
    { label: t("businessWallet.totalPayments"), value: paymentStats.total, icon: CreditCard },
    { label: t("businessWallet.paidPayments"), value: paymentStats.paid, icon: Banknote },
    { label: t("businessWallet.pendingPayments"), value: paymentStats.pending, icon: Clock3 },
    { label: t("businessWallet.expiredPayments"), value: paymentStats.expired, icon: Activity },
  ];

  return (
    <DashboardPanel className="!rounded-lg border-zinc-800 bg-zinc-950 p-4 md:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
          <ListChecks size={17} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">{t("businessWallet.overview")}</h2>
          <p className="text-sm text-zinc-500">{t("businessWallet.snapshot")}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <DashboardMetric key={metric.label} className="!rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-400">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold leading-none text-white">{metric.value}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400">
                  <Icon size={16} />
                </span>
              </div>
            </DashboardMetric>
          );
        })}
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
    <DashboardPanel className="!rounded-lg border-zinc-800 bg-zinc-950 p-4 md:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
          <Landmark size={17} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">{t("businessWallet.finance")}</h2>
          <p className="text-sm text-zinc-500">{t("businessWallet.financeDescription")}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric className="!rounded-lg py-3"><p className="text-xs font-semibold text-zinc-500">{t("overview.available")}</p><p className="mt-1 break-words text-xl font-bold text-white">{formatTokenAmount(settlements.summary.available, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3"><p className="text-xs font-semibold text-zinc-500">{t("overview.pending")}</p><p className="mt-1 break-words text-xl font-bold text-white">{formatTokenAmount(settlements.summary.pendingBalance, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3"><p className="text-xs font-semibold text-zinc-500">{t("overview.grossPaid")}</p><p className="mt-1 break-words text-xl font-bold text-white">{formatTokenAmount(settlements.summary.grossPaid, settlements.summary.currency)}</p></DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3"><p className="text-xs font-semibold text-zinc-500">{t("overview.reserved")}</p><p className="mt-1 break-words text-xl font-bold text-white">{formatTokenAmount(settlements.summary.reservedForPayouts, settlements.summary.currency)}</p></DashboardMetric>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric className="!rounded-lg py-3">
          <p className="text-xs font-semibold text-zinc-500">{t("businessWallet.maxWithdrawable")}</p>
          <p className="mt-1 break-words text-lg font-bold text-white">{formatTokenAmount(payoutAvailability.maxWithdrawable, settlements.summary.currency)}</p>
          <p className="text-[11px] text-zinc-500">{t("businessWallet.balanceBound")}</p>
        </DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3">
          <p className="text-xs font-semibold text-zinc-500">{t("businessWallet.perTransactionLimit")}</p>
          <p className="mt-1 break-words text-lg font-bold text-white">{formatTokenAmount(settlements.payoutLimits?.perTransactionLimit, settlements.payoutLimits?.currency || "USDT")}</p>
        </DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3">
          <p className="text-xs font-semibold text-zinc-500">{t("businessWallet.dailyRemaining")}</p>
          <p className="mt-1 break-words text-lg font-bold text-white">{formatTokenAmount(settlements.payoutLimits?.dailyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
          <p className="text-[11px] text-zinc-500">{t("businessWallet.used")} {formatTokenAmount(settlements.payoutLimits?.dailyUsed, settlements.payoutLimits?.currency || "USDT")}</p>
        </DashboardMetric>
        <DashboardMetric className="!rounded-lg py-3">
          <p className="text-xs font-semibold text-zinc-500">{t("businessWallet.weeklyRemaining")}</p>
          <p className="mt-1 break-words text-lg font-bold text-white">{formatTokenAmount(settlements.payoutLimits?.weeklyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
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
        t={t}
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
    <div className="mb-4 rounded-lg border border-zinc-800 bg-black p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{t("businessWallet.payoutRequest")}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t("businessWallet.minimumPayout")} {MIN_PAYOUT_AMOUNT} USDT / {t("businessWallet.maxWithdrawable")}: {formatTokenAmount(payoutAvailability.maxWithdrawable, settlements.summary.currency)}
          </p>
        </div>
        <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-emerald-300 sm:flex">
          <ArrowRight size={15} />
        </span>
      </div>
      <form onSubmit={createPayoutRequest} className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_minmax(260px,1.2fr)_minmax(210px,0.9fr)_170px] xl:items-end">
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-normal">{t("businessWallet.amount")}</span>
          <DashboardInput type="number" min={MIN_PAYOUT_AMOUNT} max={payoutAvailability.maxWithdrawable} step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 !rounded-lg" />
        </label>
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-normal">{t("businessWallet.walletPlaceholder")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.walletPlaceholder")} value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} list="payout-address-whitelist" className="h-10 !rounded-lg" />
          <datalist id="payout-address-whitelist">
            {payoutAddresses.filter(isPayoutAddressActive).map((address) => (
              <option key={address.id} value={address.walletAddress}>{address.label || address.walletAddress}</option>
            ))}
          </datalist>
        </label>
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-normal">{t("businessWallet.optionalNote")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.optionalNote")} value={note} onChange={(e) => setNote(e.target.value)} className="h-10 !rounded-lg" />
        </label>
        <DashboardButton disabled={payoutSubmitDisabled} className="flex h-10 items-center justify-center gap-2 !rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-50">
          <WalletCards size={15} />
          {t("businessWallet.requestPayout")}
        </DashboardButton>
      </form>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        {t("businessWallet.availableNow")}: {formatTokenAmount(settlements.summary.available, settlements.summary.currency)}. {t("businessWallet.activeWhitelistHint")}
      </p>
      {!payoutAvailability.hasActiveAddress && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {t("businessWallet.noActivePayoutAddress")}
        </p>
      )}
    </div>
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
  t,
  whitelistAddress,
  whitelisting,
}) {
  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 md:p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
          <ShieldCheck size={15} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-white">{t("businessWallet.whitelistTitle")}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{t("businessWallet.whitelistDescription")}</p>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_170px] lg:items-end">
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-normal">{t("businessWallet.whitelistLabel")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.whitelistLabelPlaceholder")} value={payoutAddressLabel} onChange={(e) => setPayoutAddressLabel(e.target.value)} className="h-10 !rounded-lg" />
        </label>
        <label className="grid gap-1.5">
          <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-normal">{t("businessWallet.whitelistWallet")}</span>
          <DashboardInput type="text" placeholder={t("businessWallet.whitelistWalletPlaceholder")} value={whitelistAddress} onChange={(e) => setWhitelistAddress(e.target.value)} className="h-10 !rounded-lg" />
        </label>
        <DashboardButton type="button" onClick={addPayoutAddress} disabled={whitelisting} className="flex h-10 items-center justify-center gap-2 !rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-50">
          <ShieldCheck size={15} />
          {whitelisting ? t("businessWallet.whitelisting") : t("businessWallet.whitelistAddress")}
        </DashboardButton>
      </div>
      {payoutAddresses.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-500">{t("businessWallet.noWhitelistedAddresses")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {payoutAddresses.map((address) => (
            <button key={address.id} type="button" onClick={() => { if (isPayoutAddressActive(address)) setWalletAddress(address.walletAddress); }} disabled={!isPayoutAddressActive(address)} className="rounded-full border border-zinc-800 bg-black px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50">
              {address.label || "Payout"} / {address.walletAddress.slice(0, 8)}...{address.walletAddress.slice(-6)} / {address.effectiveStatus || address.status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutHistoryList({ payoutRequests, payoutStatusClass, t, timeZone }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <WalletCards size={15} className="text-zinc-400" />
        <h3 className="text-sm font-bold text-white">{t("businessWallet.payoutHistory")}</h3>
      </div>
      <div className="business-wallet-payout-list border-0">
        {payoutRequests.length === 0 ? (
          <DashboardEmptyState className="rounded-none border-0">{t("businessWallet.noPayoutRequests")}</DashboardEmptyState>
        ) : (
          payoutRequests.map((request) => (
            <div key={request.id} className="grid grid-cols-1 gap-3 border-t border-zinc-800 px-4 py-3 first:border-t-0 lg:grid-cols-[160px_1fr_140px_170px] lg:items-center">
              <div><p className="font-semibold text-white">{formatTokenAmount(request.amount, request.currency)}</p><p className="text-xs text-zinc-500">{request.network}</p></div>
              <div><p className="break-all text-sm text-zinc-300">{request.walletAddress}</p>{request.note && <p className="text-xs text-zinc-500">{request.note}</p>}</div>
              <div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${payoutStatusClass(request.status)}`}>{request.status}</span></div>
              <p className="text-xs text-zinc-500 lg:text-right">{formatDashboardDateTime(request.createdAt, timeZone)}</p>
            </div>
          ))
        )}
      </div>
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
    <DashboardPanel className="!rounded-lg border-zinc-800 bg-zinc-950 p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
            <Activity size={17} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-white">{t("businessWallet.recentActivity")}</h2>
              {recentActivity.some((log) => getActivityMeta(log.action).critical) && (
                <span className="business-wallet-alert-pill rounded-full border px-3 py-1 text-xs font-semibold">
                  {t("businessWallet.reviewWarning")}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{t("businessWallet.activityDescription")}</p>
          </div>
        </div>
        <DashboardPill as="a" href="/business-wallet/webhooks" className="flex w-full justify-center rounded-lg px-4 py-2 text-sm sm:w-fit">
          {t("webhooks.openLogs")}
        </DashboardPill>
      </div>

      {recentActivity.length === 0 ? (
        <DashboardEmptyState className="!rounded-lg">{t("businessWallet.noActivity")}</DashboardEmptyState>
      ) : (
        <div className="business-wallet-activity-list divide-y overflow-hidden rounded-lg border">
          {recentActivity.map((log) => {
            const activityMeta = getActivityMeta(log.action);
            return (
              <div key={log.id} className="business-wallet-activity-row grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[132px_1fr_160px] md:items-center">
                <div className="space-y-1">
                  <span className={`business-wallet-activity-badge inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>{t(activityMeta.labelKey)}</span>
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
