"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";

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
      badgeClassName: "bg-red-500 text-black",
      panelClassName: "border-red-500/40 bg-red-500/10",
      canPay: false,
    };
  }

  return {
    label: "Awaiting payment",
    title: "Complete Payment",
    message: "Send the exact amount on the selected network before time runs out.",
    badgeClassName: "bg-yellow-500 text-black",
    panelClassName: "border-yellow-500/40 bg-yellow-500/10",
    canPay: true,
  };
};

export default function PaymentCheckoutPage() {
  const params = useParams();
  const paymentId = params.id;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchPayment = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/public/payments/${paymentId}`
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Payment not found");
        return;
      }

      setPayment(data.payment);
    } catch (error) {
      console.error(error);
      alert("Payment checkout error");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const checkPayment = async () => {
    setChecking(true);
    await fetchPayment();
    setChecking(false);
  };

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(payment.walletAddress);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Payment not found
      </main>
    );
  }

  const checkoutState = getCheckoutState(payment.status);
  const isPayable =
    checkoutState.canPay &&
    (!payment.expiresAt || new Date(payment.expiresAt).getTime() > now);

  return (
    <main className="min-h-screen bg-black text-white px-5 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-zinc-500 text-sm">Crypto Gateway Checkout</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <div
              className={`mx-auto mb-5 w-fit rounded-2xl p-4 ${
                isPayable ? "bg-white" : "bg-zinc-800 opacity-50"
              }`}
            >
              <QRCodeSVG value={payment.walletAddress} size={230} />
            </div>

            <p className="text-zinc-400 text-sm">Amount due</p>
            <p className="text-4xl font-bold mt-1">
              {payment.amount} {payment.currency}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Network</p>
                <p className="font-semibold">{payment.network}</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Time left</p>
                <p className="font-semibold">
                  {formatTimeLeft(payment.expiresAt, now)}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Status</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClassName(
                    payment.status
                  )}`}
                >
                  {payment.status}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Order ID</p>
                <p className="break-all font-semibold">
                  {payment.orderId || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Customer</p>
                <p className="break-all">
                  {payment.customerEmail || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-1">Expires</p>
                <p>
                  {payment.expiresAt
                    ? new Date(payment.expiresAt).toLocaleString()
                    : "No expiration"}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                  <p className="text-zinc-500 text-xs">Wallet address</p>
                  <p className="text-sm text-zinc-400">
                    Copy this address exactly.
                  </p>
                </div>

                <button
                  onClick={copyWalletAddress}
                  disabled={!isPayable}
                  className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? "Copied" : "Copy Address"}
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
                onClick={copyWalletAddress}
                disabled={!isPayable}
                className="bg-zinc-800 px-5 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "Address Copied" : "Copy Wallet"}
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
