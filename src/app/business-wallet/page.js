"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount, hasMoreThanDecimals, parseMoneyAmount } from "@/lib/money";

const getActivityMeta = (action) => {
  if (action?.includes("webhook")) {
    return {
      label: "Webhook",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      critical: action?.includes("retry") || action?.includes("test"),
    };
  }
  if (action?.includes("payment")) {
    return {
      label: "Payment",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      critical: false,
    };
  }
  if (action?.includes("api_key") || action?.includes("secret")) {
    return {
      label: "Security",
      className: "border-red-200 bg-red-50 text-red-700",
      critical: true,
    };
  }
  if (action?.includes("callback")) {
    return {
      label: "Settings",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      critical: false,
    };
  }
  return {
    label: "Activity",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
    critical: false,
  };
};

const formatActivityAction = (action) =>
  String(action || "activity")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

function payoutStatusClass(status) {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  }
  if (status === "REJECTED") {
    return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  }
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
}

const MIN_PAYOUT_AMOUNT = 1;
const DEFAULT_MAX_PAYOUT_AMOUNT = 1000000;
const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

const isPayoutAddressActive = (address) =>
  (address.effectiveStatus || address.status) === "ACTIVE";

export default function BusinessWalletPage() {
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    expired: 0,
  });
  const [settlements, setSettlements] = useState({
    summary: {
      network: "TRC20",
      currency: "USDT",
      available: 0,
      grossPaid: 0,
      reservedForPayouts: 0,
    },
    payoutRequests: [],
    payoutLimits: {
      currency: "USDT",
      dailyLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
      dailyRemaining: DEFAULT_MAX_PAYOUT_AMOUNT,
      dailyUsed: 0,
      perTransactionLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
      weeklyLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
      weeklyRemaining: DEFAULT_MAX_PAYOUT_AMOUNT,
      weeklyUsed: 0,
    },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [payoutAddresses, setPayoutAddresses] = useState([]);

  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [payoutAddressLabel, setPayoutAddressLabel] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(null);
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const [paymentsRes, settlementsRes, activityRes, payoutAddressesRes] = await Promise.all([
        fetch(apiUrl(`/api/payments?limit=50&t=${Date.now()}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(apiUrl(`/api/merchant/settlements?t=${Date.now()}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(apiUrl(`/api/merchant/audit-logs?limit=5&t=${Date.now()}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(apiUrl(`/api/merchant/payout-addresses?t=${Date.now()}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (
        paymentsRes.status === 401 ||
        settlementsRes.status === 401 ||
        activityRes.status === 401 ||
        payoutAddressesRes.status === 401
      ) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const paymentsData = await paymentsRes.json();
      const settlementsData = await settlementsRes.json();
      const activityData = await activityRes.json();
      const payoutAddressesData = await payoutAddressesRes.json();

      if (!paymentsRes.ok && !settlementsRes.ok && !activityRes.ok && !payoutAddressesRes.ok) {
        setNotice({
          type: "error",
          message:
            paymentsData.message ||
            settlementsData.message ||
            activityData.message ||
            payoutAddressesData.message ||
            t("businessWallet.dataRefreshError"),
        });
        return;
      }

      if (paymentsRes.ok) {
        setPaymentStats(
          paymentsData.stats || { total: 0, paid: 0, pending: 0, expired: 0 }
        );
      }

      if (settlementsRes.ok) {
        setSettlements({
          summary: settlementsData.summary || {
            network: "TRC20",
            currency: "USDT",
            available: 0,
            grossPaid: 0,
            reservedForPayouts: 0,
          },
          payoutRequests: settlementsData.payoutRequests || [],
          payoutLimits: settlementsData.payoutLimits || {
            currency: "USDT",
            dailyLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
            dailyRemaining: DEFAULT_MAX_PAYOUT_AMOUNT,
            dailyUsed: 0,
            perTransactionLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
            weeklyLimit: DEFAULT_MAX_PAYOUT_AMOUNT,
            weeklyRemaining: DEFAULT_MAX_PAYOUT_AMOUNT,
            weeklyUsed: 0,
          },
        });
      }

      if (activityRes.ok) {
        setRecentActivity(activityData.auditLogs || []);
      }

      if (payoutAddressesRes.ok) {
        setPayoutAddresses(payoutAddressesData.addresses || []);
      }

      if (!paymentsRes.ok || !settlementsRes.ok || !activityRes.ok || !payoutAddressesRes.ok) {
        setNotice({
          type: "error",
          message:
            paymentsData.message ||
            settlementsData.message ||
            activityData.message ||
            payoutAddressesData.message ||
            t("businessWallet.dataRefreshError"),
        });
      }
    } catch {
      setNotice({
        type: "error",
        message: t("businessWallet.dataRefreshError"),
      });
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadDashboard();
      } finally {
        setLoading(false);
      }
    };
    run();

    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const createPayoutRequest = async (e) => {
    e.preventDefault();
    const numericAmount = parseMoneyAmount(amount, NaN);
    const available = parseMoneyAmount(settlements.summary.available);
    const maxPayoutAmount = parseMoneyAmount(
      settlements.payoutLimits?.perTransactionLimit,
      DEFAULT_MAX_PAYOUT_AMOUNT
    );

    if (!Number.isFinite(numericAmount)) {
      setNotice({ type: "error", message: t("businessWallet.validPayoutAmount") });
      return;
    }

    if (numericAmount < MIN_PAYOUT_AMOUNT || numericAmount > maxPayoutAmount) {
      setNotice({
        type: "error",
        message: `${t("businessWallet.payoutRange")} ${MIN_PAYOUT_AMOUNT} - ${maxPayoutAmount} USDT.`,
      });
      return;
    }

    if (hasMoreThanDecimals(amount, 2)) {
      setNotice({ type: "error", message: t("businessWallet.maxDecimals") });
      return;
    }

    if (numericAmount > available) {
      setNotice({ type: "error", message: t("businessWallet.exceedsBalance") });
      return;
    }

    if (!walletAddress.trim()) {
      setNotice({ type: "error", message: t("businessWallet.enterWallet") });
      return;
    }

    if (!TRON_ADDRESS_PATTERN.test(walletAddress.trim())) {
      setNotice({ type: "error", message: t("businessWallet.validTronWallet") });
      return;
    }

    const token = localStorage.getItem("token");
    setNotice(null);
    const response = await fetch(apiUrl("/api/merchant/payout-requests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount.trim(),
          walletAddress: walletAddress.trim(),
          note: note || undefined,
        }),
      });
    const data = await response.json();
    if (!response.ok) {
      setNotice({
        type: "error",
        message: data.errors?.join(" ") || data.message || t("businessWallet.payoutFailed"),
      });
      return;
    }

    setAmount("");
    setWalletAddress("");
    setNote("");
    setNotice({ type: "success", message: data.message || t("businessWallet.payoutCreated") });
    await loadDashboard();
  };

  const addPayoutAddress = async () => {
    const trimmedAddress = walletAddress.trim();

    if (!trimmedAddress) {
      setNotice({ type: "error", message: t("businessWallet.enterWallet") });
      return;
    }

    if (!TRON_ADDRESS_PATTERN.test(trimmedAddress)) {
      setNotice({ type: "error", message: t("businessWallet.validTronWallet") });
      return;
    }

    const token = localStorage.getItem("token");
    const response = await fetch(apiUrl("/api/merchant/payout-addresses"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: payoutAddressLabel || undefined,
        walletAddress: trimmedAddress,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setNotice({
        type: "error",
        message: data.errors?.join(" ") || data.message || "Payout address could not be whitelisted.",
      });
      return;
    }

    setPayoutAddressLabel("");
    setNotice({ type: "success", message: data.message || "Payout address whitelisted." });
    await loadDashboard();
  };

  if (loading) {
    return (
      <OverviewShell>
        <p className="text-zinc-500">{t("overview.loading")}</p>
      </OverviewShell>
    );
  }

  return (
    <OverviewShell>
      <div className="space-y-5">
        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : "border-red-500/40 bg-red-500/10 text-red-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="business-wallet-panel rounded-2xl border p-4 sm:p-5">
          <h2 className="mb-1 text-xl font-semibold sm:text-[22px]">{t("businessWallet.overview")}</h2>
          <p className="mb-4 text-sm text-zinc-500">{t("businessWallet.snapshot")}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="business-wallet-metric rounded-xl border px-4 py-3"><p className="text-sm text-zinc-500">{t("businessWallet.totalPayments")}</p><p className="text-2xl font-bold">{paymentStats.total}</p></div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3"><p className="text-sm text-zinc-500">{t("businessWallet.paidPayments")}</p><p className="text-2xl font-bold">{paymentStats.paid}</p></div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3"><p className="text-sm text-zinc-500">{t("businessWallet.pendingPayments")}</p><p className="text-2xl font-bold">{paymentStats.pending}</p></div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3"><p className="text-sm text-zinc-500">{t("businessWallet.expiredPayments")}</p><p className="text-2xl font-bold">{paymentStats.expired}</p></div>
          </div>
        </section>

        <section className="business-wallet-panel rounded-2xl border p-4">
          <div className="mb-3">
            <div>
              <h2 className="text-xl font-semibold sm:text-[22px]">{t("businessWallet.finance")}</h2>
              <p className="text-sm text-zinc-500">{t("businessWallet.financeDescription")}</p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5"><p className="text-xs text-zinc-500">{t("overview.available")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.available, settlements.summary.currency)}</p></div>
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5"><p className="text-xs text-zinc-500">{t("overview.grossPaid")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.grossPaid, settlements.summary.currency)}</p></div>
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5"><p className="text-xs text-zinc-500">{t("overview.reserved")}</p><p className="break-words text-xl font-bold">{formatTokenAmount(settlements.summary.reservedForPayouts, settlements.summary.currency)}</p></div>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5">
              <p className="text-xs text-zinc-500">Per transaction limit</p>
              <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.perTransactionLimit, settlements.payoutLimits?.currency || "USDT")}</p>
            </div>
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5">
              <p className="text-xs text-zinc-500">Daily remaining</p>
              <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.dailyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
              <p className="text-[11px] text-zinc-500">Used {formatTokenAmount(settlements.payoutLimits?.dailyUsed, settlements.payoutLimits?.currency || "USDT")}</p>
            </div>
            <div className="business-wallet-metric rounded-xl border px-4 py-2.5">
              <p className="text-xs text-zinc-500">Weekly remaining</p>
              <p className="break-words text-lg font-bold">{formatTokenAmount(settlements.payoutLimits?.weeklyRemaining, settlements.payoutLimits?.currency || "USDT")}</p>
              <p className="text-[11px] text-zinc-500">Used {formatTokenAmount(settlements.payoutLimits?.weeklyUsed, settlements.payoutLimits?.currency || "USDT")}</p>
            </div>
          </div>

          <form onSubmit={createPayoutRequest} className="mb-2.5 grid grid-cols-1 gap-2.5 lg:grid-cols-[160px_minmax(250px,1.15fr)_minmax(210px,0.95fr)_190px] lg:items-end">
            <label className="grid gap-1.5">
              <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.amount")}</span>
              <input
                type="number"
                min={MIN_PAYOUT_AMOUNT}
                max={Math.min(
                  parseMoneyAmount(settlements.summary.available),
                  parseMoneyAmount(settlements.payoutLimits?.perTransactionLimit, DEFAULT_MAX_PAYOUT_AMOUNT)
                )}
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="business-wallet-input h-9 rounded-xl border px-4 text-sm outline-none"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.walletPlaceholder")}</span>
              <input
                type="text"
                placeholder={t("businessWallet.walletPlaceholder")}
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                list="payout-address-whitelist"
                className="business-wallet-input h-9 rounded-xl border px-4 text-sm outline-none"
              />
              <datalist id="payout-address-whitelist">
                {payoutAddresses.filter(isPayoutAddressActive).map((address) => (
                  <option key={address.id} value={address.walletAddress}>
                    {address.label || address.walletAddress}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="grid gap-1.5">
              <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">{t("businessWallet.optionalNote")}</span>
              <input
                type="text"
                placeholder={t("businessWallet.optionalNote")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="business-wallet-input h-9 rounded-xl border px-4 text-sm outline-none"
              />
            </label>
            <button className="business-wallet-primary-button h-9 rounded-xl border px-5 text-sm font-semibold">{t("businessWallet.requestPayout")}</button>
          </form>
          <p className="mb-2.5 text-xs text-zinc-500">
            {t("businessWallet.minimumPayout")} {MIN_PAYOUT_AMOUNT} USDT. {t("businessWallet.availableNow")}: {formatTokenAmount(settlements.summary.available, settlements.summary.currency)}. Payout adresi whitelist'te ACTIVE olmalidir.
          </p>

          <div className="mb-4 rounded-xl border border-zinc-200 bg-white/60 p-3">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end">
              <label className="grid flex-1 gap-1.5">
                <span className="business-wallet-field-label text-[10px] font-semibold uppercase tracking-wide">Whitelist label</span>
                <input
                  type="text"
                  placeholder="Main payout wallet"
                  value={payoutAddressLabel}
                  onChange={(e) => setPayoutAddressLabel(e.target.value)}
                  className="business-wallet-input h-9 rounded-xl border px-4 text-sm outline-none"
                />
              </label>
              <button
                type="button"
                onClick={addPayoutAddress}
                className="business-wallet-primary-button h-9 rounded-xl border px-5 text-sm font-semibold"
              >
                Whitelist address
              </button>
            </div>
            {payoutAddresses.length === 0 ? (
              <p className="text-xs text-zinc-500">Henuz whitelist payout adresi yok.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {payoutAddresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => {
                      if (isPayoutAddressActive(address)) {
                        setWalletAddress(address.walletAddress);
                      }
                    }}
                    disabled={!isPayoutAddressActive(address)}
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {address.label || "Payout"} - {address.walletAddress.slice(0, 8)}...{address.walletAddress.slice(-6)} - {address.effectiveStatus || address.status}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="business-wallet-payout-list overflow-hidden rounded-xl border">
            {settlements.payoutRequests.length === 0 ? (
              <p className="business-wallet-empty-state px-4 py-3 text-sm">{t("businessWallet.noPayoutRequests")}</p>
            ) : (
              settlements.payoutRequests.map((request) => (
                <div key={request.id} className="grid grid-cols-1 gap-3 border-t px-4 py-3 first:border-t-0 lg:grid-cols-[160px_1fr_140px_170px]">
                  <div>
                    <p className="font-semibold">{formatTokenAmount(request.amount, request.currency)}</p>
                    <p className="text-xs text-zinc-500">{request.network}</p>
                  </div>
                  <div>
                    <p className="break-all text-sm">{request.walletAddress}</p>
                    {request.note && <p className="text-xs text-zinc-500">{request.note}</p>}
                  </div>
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${payoutStatusClass(request.status)}`}>{request.status}</span>
                  </div>
                  <p className="text-xs text-zinc-500 lg:text-right">{formatDashboardDateTime(request.createdAt, timeZone)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="business-wallet-panel rounded-2xl border p-4 sm:p-5">
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
            <a
              href="/business-wallet/webhooks"
              className="business-wallet-pill flex w-full justify-center rounded-full border px-4 py-2 text-sm font-semibold sm:w-fit"
            >
              {t("webhooks.openLogs")}
            </a>
          </div>

          {recentActivity.length === 0 ? (
            <p className="business-wallet-empty-state rounded-xl border px-4 py-3 text-sm">
              {t("businessWallet.noActivity")}
            </p>
          ) : (
            <div className="business-wallet-activity-list divide-y rounded-xl border">
              {recentActivity.map((log) => {
                const activityMeta = getActivityMeta(log.action);

                return (
                  <div key={log.id} className="business-wallet-activity-row grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[140px_1fr_155px] md:items-center">
                    <div className="space-y-1">
                      <span className={`business-wallet-activity-badge inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>
                        {activityMeta.label}
                      </span>
                      <p className="break-words text-[11px] text-zinc-500">{formatActivityAction(log.action)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="business-wallet-activity-title text-sm font-semibold">{log.message || formatActivityAction(log.action)}</p>
                      <p className="mt-1 truncate text-[11px] text-zinc-500" title={`${log.targetType || "merchant"}: ${log.targetId || "-"}`}>
                        {log.targetType || "merchant"}: {log.targetId || "-"}
                      </p>
                    </div>
                    <p className="business-wallet-activity-date justify-self-start text-xs font-medium text-zinc-500 md:justify-self-end md:text-right">
                      {formatDashboardDateTime(log.createdAt, timeZone)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </OverviewShell>
  );
}
