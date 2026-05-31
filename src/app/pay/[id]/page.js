"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";

export default function PaymentCheckoutPage() {
  const params = useParams();
  const paymentId = params.id;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPayment = async () => {
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
  };

  useEffect(() => {
    fetchPayment();

    const interval = setInterval(() => {
      fetchPayment();
    }, 10000);

    return () => clearInterval(interval);
  }, [paymentId]);

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

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Complete Payment
        </h1>

        <p className="text-zinc-400 mb-8">
          Send the exact amount to the wallet below.
        </p>

        <div className="bg-white p-4 rounded-2xl inline-block mb-6">
          <QRCodeSVG value={payment.walletAddress} size={220} />
        </div>

        <div className="space-y-4 text-left mb-6">
          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Amount</p>
            <p className="text-2xl font-bold">
              {payment.amount} {payment.currency}
            </p>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Network</p>
            <p className="font-semibold">{payment.network}</p>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Wallet Address</p>
            <p className="break-all text-sm">
              {payment.walletAddress}
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(payment.walletAddress);
                alert("Wallet copied");
              }}
              className="mt-3 bg-white text-black px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition"
            >
              Copy Address
            </button>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">Status</p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                payment.status === "PAID"
                  ? "bg-green-500 text-black"
                  : "bg-yellow-500 text-black"
              }`}
            >
              {payment.status}
            </span>
          </div>
        </div>

        <p className="text-zinc-500 text-sm">
          Payment ID: {payment.id}
        </p>
      </div>
    </main>
  );
}