"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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

const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  }

  if (status === "FAILED") {
    return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  }

  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

const getPaymentStatusClassName = (status) => {
  if (status === "PAID") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  }

  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
};

const getAuditActionClassName = (action) => {
  if (action.includes("regenerated")) {
    return "bg-red-500 text-black";
  }

  if (action.includes("cancel")) {
    return "bg-red-500 text-black";
  }

  if (action.includes("verified") || action.includes("created")) {
    return "bg-green-500 text-black";
  }

  return "bg-zinc-700 text-white";
};

const getPayoutStatusClassName = (status) => {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-green-500 text-black";
  }

  if (status === "REJECTED") {
    return "bg-red-500 text-black";
  }

  return "bg-yellow-500 text-black";
};

const DetailField = ({ label, value, actionLabel, onAction }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-zinc-500 text-xs mb-1">{label}</p>
        <p className="break-all text-sm">{value || "Not provided"}</p>
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 bg-zinc-800 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

const buildPaymentTimeline = (payment, webhooks) => {
  const items = [
    {
      label: "Created",
      detail: new Date(payment.createdAt).toLocaleString(),
      tone: "complete",
    },
    {
      label: "Awaiting payment",
      detail: `Expires ${new Date(payment.expiresAt).toLocaleString()}`,
      tone: payment.status === "PENDING" ? "active" : "complete",
    },
  ];

  if (payment.status === "PAID") {
    items.push({
      label: "Paid",
      detail: payment.txHash || "Transaction confirmed",
      tone: "complete",
    });
  }

  if (payment.status === "EXPIRED") {
    items.push({
      label: "Expired",
      detail: "Checkout is no longer payable",
      tone: "failed",
    });
  }

  if (payment.status === "CANCELLED") {
    items.push({
      label: "Cancelled",
      detail: "Merchant cancelled this payment",
      tone: "failed",
    });
  }

  if (webhooks.length > 0) {
    const latestWebhook = webhooks[0];
    items.push({
      label: `Webhook ${latestWebhook.status}`,
      detail: `${latestWebhook.event} - ${latestWebhook.attempts}/${latestWebhook.maxAttempts} attempts`,
      tone: latestWebhook.status === "SUCCESS" ? "complete" : "active",
    });
  }

  return items;
};

export default function DashboardPage() {
  const primaryButtonClass =
    "bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40";
  const dangerButtonClass =
    "bg-red-500 text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40";
  const [merchant, setMerchant] = useState(null);
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    expired: 0,
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [auditActions, setAuditActions] = useState([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState([]);
  const [apiUsage, setApiUsage] = useState({
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      createCalls: 0,
      statusCalls: 0,
    },
    recentCalls: [],
  });
  const [settlements, setSettlements] = useState({
    summary: {
      grossPaid: 0,
      reservedForPayouts: 0,
      available: 0,
      currency: "USDT",
      network: "TRC20",
    },
    payoutRequests: [],
  });
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutWalletAddress, setPayoutWalletAddress] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [webhookHistory, setWebhookHistory] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState("ALL");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return localStorage.getItem("dashboardTheme") !== "light";
  });

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }

    try {
      const dashboardResponse = await fetch(
        "http://localhost:5000/api/merchant/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const dashboardData = await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        alert(dashboardData.message || "Dashboard auth error");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setMerchant(dashboardData.merchant);

      setCallbackUrl(dashboardData.merchant?.callbackUrl || "");

      const paymentParams = new URLSearchParams({
        page: "1",
        limit: "3",
      });

      const paymentsResponse = await fetch(
        `http://localhost:5000/api/payments?${paymentParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const paymentsData = await paymentsResponse.json();

      setPaymentStats(
        paymentsData.stats || {
          total: 0,
          paid: 0,
          pending: 0,
          expired: 0,
        }
      );

      const auditParams = new URLSearchParams({
        page: String(auditPage),
        limit: String(auditPagination.limit),
        action: auditActionFilter,
        targetType: auditTargetTypeFilter,
      });

      const auditResponse = await fetch(
        `http://localhost:5000/api/merchant/audit-logs?${auditParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const auditData = await auditResponse.json();

      if (auditResponse.ok) {
        setAuditLogs(auditData.auditLogs || []);
        setAuditPagination({
          page: auditData.page || auditPage,
          limit: auditData.limit || auditPagination.limit,
          totalCount: auditData.totalCount || 0,
          totalPages: auditData.totalPages || 1,
        });
        setAuditActions(auditData.actions || []);
        setAuditTargetTypes(auditData.targetTypes || []);
      }

      const apiUsageResponse = await fetch(
        "http://localhost:5000/api/merchant/api-usage",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const apiUsageData = await apiUsageResponse.json();

      if (apiUsageResponse.ok) {
        setApiUsage({
          summary: apiUsageData.summary || {
            total: 0,
            successful: 0,
            failed: 0,
            createCalls: 0,
            statusCalls: 0,
          },
          recentCalls: apiUsageData.recentCalls || [],
        });
      }

      const settlementsResponse = await fetch(
        "http://localhost:5000/api/merchant/settlements",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const settlementsData = await settlementsResponse.json();

      if (settlementsResponse.ok) {
        setSettlements({
          summary: settlementsData.summary || {
            grossPaid: 0,
            reservedForPayouts: 0,
            available: 0,
            currency: "USDT",
            network: "TRC20",
          },
          payoutRequests: settlementsData.payoutRequests || [],
        });
      }
    } catch (error) {
      console.error(error);
      alert("Dashboard error");
    } finally {
      setLoading(false);
    }
  }, [
    auditActionFilter,
    auditPage,
    auditPagination.limit,
    auditTargetTypeFilter,
  ]);

  const saveCallbackUrl = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/callback-url",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            callbackUrl,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Callback URL update error");
    }
  };

  const regenerateApiKey = async () => {
    const confirmed = window.confirm(
      "Regenerating your API key will immediately invalidate the current key. Continue?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/api-key/regenerate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "API key regenerate error");
        return;
      }

      setMerchant(data.merchant);
      setCallbackUrl(data.merchant?.callbackUrl || "");
      alert(data.message);
    } catch (error) {
      console.error(error);
      alert("API key regenerate error");
    }
  };

  const regenerateWebhookSecret = async () => {
    const confirmed = window.confirm(
      "Regenerating your webhook secret will require updating signature verification in your webhook receiver. Continue?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/webhook-secret/regenerate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Webhook secret regenerate error");
        return;
      }

      setMerchant(data.merchant);
      setCallbackUrl(data.merchant?.callbackUrl || "");
      alert(data.message);
    } catch (error) {
      console.error(error);
      alert("Webhook secret regenerate error");
    }
  };

  const verifyPayment = async (paymentId) => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${paymentId}/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      alert(data.message);

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Verify payment error");
    }
  };

  const cancelPayment = async (paymentId) => {
    const confirmed = window.confirm(
      "Cancel this payment? The checkout will no longer be payable."
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${paymentId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      alert(data.message);

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Cancel payment error");
    }
  };

  const openPaymentDetails = async (payment) => {
    const token = localStorage.getItem("token");

    setSelectedPayment(payment);
    setWebhookHistory([]);
    setDetailsLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${payment.id}/webhooks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Webhook history error");
        return;
      }

      setWebhookHistory(data.webhooks || []);
    } catch (error) {
      console.error(error);
      alert("Webhook history error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const retryWebhook = async (webhookId) => {
    const token = localStorage.getItem("token");

    if (!selectedPayment) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${selectedPayment.id}/webhooks/${webhookId}/retry`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      alert(data.message);

      await openPaymentDetails(selectedPayment);
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Webhook retry error");
    }
  };


  const createPayoutRequest = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const numericAmount = Number(payoutAmount);

    if (!numericAmount || numericAmount <= 0) {
      alert("Please enter a valid payout amount");
      return;
    }

    if (!payoutWalletAddress.trim()) {
      alert("Please enter a payout wallet address");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/payout-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: numericAmount,
            walletAddress: payoutWalletAddress,
            note: payoutNote || undefined,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);

      if (!response.ok) {
        return;
      }

      setPayoutAmount("");
      setPayoutWalletAddress("");
      setPayoutNote("");
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Create payout request error");
    }
  };

  useEffect(() => {
    const refreshDashboard = () => {
      fetchDashboard();
    };

    refreshDashboard();

    const interval = setInterval(() => {
      refreshDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.remove("light-dashboard");
      localStorage.setItem("dashboardTheme", "dark");
    } else {
      document.documentElement.classList.add("light-dashboard");
      localStorage.setItem("dashboardTheme", "light");
    }
  }, [isDarkTheme]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!event.target.closest("[data-user-menu]")) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("click", closeOnOutside);
    return () => window.removeEventListener("click", closeOnOutside);
  }, []);

  const isLightTheme = !isDarkTheme;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="relative z-50 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Crypto Gateway</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-wide">Merchant Panel</p>
            </div>
          </div>

          <div className="relative z-[60]" data-user-menu>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 font-semibold hover:bg-zinc-800 transition"
              aria-label="Open user menu"
            >
              {(merchant?.name?.[0] || merchant?.email?.[0] || "M").toUpperCase()}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden z-[100]">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{merchant?.email}</p>
                  <p className="text-xs text-zinc-500">Merchant account</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500 truncate">
                      UID: {merchant?.id || "-"}
                    </p>
                    <button
                      onClick={() => {
                        if (!merchant?.id) {
                          return;
                        }
                        navigator.clipboard.writeText(merchant.id);
                        setCopiedUid(true);
                        setTimeout(() => setCopiedUid(false), 1200);
                      }}
                      className="text-xs px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition"
                    >
                      {copiedUid ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    window.location.hash = "overview";
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900 transition"
                >
                  Genel Bakış
                </button>
                <button
                  onClick={() => {
                    window.location.hash = "security";
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900 transition"
                >
                  Ayarlar
                </button>
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                  <span className="text-sm text-zinc-200">Koyu tema</span>
                  <button
                    onClick={() => setIsDarkTheme((v) => !v)}
                    className={`w-12 h-7 rounded-full transition relative ${
                      isDarkTheme ? "bg-zinc-600" : "bg-zinc-400"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        isDarkTheme ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-900 transition"
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-8 md:py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <section>
            <h1 className="text-4xl font-bold mb-2">
              Merchant Dashboard
            </h1>

            <p className="text-zinc-400">
              Welcome {merchant?.name || "Merchant"}
            </p>
          </section>
          <section id="overview" className="scroll-mt-28">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Overview</h2>
              <p className="text-zinc-500 text-sm">Real-time payment performance snapshot.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Total Payments</p>
              <h2 className="text-3xl font-bold">{paymentStats.total}</h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Paid Payments</p>
              <h2 className="text-3xl font-bold">{paymentStats.paid}</h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Pending Payments</p>
              <h2 className="text-3xl font-bold">{paymentStats.pending}</h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Expired Payments</p>
              <h2 className="text-3xl font-bold">{paymentStats.expired}</h2>
            </div>
          </div>
          </section>

          <section id="finance" className="scroll-mt-28 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">Finance</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Request manual payouts from confirmed paid volume.
                </p>
              </div>

              <span className="w-fit rounded-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                {settlements.summary.network} {settlements.summary.currency}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">Available</p>
                <p className="text-3xl font-bold">
                  {settlements.summary.available} {settlements.summary.currency}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">Gross Paid</p>
                <p className="text-3xl font-bold">
                  {settlements.summary.grossPaid} {settlements.summary.currency}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">Reserved</p>
                <p className="text-3xl font-bold">
                  {settlements.summary.reservedForPayouts}{" "}
                  {settlements.summary.currency}
                </p>
              </div>
            </div>

            <form
              onSubmit={createPayoutRequest}
              className="grid grid-cols-1 lg:grid-cols-[160px_1fr_1fr_auto] gap-4 mb-5"
            >
              <input
                type="number"
                placeholder="Amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="text"
                placeholder="TRC20 payout wallet address"
                value={payoutWalletAddress}
                onChange={(e) => setPayoutWalletAddress(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="text"
                placeholder="Optional note"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <button
                type="submit"
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
              >
                Request Payout
              </button>
            </form>

            {settlements.payoutRequests.length === 0 && (
              <p className="text-zinc-400">No payout requests yet.</p>
            )}

            {settlements.payoutRequests.length > 0 && (
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
                {settlements.payoutRequests.map((request) => (
                  <div
                    key={request.id}
                    className="grid grid-cols-1 lg:grid-cols-[170px_1fr_160px_180px] gap-3 bg-zinc-950 p-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold">
                        {request.amount} {request.currency}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {request.network}
                      </p>
                    </div>

                    <p className="break-all text-zinc-400">
                      {request.walletAddress}
                    </p>

                    <span
                      className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${getPayoutStatusClassName(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>

                    <p className="text-zinc-500 lg:text-right">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">Payment Details</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClassName(
                      selectedPayment.status
                    )}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  {selectedPayment.amount} {selectedPayment.currency}
                  {selectedPayment.orderId
                    ? ` - ${selectedPayment.orderId}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => verifyPayment(selectedPayment.id)}
                  disabled={selectedPayment.status !== "PENDING"}
                  className="bg-blue-500 text-black px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Verify Now
                </button>

                <button
                  onClick={() => cancelPayment(selectedPayment.id)}
                  disabled={selectedPayment.status !== "PENDING"}
                  className="bg-red-500 text-black px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>

                <a
                  href={`/pay/${selectedPayment.id}`}
                  target="_blank"
                  className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition"
                >
                  Checkout
                </a>

                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setWebhookHistory([]);
                  }}
                  className="bg-zinc-800 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-700 transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
              <aside className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="font-bold mb-4">Timeline</h3>
                  <div className="space-y-4">
                    {buildPaymentTimeline(
                      selectedPayment,
                      webhookHistory
                    ).map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex gap-3">
                        <span
                          className={`mt-1 h-3 w-3 rounded-full ${
                            item.tone === "failed"
                              ? "bg-red-500"
                              : item.tone === "active"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-zinc-500 text-xs break-all">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="font-bold mb-3">Operation Summary</h3>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>
                      <span className="text-zinc-500">Time left:</span>{" "}
                      {formatTimeLeft(selectedPayment.expiresAt, now)}
                    </p>
                    <p>
                      <span className="text-zinc-500">Webhook events:</span>{" "}
                      {webhookHistory.length}
                    </p>
                    <p>
                      <span className="text-zinc-500">Network:</span>{" "}
                      {selectedPayment.network}
                    </p>
                  </div>
                </div>
              </aside>

              <section className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Payment Data</h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
                      <div className="flex justify-center">
                        <div className="bg-white p-2 rounded-xl">
                          <QRCodeSVG
                            value={`http://localhost:3000/pay/${selectedPayment.id}`}
                            size={132}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-zinc-500 text-xs">Checkout URL</p>
                        <p className="break-all text-sm">
                          {`http://localhost:3000/pay/${selectedPayment.id}`}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `http://localhost:3000/pay/${selectedPayment.id}`
                            );
                            alert("Checkout URL copied");
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500 transition"
                        >
                          Copy Checkout URL
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailField
                      label="Payment ID"
                      value={selectedPayment.id}
                      actionLabel="Copy"
                      onAction={() => {
                        navigator.clipboard.writeText(selectedPayment.id);
                        alert("Payment ID copied");
                      }}
                    />
                    <DetailField
                      label="Order ID"
                      value={selectedPayment.orderId}
                    />
                    <DetailField
                      label="Customer"
                      value={selectedPayment.customerEmail}
                    />
                    <DetailField
                      label="Wallet Address"
                      value={selectedPayment.walletAddress}
                      actionLabel="Copy"
                      onAction={() => {
                        navigator.clipboard.writeText(
                          selectedPayment.walletAddress
                        );
                        alert("Wallet address copied");
                      }}
                    />
                    <DetailField
                      label="Tx Hash"
                      value={selectedPayment.txHash || "Not confirmed yet"}
                      actionLabel={selectedPayment.txHash ? "Copy" : ""}
                      onAction={() => {
                        navigator.clipboard.writeText(selectedPayment.txHash);
                        alert("Tx hash copied");
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Webhook History</h3>
                      <p className="text-zinc-500 text-sm">
                        Delivery attempts and retry status for this payment.
                      </p>
                    </div>
                  </div>

                  {detailsLoading && (
                    <p className="text-zinc-400">Loading webhook history...</p>
                  )}

                  {!detailsLoading && webhookHistory.length === 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-400">
                      No webhook events yet.
                    </div>
                  )}

                  <div className="space-y-3">
                    {webhookHistory.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                      >
                        <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
                          <div className="min-w-0 text-sm text-zinc-400 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(
                                  webhook.status
                                )}`}
                              >
                                {webhook.status}
                              </span>
                              <span className="text-zinc-500">
                                {webhook.event}
                              </span>
                            </div>

                            <p className="break-all">
                              <span className="text-zinc-500">URL:</span>{" "}
                              {webhook.url}
                            </p>
                            <p>
                              <span className="text-zinc-500">Attempts:</span>{" "}
                              {webhook.attempts}/{webhook.maxAttempts}
                            </p>
                            <p>
                              <span className="text-zinc-500">Created:</span>{" "}
                              {new Date(webhook.createdAt).toLocaleString()}
                            </p>
                            {webhook.nextRetryAt && (
                              <p>
                                <span className="text-zinc-500">
                                  Next retry:
                                </span>{" "}
                                {new Date(webhook.nextRetryAt).toLocaleString()}
                              </p>
                            )}
                            {(webhook.lastStatusCode || webhook.lastError) && (
                              <p className="break-all">
                                <span className="text-zinc-500">
                                  Last result:
                                </span>{" "}
                                {webhook.lastStatusCode ||
                                  webhook.lastError}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => retryWebhook(webhook.id)}
                            disabled={
                              webhook.status === "SUCCESS" ||
                              webhook.attempts >= webhook.maxAttempts
                            }
                            className="bg-blue-500 text-black px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
