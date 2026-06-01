"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    return "bg-green-500 text-black";
  }

  if (status === "FAILED") {
    return "bg-red-500 text-black";
  }

  return "bg-zinc-700 text-white";
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

const getApiCallClassName = (success) => {
  return success ? "bg-green-500 text-black" : "bg-red-500 text-black";
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

const CodeSnippet = ({ title, description, value, copied, onCopy }) => (
  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#050505]">
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-zinc-500 text-xs mt-1">{description}</p>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 bg-white text-black px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>

    <pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-zinc-200">
      <code>{value}</code>
    </pre>
  </div>
);

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
  const secondaryButtonClass =
    "bg-zinc-800 px-4 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40";
  const dangerButtonClass =
    "bg-red-500 text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40";
  const accentButtonClass =
    "bg-blue-500 text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40";
  const [merchant, setMerchant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    expired: 0,
  });
  const [paymentPagination, setPaymentPagination] = useState({
    page: 1,
    limit: 3,
    totalCount: 0,
    totalPages: 1,
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
  const [amount, setAmount] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutWalletAddress, setPayoutWalletAddress] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [webhookHistory, setWebhookHistory] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("ALL");
  const [paymentPage, setPaymentPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState("ALL");
  const [copiedSnippet, setCopiedSnippet] = useState("");
  const [activeIntegrationKey, setActiveIntegrationKey] =
    useState("create-payment");

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
        page: String(paymentPage),
        limit: String(paymentPagination.limit),
        status: statusFilter,
        webhookStatus: webhookStatusFilter,
        search: paymentSearch.trim(),
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

      setPayments(paymentsData.payments || []);
      setPaymentStats(
        paymentsData.stats || {
          total: 0,
          paid: 0,
          pending: 0,
          expired: 0,
        }
      );
      setPaymentPagination({
        page: paymentsData.page || paymentPage,
        limit: paymentsData.limit || paymentPagination.limit,
        totalCount: paymentsData.totalCount || 0,
        totalPages: paymentsData.totalPages || 1,
      });

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
    paymentPage,
    paymentPagination.limit,
    paymentSearch,
    statusFilter,
    webhookStatusFilter,
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

  const createPayment = async (e) => {

    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/payments/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Number(amount),
            orderId: orderId || undefined,
            customerEmail: customerEmail || undefined,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);

      setAmount("");
      setOrderId("");
      setCustomerEmail("");

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Create payment error");
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

  const copySnippet = (name, value) => {
    navigator.clipboard.writeText(value);
    setCopiedSnippet(name);

    setTimeout(() => {
      setCopiedSnippet("");
    }, 1500);
  };

  const integrationSnippets = useMemo(() => {
    const apiKey = merchant?.apiKey || "YOUR_API_KEY";
    const webhookSecret = merchant?.webhookSecret || "YOUR_WEBHOOK_SECRET";

    return [
      {
        key: "create-payment",
        title: "Create Payment",
        description: "Creates a checkout session and returns a checkoutUrl.",
        method: "POST",
        path: "/api/public/payments/create",
        value: `curl -X POST http://localhost:5000/api/public/payments/create \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "amount": 25,
    "orderId": "ORDER-1001",
    "customerEmail": "customer@example.com"
  }'`,
      },
      {
        key: "status-by-payment",
        title: "Status by Payment ID",
        description: "Checks a payment by its gateway payment ID.",
        method: "GET",
        path: "/api/public/payments/status/{paymentId}",
        value: `curl -X GET http://localhost:5000/api/public/payments/status/{paymentId} \\
  -H "x-api-key: ${apiKey}"`,
      },
      {
        key: "status-by-order",
        title: "Status by Order ID",
        description: "Checks a payment by the merchant order ID.",
        method: "GET",
        path: "/api/public/payments/status?orderId=ORDER-1001",
        value: `curl -X GET "http://localhost:5000/api/public/payments/status?orderId=ORDER-1001" \\
  -H "x-api-key: ${apiKey}"`,
      },
      {
        key: "webhook-handler",
        title: "Verify Webhook Signature",
        description: "Verifies timestamped signatures and rejects old payloads.",
        method: "POST",
        path: "merchant webhook URL",
        value: `const crypto = require("crypto");

app.post("/webhook", express.json(), (req, res) => {
  const signature = req.header("x-webhook-signature");
  const timestamp = req.header("x-webhook-timestamp");
  const toleranceSeconds = 300;

  if (!signature || !timestamp) {
    return res.sendStatus(401);
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));

  if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) {
    return res.sendStatus(401);
  }

  const expected = crypto
    .createHmac("sha256", "${webhookSecret}")
    .update(\`\${timestamp}.\${JSON.stringify(req.body)}\`)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const isValid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    return res.sendStatus(401);
  }

  const event = req.body.event;
  const payment = req.body.payment;

  if (event === "payment.paid") {
    // Mark order as paid in your system.
  }

  res.sendStatus(200);
});`,
      },
    ];
  }, [merchant?.apiKey, merchant?.webhookSecret]);

  const activeIntegration =
    integrationSnippets.find(
      (snippet) => snippet.key === activeIntegrationKey
    ) || integrationSnippets[0];

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

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crypto Gateway</h1>

            <p className="text-zinc-500 text-sm">Merchant Panel</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-zinc-400 hidden md:block">
              {merchant?.email}
            </p>

            <button
              onClick={logout}
              className="bg-red-500 text-black px-5 py-2 rounded-lg font-semibold hover:opacity-80 transition"
            >
              Logout
            </button>
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
          <section className="sticky top-0 z-20 bg-black/90 backdrop-blur border border-zinc-800 rounded-xl p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <a href="#overview" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center">Overview</a>
              <a href="#operations" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center">Operations</a>
              <a href="#finance" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center">Finance</a>
              <a href="#security" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center">Security</a>
              <a href="#integration" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center">Integration</a>
            </div>
          </section>

          <section id="overview">
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

          <section id="finance" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
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

          <div id="operations" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold">Operations</h2>
                <p className="text-zinc-500 text-sm">
                  Showing {payments.length} of {paymentPagination.totalCount}
                  {" "}matching payments
                </p>
              </div>

              <button
                onClick={() => {
                  setPaymentSearch("");
                  setStatusFilter("ALL");
                  setWebhookStatusFilter("ALL");
                  setPaymentPage(1);
                }}
                className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search payment, order, customer, wallet, tx"
                value={paymentSearch}
                onChange={(e) => {
                  setPaymentSearch(e.target.value);
                  setPaymentPage(1);
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPaymentPage(1);
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">All payment statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={webhookStatusFilter}
                onChange={(e) => {
                  setWebhookStatusFilter(e.target.value);
                  setPaymentPage(1);
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">All webhook statuses</option>
                <option value="SUCCESS">Webhook success</option>
                <option value="PENDING">Webhook pending</option>
                <option value="FAILED">Webhook failed</option>
                <option value="NONE">No webhook</option>
              </select>
            </div>

            <div className="space-y-4">
              {paymentStats.total === 0 && (
                <p className="text-zinc-400">No payments yet.</p>
              )}

              {paymentStats.total > 0 && payments.length === 0 && (
                <p className="text-zinc-400">
                  No payments match the current filters.
                </p>
              )}

              <div className="hidden lg:grid grid-cols-[160px_1fr_130px_380px] gap-3 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-950/70">
                <span>Amount</span>
                <span>Payment</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-zinc-800 bg-zinc-950/60 rounded-xl p-4"
                >
                  {(() => {
                    const latestWebhook = payment.webhookEvents?.[0];

                    return (
                  <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr_120px_340px] gap-3 lg:items-center">
                    <div>
                      <p className="font-semibold text-2xl lg:text-xl">
                        {payment.amount} {payment.currency}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{payment.network}</p>
                    </div>

                      <div className="text-sm text-zinc-400 space-y-1">
                        <p className="break-all">
                          <span className="text-zinc-500">Payment ID:</span>{" "}
                          {payment.id}
                        </p>

                        {payment.orderId && (
                          <p className="break-all">
                            <span className="text-zinc-500">Order ID:</span>{" "}
                            {payment.orderId}
                          </p>
                        )}

                        <p className="break-all">
                          <span className="text-zinc-500">Wallet:</span>{" "}
                          {payment.walletAddress.slice(0, 10)}...{payment.walletAddress.slice(-8)}
                        </p>

                        <p>
                          <span className="text-zinc-500">Expires:</span> {formatTimeLeft(payment.expiresAt, now)}
                        </p>

                        {latestWebhook && (
                          <div className="pt-2">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(
                                latestWebhook.status
                              )}`}
                            >
                              Webhook: {latestWebhook.status}
                            </span>

                            <p className="mt-2">
                              <span className="text-zinc-500">
                                Attempts:
                              </span>{" "}
                              {latestWebhook.attempts}/
                              {latestWebhook.maxAttempts}
                            </p>
                          </div>
                        )}
                      </div>

                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClassName(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-5 gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(payment.walletAddress);
                            alert("Wallet address copied");
                          }}
                          className="h-10 bg-zinc-800 text-white px-2 rounded-md text-xs font-semibold hover:bg-zinc-700 transition flex items-center justify-center"
                        >
                          Copy Address
                        </button>
                        <button
                          onClick={() => verifyPayment(payment.id)}
                          disabled={payment.status !== "PENDING"}
                          className="h-10 bg-zinc-800 text-white px-2 rounded-md text-xs font-semibold hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => cancelPayment(payment.id)}
                          disabled={payment.status !== "PENDING"}
                          className="h-10 bg-red-600 text-white px-2 rounded-md text-xs font-semibold hover:bg-red-500 transition disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                        >
                          Cancel
                        </button>
                        <a
                          href={`/pay/${payment.id}`}
                          target="_blank"
                          className="h-10 bg-zinc-800 text-white px-2 rounded-md text-xs font-semibold hover:bg-zinc-700 transition text-center flex items-center justify-center"
                        >
                          Checkout
                        </a>
                        <button
                          onClick={() => openPaymentDetails(payment)}
                          className="h-10 bg-blue-600 text-white px-2 rounded-md text-xs font-semibold hover:bg-blue-500 transition flex items-center justify-center"
                        >
                          Details
                        </button>
                      </div>
                      {payment.status === "PENDING" && (
                        <div className="hidden xl:flex justify-end">
                          <div className="bg-white p-1.5 rounded-lg">
                            <QRCodeSVG value={payment.walletAddress} size={72} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-zinc-500 text-sm">
                Page {paymentPagination.page} of {paymentPagination.totalPages}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setPaymentPage((currentPage) =>
                      Math.max(currentPage - 1, 1)
                    )
                  }
                  disabled={paymentPagination.page <= 1}
                  className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPaymentPage((currentPage) =>
                      Math.min(
                        currentPage + 1,
                        paymentPagination.totalPages
                      )
                    )
                  }
                  disabled={
                    paymentPagination.page >= paymentPagination.totalPages
                  }
                  className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <p className="text-zinc-500 text-xs mt-4">
              Auto refresh active: payments update every 10 seconds.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Create Payment</h2>
            <form
              onSubmit={createPayment}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              <input
                type="number"
                placeholder="Amount USDT"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="text"
                placeholder="Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="email"
                placeholder="Customer email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <button type="submit" className={primaryButtonClass}>
                Create Payment
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
          <div id="security" className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold">Activity</h2>
                <p className="text-zinc-500 text-sm">
                  Showing {auditLogs.length} of {auditPagination.totalCount}
                  {" "}matching events.
                </p>
              </div>

              <span className="text-zinc-500 text-sm">
                Page {auditPagination.page} of {auditPagination.totalPages}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 mb-5">
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">All actions</option>
                {auditActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              <select
                value={auditTargetTypeFilter}
                onChange={(e) => {
                  setAuditTargetTypeFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">All target types</option>
                {auditTargetTypes.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {targetType}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setAuditActionFilter("ALL");
                  setAuditTargetTypeFilter("ALL");
                  setAuditPage(1);
                }}
                className="bg-zinc-800 px-4 py-3 rounded-xl hover:bg-zinc-700 transition"
              >
                Clear
              </button>
            </div>

            {auditPagination.totalCount === 0 && (
              <p className="text-zinc-400">No activity recorded yet.</p>
            )}

            {auditLogs.length > 0 && (
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-1 lg:grid-cols-[180px_1fr_190px] gap-3 bg-zinc-950 p-4 text-sm"
                  >
                    <div>
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getAuditActionClassName(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold">{log.message}</p>
                      <p className="text-zinc-500 text-xs break-all mt-1">
                        {log.targetType}
                        {log.targetId ? `: ${log.targetId}` : ""}
                      </p>
                    </div>

                    <p className="text-zinc-500 lg:text-right">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-zinc-500 text-sm">
                Page {auditPagination.page} of {auditPagination.totalPages}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setAuditPage((currentPage) => Math.max(currentPage - 1, 1))
                  }
                  disabled={auditPagination.page <= 1}
                  className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setAuditPage((currentPage) =>
                      Math.min(currentPage + 1, auditPagination.totalPages)
                    )
                  }
                  disabled={auditPagination.page >= auditPagination.totalPages}
                  className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold">API Usage</h2>
                <p className="text-zinc-500 text-sm">
                  Public API request volume and recent integration calls.
                </p>
              </div>

              <span className="text-zinc-500 text-sm">Last 24 hours</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2 h-8 flex items-start">Requests</p>
                <p className="text-4xl leading-none font-bold font-mono tabular-nums w-full min-h-[48px] flex items-center justify-center">{apiUsage.summary.total}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2 h-8 flex items-start">Successful</p>
                <p className="text-4xl leading-none font-bold font-mono tabular-nums w-full min-h-[48px] flex items-center justify-center">
                  {apiUsage.summary.successful}
                </p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2 h-8 flex items-start">Failed</p>
                <p className="text-4xl leading-none font-bold font-mono tabular-nums w-full min-h-[48px] flex items-center justify-center">{apiUsage.summary.failed}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2 h-8 flex items-start">Create Calls</p>
                <p className="text-4xl leading-none font-bold font-mono tabular-nums w-full min-h-[48px] flex items-center justify-center">
                  {apiUsage.summary.createCalls}
                </p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2 h-8 flex items-start">Status Calls</p>
                <p className="text-4xl leading-none font-bold font-mono tabular-nums w-full min-h-[48px] flex items-center justify-center">
                  {apiUsage.summary.statusCalls}
                </p>
              </div>
            </div>

            {apiUsage.recentCalls.length === 0 && (
              <p className="text-zinc-400">No API requests recorded yet.</p>
            )}

            {apiUsage.recentCalls.length > 0 && (
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
                {apiUsage.recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="grid grid-cols-1 lg:grid-cols-[170px_1fr_110px_190px] gap-3 bg-zinc-950 p-4 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getApiCallClassName(
                          call.success
                        )}`}
                      >
                        {call.statusCode}
                      </span>
                      <span className="text-zinc-500">{call.method}</span>
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold">{call.endpoint}</p>
                      <p className="text-zinc-500 text-xs break-all mt-1">
                        {call.path}
                      </p>
                    </div>

                    <p className="text-zinc-500">{call.durationMs}ms</p>

                    <p className="text-zinc-500 lg:text-right">
                      {new Date(call.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          <div id="integration" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Security</h2>
              <p className="text-zinc-400 text-sm mt-2">
                Configure your receiver URL and manage webhook credentials.
              </p>
            </div>

            <form
              onSubmit={saveCallbackUrl}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-6"
            >
              <input
                type="text"
                placeholder="https://your-site.com/webhook"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <button
                type="submit"
                className="h-12 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition"
              >
                Save URL
              </button>
            </form>

            <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Webhook Secret</p>
                <span className="text-zinc-600 text-xs">Sensitive</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                <input
                  type="text"
                  value={merchant?.webhookSecret || ""}
                  readOnly
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm font-mono"
                />

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      merchant?.webhookSecret || ""
                    );
                    alert("Webhook secret copied");
                  }}
                  className="h-12 px-6 rounded-xl border border-zinc-600 bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition"
                >
                  Copy Secret
                </button>

                <button
                  onClick={regenerateWebhookSecret}
                  className="h-12 px-6 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4">API Access</h2>

            <p className="text-zinc-400 text-sm mb-3">
              Use this key to create payments from external merchant websites.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={merchant?.apiKey || ""}
                readOnly
                className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
              />

              <button
                onClick={() => {
                  navigator.clipboard.writeText(merchant?.apiKey || "");
                  alert("API key copied");
                }}
                className={primaryButtonClass}
              >
                Copy API Key
              </button>

              <button onClick={regenerateApiKey} className={dangerButtonClass}>
                Regenerate
              </button>
            </div>

          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Integration
                </h2>
                <p className="text-zinc-400 text-sm mt-2">
                  Production-ready API examples for merchant checkout flows.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {["payment.paid", "payment.cancelled", "payment.expired"].map(
                  (event) => (
                    <span
                      key={event}
                      className="border border-zinc-700 bg-zinc-950 rounded-lg px-3 py-2 text-zinc-300"
                    >
                      {event}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
              <div className="space-y-3">
                {integrationSnippets.map((snippet) => (
                  <button
                    key={snippet.key}
                    type="button"
                    onClick={() => setActiveIntegrationKey(snippet.key)}
                    className={`w-full text-left border rounded-xl p-4 transition ${
                      activeIntegrationKey === snippet.key
                        ? "border-white bg-zinc-950"
                        : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{snippet.title}</p>
                      <span
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                          snippet.method === "GET"
                            ? "bg-blue-500 text-black"
                            : "bg-green-500 text-black"
                        }`}
                      >
                        {snippet.method}
                      </span>
                    </div>

                    <p className="text-zinc-500 text-xs mt-2">
                      {snippet.description}
                    </p>

                    <p className="font-mono text-[11px] text-zinc-400 mt-3 break-all">
                      {snippet.path}
                    </p>
                  </button>
                ))}
              </div>

              <div className="min-w-0">
                <CodeSnippet
                  title={activeIntegration.title}
                  description={activeIntegration.description}
                  value={activeIntegration.value}
                  copied={copiedSnippet === activeIntegration.key}
                  onCopy={() =>
                    copySnippet(activeIntegration.key, activeIntegration.value)
                  }
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">API header</p>
                <p className="font-mono break-all">x-api-key</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">Webhook header</p>
                <p className="font-mono break-all">
                  x-webhook-signature + x-webhook-timestamp
                </p>
              </div>

              <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                <p className="text-zinc-500 text-xs mb-2">Retry behavior</p>
                <p>Failed webhooks are retried and can be retried manually.</p>
              </div>
            </div>
          </div>


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
