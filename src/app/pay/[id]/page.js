"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

const formatTimeLeft = (expiresAt, now) => {
  if (!expiresAt) {
    return "No expiration";
  }

  if (!now) {
    return "Calculating...";
  }

  const diff = new Date(expiresAt).getTime() - now;

  if (diff <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const getPaymentStatusClassName = (status) => {
  if (status === "PAID") {
    return "bg-green-500 text-black";
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return "bg-red-500 text-black";
  }

  return "bg-yellow-500 text-black";
};

const getCheckoutState = (status) => {
  if (status === "PAID") {
    return {
      label: "Payment confirmed",
      title: "Payment Complete",
      message: "Your transaction has been confirmed. You can close this page.",
      tone: "success",
      badgeClassName: "bg-green-500 text-black",
      panelClassName: "border-green-500/40 bg-green-500/10",
      canPay: false,
    };
  }

  if (status === "EXPIRED") {
    return {
      label: "Payment expired",
      title: "Payment Expired",
      message: "This checkout session is no longer accepting payments.",
      tone: "danger",
      badgeClassName: "bg-red-500 text-black",
      panelClassName: "border-red-500/40 bg-red-500/10",
      canPay: false,
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Payment cancelled",
      title: "Payment Cancelled",
      message: "This payment was cancelled by the merchant.",
      tone: "danger",
      badgeClassName: "bg-red-500 text-black",
      panelClassName: "border-red-500/40 bg-red-500/10",
      canPay: false,
    };
  }

  return {
    label: "Awaiting payment",
    title: "Complete Payment",
    message: "Send the exact amount on the selected network before time runs out.",
    tone: "pending",
    badgeClassName: "bg-yellow-500 text-black",
    panelClassName: "border-yellow-500/40 bg-yellow-500/10",
    canPay: true,
  };
};

const getStepClassName = (active, complete) => {
  if (complete) return "border-green-500/40 bg-green-500/10 text-green-100";
  if (active) return "border-yellow-500/40 bg-yellow-500/10 text-yellow-100";
  return "border-zinc-800 bg-zinc-950 text-zinc-400";
};

export default function PaymentCheckoutPage() {
  const params = useParams();
  const paymentId = params.id;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [copiedKey, setCopiedKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const fetchPayment = useCallback(async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/public/payments/${paymentId}`)
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Payment not found");
        return;
      }

      setError("");
      setPayment(data.payment);
    } catch (error) {
      console.error(error);
      setError("Payment checkout error. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const checkPayment = async () => {
    setChecking(true);
    await fetchPayment();
    setChecking(false);
  };

  const copyText = async (value, key) => {
    await navigator.clipboard.writeText(String(value));
    setCopiedKey(key);

    setTimeout(() => {
      setCopiedKey("");
    }, 1500);
  };

  useEffect(() => {
    const refreshPayment = () => {
      fetchPayment();
    };

    refreshPayment();

    const interval = setInterval(() => {
      refreshPayment();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchPayment]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading payment...
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-2xl font-bold">Payment unavailable</h1>
          <p className="mt-2 text-red-100">{error || "Payment not found"}</p>
        </div>
      </main>
    );
  }

  const checkoutState = getCheckoutState(payment.status);
  const isPayable =
    checkoutState.canPay &&
    (!payment.expiresAt || new Date(payment.expiresAt).getTime() > now);
  const amountLabel = `${payment.amount} ${payment.currency}`;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-zinc-500 text-sm">Crypto Gateway Checkout</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {checkoutState.title}
            </h1>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${checkoutState.badgeClassName}`}
          >
            {checkoutState.label}
          </span>
        </header>

        <div
          className={`border rounded-2xl p-4 mb-6 ${checkoutState.panelClassName}`}
        >
          <p className="font-semibold">{checkoutState.message}</p>
          {isPayable && (
            <p className="text-sm text-zinc-300 mt-1">
              Only send {payment.currency} on {payment.network}. Sending a different asset or network may result in loss of funds.
            </p>
          )}
          {!isPayable && (
            <p className="text-sm text-zinc-300 mt-1">
              Do not send funds to this address unless the merchant creates a new checkout session.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <div
              className={`mx-auto mb-4 w-fit rounded-xl p-3 ${
                isPayable ? "bg-white" : "bg-zinc-800 opacity-50"
              }`}
            >
              <QRCodeSVG value={payment.walletAddress} size={190} />
            </div>
            {!isPayable && (
              <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                This QR code is disabled for the current payment status.
              </p>
            )}

            <p className="text-zinc-400 text-sm">Amount due</p>
            <p className="text-3xl font-bold mt-1">
              {amountLabel}
            </p>
            <button
              onClick={() => copyText(payment.amount, "amount")}
              disabled={!isPayable}
              className="mt-3 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copiedKey === "amount" ? "Amount Copied" : "Copy Amount"}
            </button>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Network</p>
                <p className="font-semibold">{payment.network}</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Time left</p>
                <p className="font-semibold">
                  {formatTimeLeft(payment.expiresAt, now)}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={`rounded-xl border p-3 ${getStepClassName(isPayable, payment.status === "PAID")}`}>
                <p className="text-xs uppercase tracking-wide opacity-70">Step 1</p>
                <p className="mt-1 font-semibold">Copy amount</p>
              </div>
              <div className={`rounded-xl border p-3 ${getStepClassName(isPayable, payment.status === "PAID")}`}>
                <p className="text-xs uppercase tracking-wide opacity-70">Step 2</p>
                <p className="mt-1 font-semibold">Send on {payment.network}</p>
              </div>
              <div className={`rounded-xl border p-3 ${getStepClassName(payment.status === "PAID", payment.status === "PAID")}`}>
                <p className="text-xs uppercase tracking-wide opacity-70">Step 3</p>
                <p className="mt-1 font-semibold">Confirmation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Status</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(
                    payment.status
                  )}`}
                >
                  {payment.status}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Order ID</p>
                <p className="break-all font-semibold">
                  {payment.orderId || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Customer</p>
                <p className="break-all">
                  {payment.customerEmail || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Expires</p>
                <p>
                  {payment.expiresAt
                    ? new Date(payment.expiresAt).toLocaleString()
                    : "No expiration"}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                  <p className="text-zinc-500 text-xs">Wallet address</p>
                  <p className="text-sm text-zinc-400">
                    Copy this address exactly.
                  </p>
                </div>

                <button
                  onClick={() => copyText(payment.walletAddress, "wallet")}
                  disabled={!isPayable}
                  className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copiedKey === "wallet" ? "Copied" : "Copy Address"}
                </button>
              </div>

              <p className="break-all rounded-lg bg-black p-3 font-mono text-sm text-zinc-200">
                {payment.walletAddress}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={checkPayment}
                disabled={checking}
                className="bg-blue-500 text-black px-5 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:cursor-wait disabled:opacity-60"
              >
                {checking ? "Checking..." : "Check Payment Status"}
              </button>

              <button
                onClick={() => copyText(payment.walletAddress, "wallet-bottom")}
                disabled={!isPayable}
                className="bg-zinc-800 px-5 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copiedKey === "wallet-bottom" ? "Address Copied" : "Copy Wallet"}
              </button>

              <button
                onClick={() => copyText(payment.id, "payment-id")}
                className="bg-zinc-800 px-5 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition"
              >
                {copiedKey === "payment-id" ? "ID Copied" : "Copy Payment ID"}
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 mb-1">Payment ID</p>
              <p className="break-all font-mono">{payment.id}</p>
            </div>

            <div>
              <p className="text-zinc-500 mb-1">Transaction hash</p>
              <p className="break-all font-mono">
                {payment.txHash || "Not confirmed yet"}
              </p>
            </div>

            <div>
              <p className="text-zinc-500 mb-1">Auto refresh</p>
              <p>Payment status updates every 10 seconds.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
