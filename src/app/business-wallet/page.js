"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";

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
const MAX_PAYOUT_AMOUNT = 1000000;
const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

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
  const [recentActivity, setRecentActivity] = useState([]);

  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(null);

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const [paymentsRes, settlementsRes, activityRes] = await Promise.all([
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
      ]);

      if (paymentsRes.status === 401 || settlementsRes.status === 401 || activityRes.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const paymentsData = await paymentsRes.json();
      const settlementsData = await settlementsRes.json();
      const activityData = await activityRes.json();

      if (!paymentsRes.ok || !settlementsRes.ok || !activityRes.ok) {
        setNotice({
          type: "error",
          message:
            paymentsData.message ||
            settlementsData.message ||
            activityData.message ||
            "Business wallet data could not be refreshed.",
        });
        return;
      }

      setPaymentStats(
        paymentsData.stats || { total: 0, paid: 0, pending: 0, expired: 0 }
      );
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
      setRecentActivity(activityData.auditLogs || []);
    } catch {
      setNotice({
        type: "error",
        message: "Business wallet data could not be refreshed.",
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
    const numericAmount = Number(amount);
    const available = Number(settlements.summary.available || 0);

    if (!Number.isFinite(numericAmount)) {
      setNotice({ type: "error", message: "Please enter a valid payout amount." });
      return;
    }

    if (numericAmount < MIN_PAYOUT_AMOUNT || numericAmount > MAX_PAYOUT_AMOUNT) {
      setNotice({
        type: "error",
        message: `Payout amount must be between ${MIN_PAYOUT_AMOUNT} and ${MAX_PAYOUT_AMOUNT} USDT.`,
      });
      return;
    }

    if (String(amount).split(".")[1]?.length > 2) {
      setNotice({ type: "error", message: "Payout amount can have at most 2 decimal places." });
      return;
    }

    if (numericAmount > available) {
      setNotice({ type: "error", message: "Payout amount exceeds available balance." });
      return;
    }

    if (!walletAddress.trim()) {
      setNotice({ type: "error", message: "Please enter a payout wallet address." });
      return;
    }

    if (!TRON_ADDRESS_PATTERN.test(walletAddress.trim())) {
      setNotice({ type: "error", message: "Please enter a valid TRON wallet address." });
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
          amount: numericAmount,
          walletAddress: walletAddress.trim(),
          note: note || undefined,
        }),
      });
    const data = await response.json();
    if (!response.ok) {
      setNotice({
        type: "error",
        message: data.errors?.join(" ") || data.message || "Payout request failed.",
      });
      return;
    }

    setAmount("");
    setWalletAddress("");
    setNote("");
    setNotice({ type: "success", message: data.message || "Payout request created." });
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
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Recent Activity</h2>
              <p className="text-zinc-500">Latest payment, webhook, and security events.</p>
            </div>
            <a
              href="/business-wallet/merchants"
              className="w-fit rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
            >
              View all activity
            </a>
          </div>

          {recentActivity.some((log) => getActivityMeta(log.action).critical) && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Recent webhook or security activity needs review.
            </div>
          )}

          {recentActivity.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-500">
              No activity recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {recentActivity.map((log) => {
                const activityMeta = getActivityMeta(log.action);

                return (
                  <div key={log.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[120px_1fr_180px] md:items-center">
                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>
                        {activityMeta.label}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{log.message || formatActivityAction(log.action)}</p>
                      <p className="mt-1 break-all text-xs text-zinc-500">
                        {formatActivityAction(log.action)} · {log.targetType || "merchant"}: {log.targetId || "-"}
                      </p>
                    </div>
                    <p className="text-zinc-500 md:text-right">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Finance</h2>
              <p className="text-zinc-500">Request manual payouts from confirmed paid volume.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Available</p><p className="break-words text-3xl font-bold md:text-4xl">{settlements.summary.available} {settlements.summary.currency}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Gross Paid</p><p className="break-words text-3xl font-bold md:text-4xl">{settlements.summary.grossPaid} {settlements.summary.currency}</p></div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-zinc-500 text-sm">Reserved</p><p className="break-words text-3xl font-bold md:text-4xl">{settlements.summary.reservedForPayouts} {settlements.summary.currency}</p></div>
          </div>

          <form onSubmit={createPayoutRequest} className="grid grid-cols-1 lg:grid-cols-[160px_1fr_1fr_auto] gap-3 mb-4">
            <input
              type="number"
              min={MIN_PAYOUT_AMOUNT}
              max={Math.min(Number(settlements.summary.available || 0), MAX_PAYOUT_AMOUNT)}
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none"
            />
            <input type="text" placeholder="TRC20 payout wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none" />
            <input type="text" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} className="p-3 rounded-xl border border-zinc-300 bg-zinc-100 outline-none" />
            <button className="px-6 py-3 rounded-xl bg-black text-white font-semibold">Request Payout</button>
          </form>
          <p className="mb-4 text-sm text-zinc-500">
            Minimum payout is {MIN_PAYOUT_AMOUNT} USDT. Available now: {settlements.summary.available} {settlements.summary.currency}. Use a valid TRC20 wallet address.
          </p>

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
