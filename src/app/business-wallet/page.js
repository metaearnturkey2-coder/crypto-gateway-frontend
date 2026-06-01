"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";

function payoutStatusClass(status) {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  }
  if (status === "REJECTED") {
    return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  }
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
}

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
  });

  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [note, setNote] = useState("");

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const paymentsRes = await fetch(`http://localhost:5000/api/payments?limit=50&t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const paymentsData = await paymentsRes.json();
    setPaymentStats(
      paymentsData.stats || { total: 0, paid: 0, pending: 0, expired: 0 }
    );

    const settlementsRes = await fetch(`http://localhost:5000/api/merchant/settlements?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const settlementsData = await settlementsRes.json();
    setSettlements({
      summary: settlementsData.summary || {
        network: "TRC20",
        currency: "USDT",
        available: 0,
        grossPaid: 0,
        reservedForPayouts: 0,
      },
      payoutRequests: settlementsData.payoutRequests || [],
    });
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
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid payout amount");
      return;
    }
    if (!walletAddress.trim()) {
      alert("Please enter a payout wallet address");
      return;
    }

    const token = localStorage.getItem("token");
    await fetch("http://localhost:5000/api/merchant/payout-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: numericAmount,
        walletAddress: walletAddress.trim(),
        note: note || undefined,
      }),
    });

    setAmount("");
    setWalletAddress("");
    setNote("");
    await loadDashboard();
  };

  if (loading) {
    return (
      <OverviewShell>
        <p className="text-zinc-500">Loading...</p>
      </OverviewShell>
    );
  }

  return (
    <OverviewShell>
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-2xl font-semibold mb-1">Overview</h2>
          <p className="text-zinc-500 mb-4">Real-time payment performance snapshot.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500">Total Payments</p><p className="text-4xl font-bold">{paymentStats.total}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500">Paid Payments</p><p className="text-4xl font-bold">{paymentStats.paid}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500">Pending Payments</p><p className="text-4xl font-bold">{paymentStats.pending}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500">Expired Payments</p><p className="text-4xl font-bold">{paymentStats.expired}</p></div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Finance</h2>
              <p className="text-zinc-500">Request manual payouts from confirmed paid volume.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm">
                {settlements.summary.network} {settlements.summary.currency}
              </span>
              <button
                onClick={loadDashboard}
                className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Available</p><p className="text-5xl font-bold">{settlements.summary.available} {settlements.summary.currency}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Gross Paid</p><p className="text-5xl font-bold">{settlements.summary.grossPaid} {settlements.summary.currency}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Reserved</p><p className="text-5xl font-bold">{settlements.summary.reservedForPayouts} {settlements.summary.currency}</p></div>
          </div>

          <form onSubmit={createPayoutRequest} className="grid grid-cols-1 lg:grid-cols-[160px_1fr_1fr_auto] gap-3 mb-4">
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none" />
            <input type="text" placeholder="TRC20 payout wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none" />
            <input type="text" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none" />
            <button className="px-6 py-3 rounded-xl bg-black text-white font-semibold">Request Payout</button>
          </form>

          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            {settlements.payoutRequests.length === 0 ? (
              <p className="p-4 text-zinc-500">No payout requests yet.</p>
            ) : (
              settlements.payoutRequests.map((request) => (
                <div key={request.id} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_160px_180px] gap-3 p-4 border-t border-zinc-200 first:border-t-0">
                  <div>
                    <p className="font-semibold">{request.amount} {request.currency}</p>
                    <p className="text-zinc-500 text-sm">{request.network}</p>
                  </div>
                  <div>
                    <p className="break-all">{request.walletAddress}</p>
                    {request.note && <p className="text-zinc-500 text-sm">{request.note}</p>}
                  </div>
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${payoutStatusClass(request.status)}`}>{request.status}</span>
                  </div>
                  <p className="text-zinc-500 lg:text-right">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </OverviewShell>
  );
}
