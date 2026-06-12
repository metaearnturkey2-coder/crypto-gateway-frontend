"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { cn } from "@/components/dashboard-ui";
import { apiUrl } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { formatDashboardDateTime, getTranslation, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount } from "@/lib/money";
import {
  CLOSED_PAYMENT_STATUSES,
  getEffectivePaymentStatus,
} from "@/lib/payment-status";

const formatTimeLeft = (expiresAt, now, t) => {
  if (!expiresAt) {
    return t("checkout.noExpiration");
  }

  if (!now) {
    return t("checkout.calculating");
  }

  const diff = new Date(expiresAt).getTime() - now;

  if (diff <= 0) {
    return t("checkout.expired");
  }

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const getPaymentWindow = (payment, now) => {
  if (!payment.expiresAt) {
    return {
      expired: false,
      percentRemaining: 100,
      urgent: false,
    };
  }

  const expiresAt = new Date(payment.expiresAt).getTime();
  const createdAt = payment.createdAt ? new Date(payment.createdAt).getTime() : now;
  const totalWindow = Math.max(expiresAt - createdAt, 1);
  const remaining = Math.max(expiresAt - now, 0);

  return {
    expired: remaining <= 0,
    percentRemaining: Math.max(Math.min((remaining / totalWindow) * 100, 100), 0),
    urgent: remaining > 0 && remaining <= 5 * 60 * 1000,
  };
};

const getCheckoutState = (status, t) => {
  const states = {
    PAID: {
      label: t("checkout.paymentConfirmed"),
      title: t("checkout.paymentComplete"),
      message: t("checkout.paymentCompleteMessage"),
      badgeClassName: "bg-emerald-400 text-black",
      panelClassName: "border-emerald-400/40 bg-emerald-400/10",
      timelineStage: 4,
      canPay: false,
    },
    EXPIRED: {
      label: t("checkout.paymentExpiredLabel"),
      title: t("checkout.paymentExpired"),
      message: t("checkout.paymentExpiredMessage"),
      badgeClassName: "bg-red-400 text-black",
      panelClassName: "border-red-400/40 bg-red-400/10",
      timelineStage: 2,
      canPay: false,
      failed: true,
    },
    CANCELLED: {
      label: t("checkout.paymentCancelledLabel"),
      title: t("checkout.paymentCancelled"),
      message: t("checkout.paymentCancelledMessage"),
      badgeClassName: "bg-red-400 text-black",
      panelClassName: "border-red-400/40 bg-red-400/10",
      timelineStage: 2,
      canPay: false,
      failed: true,
    },
    UNDERPAID: {
      label: t("checkout.underpaidLabel"),
      title: t("checkout.underpaidTitle"),
      message: t("checkout.underpaidMessage"),
      badgeClassName: "bg-amber-300 text-black",
      panelClassName: "border-amber-300/40 bg-amber-300/10",
      timelineStage: 3,
      canPay: false,
      reviewing: true,
    },
    EXPIRED_PAID_REVIEW: {
      label: t("checkout.reviewLabel"),
      title: t("checkout.reviewTitle"),
      message: t("checkout.reviewMessage"),
      badgeClassName: "bg-sky-300 text-black",
      panelClassName: "border-sky-300/40 bg-sky-300/10",
      timelineStage: 3,
      canPay: false,
      reviewing: true,
    },
    CONFIRMING: {
      label: t("checkout.confirmingPaymentLabel"),
      title: t("checkout.confirmingPayment"),
      message: t("checkout.confirmingPaymentMessage"),
      badgeClassName: "bg-sky-300 text-black",
      panelClassName: "border-sky-300/40 bg-sky-300/10",
      timelineStage: 3,
      canPay: false,
      reviewing: true,
    },
  };

  return (
    states[status] || {
      label: t("checkout.awaitingPayment"),
      title: t("checkout.completePayment"),
      message: t("checkout.awaitingMessage"),
      badgeClassName: "bg-yellow-300 text-black",
      panelClassName: "border-yellow-300/40 bg-yellow-300/10",
      timelineStage: 2,
      canPay: true,
    }
  );
};

const getTimelineSteps = (payment, checkoutState, t, createdAtLabel) => [
  {
    title: t("checkout.timelineCreated"),
    description: payment.createdAt
      ? t("checkout.timelineCreatedAt").replace("{date}", createdAtLabel)
      : t("checkout.timelineCreatedDescription"),
    stage: 1,
  },
  {
    title: t("checkout.timelineAwaiting"),
    description: t("checkout.timelineAwaitingDescription").replace("{network}", payment.network),
    stage: 2,
  },
  {
    title: checkoutState.reviewing ? t("checkout.timelineReview") : t("checkout.timelineConfirming"),
    description: checkoutState.reviewing
      ? t("checkout.timelineReviewDescription")
      : t("checkout.timelineConfirmingDescription"),
    stage: 3,
  },
  {
    title: t("checkout.timelineComplete"),
    description: t("checkout.timelineCompleteDescription"),
    stage: 4,
  },
];

const getTimelineDotClassName = (step, checkoutState) => {
  if (checkoutState.failed && step.stage === checkoutState.timelineStage) {
    return "border-red-300 bg-red-300 text-black";
  }

  if (step.stage < checkoutState.timelineStage || checkoutState.timelineStage === 4) {
    return "border-emerald-300 bg-emerald-300 text-black";
  }

  if (step.stage === checkoutState.timelineStage) {
    return checkoutState.reviewing
      ? "border-sky-300 bg-sky-300 text-black"
      : "border-yellow-300 bg-yellow-300 text-black";
  }

  return "border-zinc-700 bg-zinc-950 text-zinc-500";
};

const getTimelineTextClassName = (step, checkoutState) => {
  if (checkoutState.failed && step.stage === checkoutState.timelineStage) {
    return "text-red-100";
  }

  if (step.stage <= checkoutState.timelineStage || checkoutState.timelineStage === 4) {
    return "text-white";
  }

  return "text-zinc-500";
};

const getStatusPillClassName = (status) => {
  if (status === "PAID") {
    return "bg-emerald-400 text-black";
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return "bg-red-400 text-black";
  }

  if (status === "UNDERPAID") {
    return "bg-amber-300 text-black";
  }

  if (status === "EXPIRED_PAID_REVIEW" || status === "CONFIRMING") {
    return "bg-sky-300 text-black";
  }

  return "bg-yellow-300 text-black";
};

const getSafetyChecks = ({ amountLabel, isPayable, payment, t, timeZone }) => {
  if (!isPayable) {
    return [
      {
        label: t("checkout.safetyClosedPayment"),
        value: t("checkout.safetyClosedPaymentDescription"),
      },
      {
        label: t("checkout.safetyMerchantReview"),
        value: t("checkout.safetyMerchantReviewDescription"),
      },
      {
        label: t("checkout.safetyNewSession"),
        value: t("checkout.safetyNewSessionDescription"),
      },
    ];
  }

  return [
    {
      label: t("checkout.safetyExactAmount"),
      value: amountLabel,
    },
    {
      label: t("checkout.safetyCorrectNetwork"),
      value: t("checkout.safetyNetworkValue").replace("{network}", payment.network).replace("{currency}", payment.currency),
    },
    {
      label: t("checkout.safetyTimeWindow"),
      value: payment.expiresAt
        ? t("checkout.safetyBeforeExpiry").replace("{date}", formatDashboardDateTime(payment.expiresAt, timeZone))
        : t("checkout.noExpiration"),
    },
  ];
};

function CheckoutPanel({ children, className = "", as: Component = "section" }) {
  return (
    <Component className={cn("rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-xl shadow-black/20 sm:p-5", className)}>
      {children}
    </Component>
  );
}

function CheckoutInfoCard({ children, className = "" }) {
  return <div className={cn("rounded-lg border border-zinc-800 bg-black/35 p-3", className)}>{children}</div>;
}

function CheckoutButton({ children, className = "", variant = "secondary", ...props }) {
  const variants = {
    primary: "border-white bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200 disabled:cursor-wait",
    secondary: "border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-500",
    light: "border-white bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200",
    muted: "border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function PaymentCheckoutPage() {
  const params = useParams();
  const paymentId = params.id;
  const { language, t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [copiedValue, setCopiedValue] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  const fetchPayment = useCallback(async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/public/payments/${paymentId}`)
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || getTranslation(language, "checkout.notFound"));
        return;
      }

      setError("");
      setPayment(data.payment);
      setLastCheckedAt(new Date().toISOString());
    } catch (error) {
      reportClientError("checkout.payment.load", error);
      setError(getTranslation(language, "checkout.error"));
    } finally {
      setLoading(false);
    }
  }, [language, paymentId]);

  const checkPayment = async () => {
    setChecking(true);
    await fetchPayment();
    setChecking(false);
  };

  const copyText = async (value, key, label) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedValue({ key, label, value: String(value) });

    setTimeout(() => {
      setCopiedValue(null);
    }, 1500);
  };

  useEffect(() => {
    queueMicrotask(fetchPayment);

    const interval = setInterval(() => {
      fetchPayment();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchPayment]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formattedLastCheckedAt = useMemo(() => {
    if (!lastCheckedAt) {
      return t("checkout.calculating");
    }

    return formatDashboardDateTime(lastCheckedAt, timeZone);
  }, [lastCheckedAt, t, timeZone]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-100">
        <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-center shadow-2xl shadow-black/30">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-emerald-300">
            <Loader2 size={18} className="animate-spin" />
          </span>
          <p className="mt-4 text-sm font-semibold text-white">{t("checkout.loading")}</p>
          <p className="mt-1 text-xs text-zinc-500">Crypto Gateway Checkout</p>
        </div>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-center shadow-2xl shadow-black/30">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10 text-red-200">
            <AlertTriangle size={18} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-white">{t("checkout.unavailable")}</h1>
          <p className="mt-2 text-sm leading-6 text-red-100">{error || t("checkout.notFound")}</p>
        </div>
      </main>
    );
  }

  const effectiveStatus = getEffectivePaymentStatus(payment, now);
  const checkoutState = getCheckoutState(effectiveStatus, t);
  const paymentWindow = getPaymentWindow(payment, now);
  const isPayable =
    checkoutState.canPay &&
    !CLOSED_PAYMENT_STATUSES.has(effectiveStatus) &&
    (!payment.expiresAt || !paymentWindow.expired);
  const amountLabel = formatTokenAmount(payment.amount, payment.currency);
  const createdAtLabel = payment.createdAt
    ? formatDashboardDateTime(payment.createdAt, timeZone)
    : "";
  const timelineSteps = getTimelineSteps(payment, checkoutState, t, createdAtLabel);
  const safetyChecks = getSafetyChecks({ amountLabel, isPayable, payment, t, timeZone });

  return (
    <main className="min-h-screen bg-black px-4 py-4 text-zinc-100 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 border-b border-zinc-900 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-300">{t("checkout.brand")}</p>
              <h1 className="mt-2 max-w-2xl text-2xl font-bold leading-tight text-white sm:text-3xl">
                {checkoutState.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                {checkoutState.message}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${checkoutState.badgeClassName}`}>
                {checkoutState.label}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                {payment.network}
              </span>
              {payment.mode === "TEST" && (
                <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-xs font-bold text-sky-100">
                  TEST
                </span>
              )}
            </div>
          </div>
        </header>

        <section className={`mb-5 rounded-lg border p-4 ${checkoutState.panelClassName}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700/60 bg-black/25 text-white">
                {isPayable ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
              </span>
              <div>
                <p className="text-sm font-bold text-white">
                  {isPayable
                    ? t("checkout.sendExactAmount")
                    : checkoutState.reviewing
                      ? t("checkout.reviewingPayment")
                      : t("checkout.doNotSend")}
                </p>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-300">
                  {isPayable
                    ? t("checkout.assetWarning").replace("{currency}", payment.currency).replace("{network}", payment.network)
                    : checkoutState.message}
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-300">
              {t("checkout.lastChecked")}: {formattedLastCheckedAt}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <CheckoutPanel>
            <div className="border-b border-zinc-800 pb-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-500">{t("checkout.amountDue")}</p>
                <CheckoutButton
                  type="button"
                  onClick={() => copyText(payment.amount, "amount", t("checkout.amountDue"))}
                  disabled={!isPayable}
                  variant="secondary"
                  className="shrink-0 px-3"
                >
                  <Clipboard size={15} />
                  {copiedValue?.key === "amount" ? t("checkout.amountCopied") : t("checkout.copyAmount")}
                </CheckoutButton>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-normal text-white sm:text-4xl">{amountLabel}</p>
            </div>
            {copiedValue?.key === "amount" && (
              <CopyConfirmation copiedText={t("common.copied")} label={copiedValue.label} value={amountLabel} />
            )}

            <div
              className={`mx-auto my-5 w-fit rounded-lg border p-3 ${
                isPayable ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-800 opacity-50"
              }`}
            >
              <QRCodeSVG value={payment.walletAddress} size={214} />
            </div>

            <p className="text-center text-sm text-zinc-400">
              {isPayable ? t("checkout.scanWalletQr") : t("checkout.qrDisabled")}
            </p>

            <CheckoutInfoCard className="mt-5 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{t("checkout.walletAddress")}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t("checkout.copyAddressExactly")}
                  </p>
                </div>
                <CheckoutButton
                  type="button"
                  onClick={() => copyText(payment.walletAddress, "wallet", t("checkout.walletAddress"))}
                  disabled={!isPayable}
                  variant="light"
                  className="shrink-0 px-3"
                >
                  <Clipboard size={15} />
                  {copiedValue?.key === "wallet" ? t("common.copied") : t("checkout.copyAddress")}
                </CheckoutButton>
              </div>
              <p className="break-all rounded-lg border border-zinc-800 bg-black px-3 py-2 font-mono text-xs leading-5 text-zinc-200">
                {payment.walletAddress}
              </p>
              {copiedValue?.key === "wallet" && (
                <CopyConfirmation copiedText={t("common.copied")} label={copiedValue.label} value={payment.walletAddress} />
              )}
            </CheckoutInfoCard>

            <CheckoutInfoCard className="mt-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">{t("checkout.paymentWindow")}</p>
                <p className={`inline-flex items-center gap-1.5 text-sm font-bold ${paymentWindow.urgent ? "text-amber-200" : "text-zinc-100"}`}>
                  <Clock3 size={14} />
                  <span>{formatTimeLeft(payment.expiresAt, now, t)}</span>
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    paymentWindow.expired
                      ? "bg-red-400"
                      : paymentWindow.urgent
                        ? "bg-amber-300"
                        : "bg-emerald-300"
                  }`}
                  style={{ width: `${paymentWindow.percentRemaining}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {payment.expiresAt
                  ? formatDashboardDateTime(payment.expiresAt, timeZone)
                  : t("checkout.noExpiration")}
              </p>
            </CheckoutInfoCard>

            <div className={`mt-3 rounded-lg border p-3 ${isPayable ? "border-emerald-400/30 bg-emerald-400/10" : "border-red-400/30 bg-red-400/10"}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className={isPayable ? "text-emerald-200" : "text-red-100"} />
                <p className="text-sm font-bold text-white">{t("checkout.safetyTitle")}</p>
              </div>
              <div className="mt-3 space-y-2">
                {safetyChecks.map((item) => (
                  <div key={item.label} className="rounded-lg border border-zinc-800 bg-black/35 px-3 py-2">
                    <p className="text-xs font-semibold text-zinc-500">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-zinc-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CheckoutPanel>

          <CheckoutPanel>
            <div className="mb-5 flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-500">{t("checkout.status")}</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusPillClassName(
                    effectiveStatus
                  )}`}
                >
                  {effectiveStatus}
                </span>
              </div>
              <CheckoutButton
                type="button"
                onClick={checkPayment}
                disabled={checking}
                variant="primary"
                className="w-full disabled:opacity-60 md:w-auto"
              >
                {checking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                {checking ? t("checkout.checking") : t("checkout.checkStatus")}
              </CheckoutButton>
            </div>

            <CheckoutInfoCard className="mb-5 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-300" />
                <p className="text-sm font-bold text-white">{t("checkout.timeline")}</p>
              </div>
              <div className="space-y-4">
                {timelineSteps.map((step, index) => (
                  <div className="flex gap-3" key={step.stage}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${getTimelineDotClassName(
                          step,
                          checkoutState
                        )}`}
                      >
                        {index + 1}
                      </div>
                      {index < timelineSteps.length - 1 && (
                        <div className="mt-2 h-8 w-px bg-zinc-800" />
                      )}
                    </div>
                    <div className="min-w-0 pb-2">
                      <p className={`font-semibold ${getTimelineTextClassName(step, checkoutState)}`}>
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-zinc-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CheckoutInfoCard>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <CheckoutInfoCard>
                <p className="mb-1 text-xs text-zinc-500">{t("checkout.orderId")}</p>
                <p className="break-all font-semibold">
                  {payment.orderId || t("checkout.notProvided")}
                </p>
              </CheckoutInfoCard>

              <CheckoutInfoCard>
                <p className="mb-1 text-xs text-zinc-500">{t("checkout.customer")}</p>
                <p className="break-all">
                  {payment.customerEmail || t("checkout.notProvided")}
                </p>
              </CheckoutInfoCard>

              <CheckoutInfoCard>
                <p className="mb-1 text-xs text-zinc-500">{t("checkout.paymentId")}</p>
                <p className="break-all font-mono text-sm">{payment.id}</p>
              </CheckoutInfoCard>

              <CheckoutInfoCard>
                <p className="mb-1 text-xs text-zinc-500">{t("checkout.transactionHash")}</p>
                <p className="break-all font-mono text-sm">
                  {payment.txHash || t("checkout.notConfirmed")}
                </p>
              </CheckoutInfoCard>
            </div>
          </CheckoutPanel>
        </div>

        <footer className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
            <p className="leading-6">{t("checkout.autoRefreshDescription")}</p>
            <div className="flex flex-wrap gap-2">
              <CheckoutButton
                type="button"
                onClick={() => copyText(payment.walletAddress, "wallet-bottom", t("checkout.walletAddress"))}
                disabled={!isPayable}
                variant="muted"
              >
                <WalletCards size={15} />
                {copiedValue?.key === "wallet-bottom" ? t("checkout.addressCopied") : t("checkout.copyWallet")}
              </CheckoutButton>
              <CheckoutButton
                type="button"
                onClick={() => copyText(payment.id, "payment-id", t("checkout.paymentId"))}
                variant="muted"
              >
                <Clipboard size={15} />
                {copiedValue?.key === "payment-id" ? t("checkout.idCopied") : t("checkout.copyPaymentId")}
              </CheckoutButton>
            </div>
          </div>
          {(copiedValue?.key === "wallet-bottom" || copiedValue?.key === "payment-id") && (
            <CopyConfirmation copiedText={t("common.copied")} label={copiedValue.label} value={copiedValue.value} />
          )}
        </footer>
      </div>
    </main>
  );
}

function CopyConfirmation({ copiedText, label, value }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
      <p className="flex items-center gap-1.5 font-bold">
        <CheckCircle2 size={13} />
        <span>{label}: {copiedText}</span>
      </p>
      <p className="mt-1 break-all font-mono text-emerald-50">{value}</p>
    </div>
  );
}
