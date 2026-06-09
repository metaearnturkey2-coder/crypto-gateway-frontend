"use client";

import { useCallback, useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { getEffectivePaymentStatus } from "@/features/merchant-payments/formatters";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { hasMoreThanDecimals, parseMoneyAmount } from "@/lib/money";
import {
  FinancePayoutPanel,
  PaymentOverviewPanel,
  RecentActivityPanel,
} from "./components";

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
  if (status === "REJECTED" || status === "FAILED") {
    return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  }
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
}

const MIN_PAYOUT_AMOUNT = 1;
const DEFAULT_MAX_PAYOUT_AMOUNT = 1000000;
const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const DEFAULT_PAYMENT_STATS = {
  total: 0,
  paid: 0,
  pending: 0,
  expired: 0,
};

const getDashboardPaymentStats = (paymentsData) => {
  const payments = Array.isArray(paymentsData?.payments) ? paymentsData.payments : [];

  if (payments.length === 0) {
    return paymentsData?.stats || DEFAULT_PAYMENT_STATS;
  }

  const stats = payments.reduce(
    (counts, payment) => {
      const status = getEffectivePaymentStatus(payment);

      return {
        total: counts.total,
        paid: counts.paid + (status === "PAID" ? 1 : 0),
        pending: counts.pending + (status === "PENDING" ? 1 : 0),
        expired: counts.expired + (status === "EXPIRED" || status === "CANCELLED" ? 1 : 0),
      };
    },
    {
      total: paymentsData?.stats?.total ?? payments.length,
      paid: 0,
      pending: 0,
      expired: 0,
    }
  );

  return stats;
};

const isPayoutAddressActive = (address) =>
  (address.effectiveStatus || address.status) === "ACTIVE";

const getPayoutAvailability = ({ amount, payoutAddresses, settlements }) => {
  const available = parseMoneyAmount(settlements.summary.available);
  const perTransactionLimit = parseMoneyAmount(
    settlements.payoutLimits?.perTransactionLimit,
    DEFAULT_MAX_PAYOUT_AMOUNT
  );
  const dailyRemaining = parseMoneyAmount(
    settlements.payoutLimits?.dailyRemaining,
    DEFAULT_MAX_PAYOUT_AMOUNT
  );
  const weeklyRemaining = parseMoneyAmount(
    settlements.payoutLimits?.weeklyRemaining,
    DEFAULT_MAX_PAYOUT_AMOUNT
  );
  const maxWithdrawable = Math.max(
    Math.min(available, perTransactionLimit, dailyRemaining, weeklyRemaining),
    0
  );
  const numericAmount = parseMoneyAmount(amount, NaN);
  const hasActiveAddress = payoutAddresses.some(isPayoutAddressActive);

  return {
    available,
    dailyRemaining,
    hasActiveAddress,
    maxWithdrawable,
    numericAmount,
    perTransactionLimit,
    weeklyRemaining,
  };
};

export default function BusinessWalletPage() {
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState(DEFAULT_PAYMENT_STATS);
  const [settlements, setSettlements] = useState({
    summary: {
      network: "TRC20",
      currency: "USDT",
      available: 0,
      pendingBalance: 0,
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
  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [payoutAddressLabel, setPayoutAddressLabel] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(null);
  const [whitelisting, setWhitelisting] = useState(false);
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const loadDashboard = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [
        paymentsResult,
        settlementsResult,
        activityResult,
        payoutAddressesResult,
      ] = await Promise.all([
        merchantFetch(`/api/payments?limit=50&t=${timestamp}`),
        merchantFetch(`/api/merchant/settlements?t=${timestamp}`),
        merchantFetch(`/api/merchant/audit-logs?limit=5&t=${timestamp}`),
        merchantFetch(`/api/merchant/payout-addresses?t=${timestamp}`),
      ]);
      const { body: paymentsData, ok: paymentsOk } = paymentsResult;
      const { body: settlementsData, ok: settlementsOk } = settlementsResult;
      const { body: activityData, ok: activityOk } = activityResult;
      const { body: payoutAddressesData, ok: payoutAddressesOk } = payoutAddressesResult;

      if (!paymentsOk && !settlementsOk && !activityOk && !payoutAddressesOk) {
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

      if (paymentsOk) {
        setPaymentStats(getDashboardPaymentStats(paymentsData));
      }

      if (settlementsOk) {
        setSettlements({
          summary: settlementsData.summary || {
            network: "TRC20",
            currency: "USDT",
            available: 0,
            pendingBalance: 0,
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

      if (activityOk) {
        setRecentActivity(activityData.auditLogs || []);
      }

      if (payoutAddressesOk) {
        setPayoutAddresses(payoutAddressesData.addresses || []);
      }

      if (!paymentsOk || !settlementsOk || !activityOk || !payoutAddressesOk) {
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
  }, [t]);

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
  }, [loadDashboard]);

  const createPayoutRequest = async (e) => {
    e.preventDefault();
    const payoutAvailability = getPayoutAvailability({
      amount,
      payoutAddresses,
      settlements,
    });
    const { maxWithdrawable, numericAmount } = payoutAvailability;

    if (!Number.isFinite(numericAmount)) {
      setNotice({ type: "error", message: t("businessWallet.validPayoutAmount") });
      return;
    }

    if (numericAmount < MIN_PAYOUT_AMOUNT || numericAmount > maxWithdrawable) {
      setNotice({
        type: "error",
        message: `${t("businessWallet.payoutRange")} ${MIN_PAYOUT_AMOUNT} - ${maxWithdrawable.toFixed(2)} USDT.`,
      });
      return;
    }

    if (hasMoreThanDecimals(amount, 2)) {
      setNotice({ type: "error", message: t("businessWallet.maxDecimals") });
      return;
    }

    if (numericAmount > payoutAvailability.available) {
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

    const selectedAddress = payoutAddresses.find(
      (address) => address.walletAddress === walletAddress.trim()
    );

    if (!selectedAddress || !isPayoutAddressActive(selectedAddress)) {
      setNotice({ type: "error", message: t("businessWallet.activeWhitelistRequired") });
      return;
    }

    setNotice(null);
    const { body: data, ok } = await merchantFetch("/api/merchant/payout-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount.trim(),
          walletAddress: walletAddress.trim(),
          note: note || undefined,
        }),
      });
    if (!ok) {
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
    const trimmedAddress = whitelistAddress.trim();

    if (!trimmedAddress) {
      setNotice({ type: "error", message: t("businessWallet.enterWallet") });
      return;
    }

    if (!TRON_ADDRESS_PATTERN.test(trimmedAddress)) {
      setNotice({ type: "error", message: t("businessWallet.validTronWallet") });
      return;
    }

    setWhitelisting(true);
    setNotice(null);

    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/payout-addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: payoutAddressLabel || undefined,
          walletAddress: trimmedAddress,
        }),
      });

      if (!ok) {
        setNotice({
          type: "error",
          message: data.errors?.join(" ") || data.message || "Payout address could not be whitelisted.",
        });
        return;
      }

      setPayoutAddressLabel("");
      setWhitelistAddress("");
      setWalletAddress(data.address?.walletAddress || trimmedAddress);
      setNotice({
        type: "success",
        message:
          data.address?.effectiveStatus === "ACTIVE" || data.address?.status === "ACTIVE"
            ? data.message || "Payout address whitelisted."
            : `${data.message || "Payout address whitelisted."} Activation pending until ${formatDashboardDateTime(data.address?.activatesAt, timeZone)}.`,
      });
      await loadDashboard();
    } catch (error) {
      setNotice({
        type: "error",
        message: `Payout address could not be whitelisted. ${error.message}`,
      });
    } finally {
      setWhitelisting(false);
    }
  };

  if (loading) {
    return (
      <OverviewShell>
        <p className="text-zinc-500">{t("overview.loading")}</p>
      </OverviewShell>
    );
  }

  const payoutAvailability = getPayoutAvailability({
    amount,
    payoutAddresses,
    settlements,
  });
  const selectedPayoutAddress = payoutAddresses.find(
    (address) => address.walletAddress === walletAddress.trim()
  );
  const activePayoutAddressSelected =
    selectedPayoutAddress && isPayoutAddressActive(selectedPayoutAddress);
  const amountIsValid =
    Number.isFinite(payoutAvailability.numericAmount) &&
    payoutAvailability.numericAmount >= MIN_PAYOUT_AMOUNT &&
    payoutAvailability.numericAmount <= payoutAvailability.maxWithdrawable &&
    !hasMoreThanDecimals(amount, 2);
  const payoutSubmitDisabled =
    payoutAvailability.maxWithdrawable < MIN_PAYOUT_AMOUNT ||
    !amountIsValid ||
    !activePayoutAddressSelected;

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

        <PaymentOverviewPanel paymentStats={paymentStats} t={t} />

        <FinancePayoutPanel
          addPayoutAddress={addPayoutAddress}
          amount={amount}
          createPayoutRequest={createPayoutRequest}
          isPayoutAddressActive={isPayoutAddressActive}
          MIN_PAYOUT_AMOUNT={MIN_PAYOUT_AMOUNT}
          note={note}
          payoutAddressLabel={payoutAddressLabel}
          payoutAddresses={payoutAddresses}
          payoutAvailability={payoutAvailability}
          payoutStatusClass={payoutStatusClass}
          payoutSubmitDisabled={payoutSubmitDisabled}
          setAmount={setAmount}
          setNote={setNote}
          setPayoutAddressLabel={setPayoutAddressLabel}
          setWalletAddress={setWalletAddress}
          setWhitelistAddress={setWhitelistAddress}
          settlements={settlements}
          t={t}
          timeZone={timeZone}
          walletAddress={walletAddress}
          whitelistAddress={whitelistAddress}
          whitelisting={whitelisting}
        />

        <RecentActivityPanel
          formatActivityAction={formatActivityAction}
          getActivityMeta={getActivityMeta}
          recentActivity={recentActivity}
          t={t}
          timeZone={timeZone}
        />      </div>
    </OverviewShell>
  );
}
