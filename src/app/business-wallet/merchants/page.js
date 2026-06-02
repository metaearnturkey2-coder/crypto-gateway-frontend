"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";

const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "FAILED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

const getPaymentStatusClassName = (status) => {
  if (status === "PAID") return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
  if (status === "EXPIRED" || status === "CANCELLED") return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
  return "bg-amber-400/20 text-amber-200 border border-amber-300/40";
};

const formatTimeLeft = (expiresAt, now) => {
  if (!expiresAt) return "No expiration";
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "Expired";
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const getCheckoutUrl = (payment) => payment.checkoutUrl || `/pay/${payment.id}`;

const canRetryWebhook = (webhook) =>
  webhook &&
  webhook.status !== "SUCCESS" &&
  Number(webhook.attempts || 0) < Number(webhook.maxAttempts || 0);

const getWebhookSummary = (events = []) => {
  const latest = events[0] || null;
  const successful = events.filter((event) => event.status === "SUCCESS").length;
  const failed = events.filter((event) => event.status === "FAILED").length;
  const pending = events.filter((event) => event.status === "PENDING").length;

  return {
    latest,
    successful,
    failed,
    pending,
    total: events.length,
  };
};

const getWebhookStatusMessage = (webhook) => {
  if (!webhook) return "No delivery attempts recorded yet.";
  if (webhook.status === "SUCCESS") return "Delivered to the merchant callback URL.";
  if (webhook.status === "FAILED") return "Delivery failed after the available attempts.";
  return "Delivery is pending or waiting for retry.";
};

const getActivityMeta = (action) => {
  if (action?.includes("webhook")) {
    return {
      label: "Webhook",
      className: "bg-sky-400/15 text-sky-200 border border-sky-300/30",
    };
  }
  if (action?.includes("payment")) {
    return {
      label: "Payment",
      className: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/30",
    };
  }
  if (action?.includes("api_key") || action?.includes("secret")) {
    return {
      label: "Security",
      className: "bg-red-400/15 text-red-200 border border-red-300/30",
    };
  }
  if (action?.includes("callback")) {
    return {
      label: "Settings",
      className: "bg-amber-400/15 text-amber-100 border border-amber-300/30",
    };
  }
  return {
    label: "Activity",
    className: "bg-zinc-700/50 text-zinc-100 border border-zinc-500/40",
  };
};

const formatActivityAction = (action) =>
  String(action || "activity")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const formatMetadataValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const MIN_PAYMENT_AMOUNT = 0.01;
const MAX_PAYMENT_AMOUNT = 1000000;
const ORDER_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BusinessWalletMerchantsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({ page: 1, totalCount: 0, totalPages: 1 });
  const [paymentSearch, setPaymentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("ALL");
  const [paymentPage, setPaymentPage] = useState(1);
  const [now, setNow] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [auditActions, setAuditActions] = useState([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState("ALL");
  const [newAmount, setNewAmount] = useState("");
  const [newOrderId, setNewOrderId] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [notice, setNotice] = useState(null);
  const [paymentAction, setPaymentAction] = useState(null);
  const [webhookAction, setWebhookAction] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ type: "success", message: `${label} copied.` });
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      setNotice({ type: "success", message: `${label} copied.` });
    }
  };

  const fetchOps = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const params = new URLSearchParams({ page: String(paymentPage), limit: "10" });
    if (paymentSearch.trim()) params.set("search", paymentSearch.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (webhookStatusFilter !== "ALL") params.set("webhookStatus", webhookStatusFilter);

    const res = await fetch(apiUrl(`/api/payments?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    setPayments(data.payments || []);
    setPaymentPagination({
      page: data.pagination?.page || data.page || paymentPage,
      totalCount:
        data.pagination?.totalCount ??
        data.pagination?.total ??
        data.totalCount ??
        data.stats?.total ??
        0,
      totalPages: data.pagination?.totalPages || data.totalPages || 1,
    });
  }, [paymentPage, paymentSearch, statusFilter, webhookStatusFilter]);

  const fetchActivity = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const params = new URLSearchParams({
      page: String(auditPage),
      limit: String(auditPagination.limit),
    });
    if (auditActionFilter !== "ALL") params.set("action", auditActionFilter);
    if (auditTargetTypeFilter !== "ALL") params.set("targetType", auditTargetTypeFilter);

    const res = await fetch(apiUrl(`/api/merchant/audit-logs?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    setAuditLogs(data.auditLogs || []);
    setAuditPagination({
      page: data.page || auditPage,
      limit: data.limit || auditPagination.limit,
      totalCount: data.totalCount || 0,
      totalPages: data.totalPages || 1,
    });
    setAuditActions(data.actions || []);
    setAuditTargetTypes(data.targetTypes || []);
  }, [auditActionFilter, auditPage, auditPagination.limit, auditTargetTypeFilter]);

  const createPayment = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const amountNumber = Number(newAmount);
    if (!Number.isFinite(amountNumber)) {
      setNotice({ type: "error", message: "Please enter a valid amount." });
      return;
    }

    if (amountNumber < MIN_PAYMENT_AMOUNT || amountNumber > MAX_PAYMENT_AMOUNT) {
      setNotice({
        type: "error",
        message: `Amount must be between ${MIN_PAYMENT_AMOUNT} and ${MAX_PAYMENT_AMOUNT} USDT.`,
      });
      return;
    }

    if (String(newAmount).split(".")[1]?.length > 2) {
      setNotice({ type: "error", message: "Amount can have at most 2 decimal places." });
      return;
    }

    const trimmedOrderId = newOrderId.trim();
    if (trimmedOrderId && (trimmedOrderId.length > 80 || !ORDER_ID_PATTERN.test(trimmedOrderId))) {
      setNotice({
        type: "error",
        message: "Order ID can use up to 80 letters, numbers, dots, dashes, underscores, and colons.",
      });
      return;
    }

    const trimmedCustomerEmail = newCustomerEmail.trim();
    if (trimmedCustomerEmail && (trimmedCustomerEmail.length > 254 || !EMAIL_PATTERN.test(trimmedCustomerEmail))) {
      setNotice({ type: "error", message: "Customer email must be a valid email address." });
      return;
    }

    setCreatingPayment(true);
    setNotice(null);
    try {
      const response = await fetch(apiUrl("/api/payments/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNumber,
          orderId: trimmedOrderId || undefined,
          customerEmail: trimmedCustomerEmail || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice({
          type: "error",
          message: data.errors?.join(" ") || data.message || "Create payment error.",
        });
        return;
      }

      setNotice({ type: "success", message: data.message || "Payment created." });
      setNewAmount("");
      setNewOrderId("");
      setNewCustomerEmail("");
      setPaymentPage(1);
      setPaymentSearch("");
      setStatusFilter("ALL");
      setWebhookStatusFilter("ALL");
      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: "Create payment error." });
    } finally {
      setCreatingPayment(false);
    }
  };

  const runPaymentAction = async (paymentId, action) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const actionPath = action === "verify" ? "verify" : "cancel";
    setPaymentAction({ paymentId, action });
    setNotice(null);

    try {
      const response = await fetch(apiUrl(`/api/payments/${paymentId}/${actionPath}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice({
          type: "error",
          message: data.message || `Payment ${action} failed.`,
        });
        return;
      }

      if (action === "verify" && data.underpaid) {
        setVerificationResult({
          paymentId,
          type: "underpaid",
          ...data.underpaid,
        });
        setNotice({
          type: "error",
          message: `Transaction found but amount is short. Received ${data.underpaid.amountReceived} USDT, missing ${data.underpaid.amountMissing} USDT.`,
        });
      } else {
        setVerificationResult(
          action === "verify" && data.payment?.status === "PAID"
            ? {
                paymentId,
                type: "paid",
                txHash: data.payment.txHash,
              }
            : null
        );
        setNotice({
          type: "success",
          message: data.message || `Payment ${action} completed.`,
        });
      }
      setConfirmAction(null);

      if (selectedPayment?.id === paymentId && data.payment) {
        setSelectedPayment((current) => ({
          ...current,
          ...data.payment,
          webhookEvents: current?.webhookEvents || data.payment.webhookEvents,
        }));
      }

      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: `Payment ${action} failed.` });
    } finally {
      setPaymentAction(null);
    }
  };

  const openPaymentDetails = async (payment) => {
    const token = localStorage.getItem("token");
    setSelectedPayment(payment);
    if (!token) return;

    try {
      const response = await fetch(apiUrl(`/api/payments/${payment.id}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && data.payment) {
        setSelectedPayment(data.payment);
      }
    } catch {
      setNotice({ type: "error", message: "Payment details could not be refreshed." });
    }
  };

  const refreshSelectedPayment = async (paymentId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(apiUrl(`/api/payments/${paymentId}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok && data.payment) {
      setSelectedPayment(data.payment);
    }
  };

  const retryWebhook = async (paymentId, webhookId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setWebhookAction({ paymentId, webhookId });
    setNotice(null);

    try {
      const response = await fetch(apiUrl(`/api/payments/${paymentId}/webhooks/${webhookId}/retry`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice({
          type: "error",
          message: data.message || "Webhook retry failed.",
        });
        return;
      }

      setNotice({
        type: "success",
        message: data.message || "Webhook retry attempted.",
      });
      await refreshSelectedPayment(paymentId);
      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: "Webhook retry failed." });
    } finally {
      setWebhookAction(null);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchOps();
        await fetchActivity();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [fetchActivity, fetchOps]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => {
      fetchOps();
      fetchActivity();
    }, 10000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [fetchActivity, fetchOps]);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  return (
    <OverviewShell>
      {notice && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Create Payment</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3">
          <input
            type="number"
            min={MIN_PAYMENT_AMOUNT}
            max={MAX_PAYMENT_AMOUNT}
            step="0.01"
            placeholder="Amount USDT"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
          />
          <input
            type="text"
            placeholder="Order ID"
            maxLength={80}
            value={newOrderId}
            onChange={(e) => setNewOrderId(e.target.value)}
            className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
          />
          <input
            type="email"
            placeholder="Customer email"
            maxLength={254}
            value={newCustomerEmail}
            onChange={(e) => setNewCustomerEmail(e.target.value)}
            className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
          />
          <button
            onClick={createPayment}
            disabled={creatingPayment}
            className="h-[50px] rounded-xl bg-zinc-100 text-zinc-900 px-6 font-semibold hover:bg-white transition disabled:opacity-60"
          >
            {creatingPayment ? "Creating..." : "Create Payment"}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Amount: 0.01-1,000,000 USDT, max 2 decimals. Order ID: letters, numbers, dots, dashes, underscores, and colons.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Operations</h2>
            <p className="text-zinc-500 text-sm">Showing {payments.length} of {paymentPagination.totalCount} matching payments</p>
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
          <div className="hidden lg:grid grid-cols-[160px_1fr_130px_460px] gap-3 px-4 py-2 text-xs uppercase tracking-wide text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-950/70">
            <span>Amount</span><span>Payment</span><span>Status</span><span>Actions</span>
          </div>

          {!loading && payments.length === 0 && <p className="text-zinc-400">No payments match the current filters.</p>}

          {payments.map((payment) => {
            const latestWebhook = payment.webhookEvents?.[0];
            return (
              <div key={payment.id} className="border border-zinc-700/60 bg-zinc-900/70 rounded-xl p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr_120px_460px] gap-3 lg:items-center">
                  <div>
                    <p className="font-semibold text-2xl lg:text-xl">{payment.amount} {payment.currency}</p>
                    <p className="text-xs text-zinc-500 mt-1">{payment.network}</p>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p className="break-all"><span className="text-zinc-500">Payment ID:</span> {payment.id}</p>
                    {payment.orderId && <p className="break-all"><span className="text-zinc-500">Order ID:</span> {payment.orderId}</p>}
                    <p className="break-all"><span className="text-zinc-500">Wallet:</span> {payment.walletAddress.slice(0, 10)}...{payment.walletAddress.slice(-8)}</p>
                    <p><span className="text-zinc-500">Created:</span> {formatDateTime(payment.createdAt)}</p>
                    <p><span className="text-zinc-500">Expires:</span> {formatTimeLeft(payment.expiresAt, now)}</p>
                    {latestWebhook && (
                      <div className="pt-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(latestWebhook.status)}`}>
                          Webhook: {latestWebhook.status}
                        </span>
                        <p className="mt-2"><span className="text-zinc-500">Attempts:</span> {latestWebhook.attempts}/{latestWebhook.maxAttempts}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClassName(payment.status)}`}>{payment.status}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                      <button onClick={() => copyText(payment.walletAddress, "Wallet address")} className="h-10 bg-zinc-800/80 border border-zinc-600 text-zinc-100 px-3 rounded-lg text-xs font-semibold">Copy Wallet</button>
                      <button
                        onClick={() => runPaymentAction(payment.id, "verify")}
                        className="h-10 bg-zinc-800/80 border border-zinc-600 text-zinc-100 px-3 rounded-lg text-xs font-semibold disabled:opacity-40"
                        disabled={payment.status !== "PENDING" || paymentAction?.paymentId === payment.id}
                      >
                        {paymentAction?.paymentId === payment.id && paymentAction?.action === "verify" ? "Verifying..." : "Verify"}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "cancelPayment", paymentId: payment.id })}
                        className="h-10 bg-zinc-800/80 border border-zinc-600 text-zinc-100 px-3 rounded-lg text-xs font-semibold disabled:opacity-40"
                        disabled={payment.status !== "PENDING" || paymentAction?.paymentId === payment.id}
                      >
                        Cancel
                      </button>
                      <button onClick={() => copyText(getCheckoutUrl(payment), "Checkout link")} className="h-10 bg-zinc-800/80 border border-zinc-600 text-zinc-100 px-3 rounded-lg text-xs font-semibold">Copy Link</button>
                      <a href={getCheckoutUrl(payment)} target="_blank" className="h-10 bg-zinc-800/80 border border-zinc-600 text-zinc-100 px-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center">Checkout</a>
                      <button
                        onClick={() => openPaymentDetails(payment)}
                        className="h-10 bg-zinc-100 text-zinc-900 px-3 rounded-lg text-xs font-semibold flex items-center justify-center"
                      >
                        Details
                      </button>
                    </div>
                    {payment.status === "PENDING" && (
                      <div className="hidden xl:flex justify-end">
                        <div className="bg-white p-1.5 rounded-lg"><QRCodeSVG value={payment.walletAddress} size={72} /></div>
                      </div>
                    )}
                  </div>
                </div>
                {confirmAction?.type === "cancelPayment" &&
                  confirmAction.paymentId === payment.id && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                      <p className="mb-3">Cancel this pending payment?</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => runPaymentAction(payment.id, "cancel")}
                          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                        >
                          Confirm cancel
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                        >
                          Keep payment
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-zinc-500 text-sm">Page {paymentPagination.page} of {paymentPagination.totalPages}</p>
          <div className="flex gap-3">
            <button onClick={() => setPaymentPage((p) => Math.max(p - 1, 1))} disabled={paymentPagination.page <= 1} className="bg-zinc-800 px-4 py-2 rounded-xl disabled:opacity-40">Previous</button>
            <button onClick={() => setPaymentPage((p) => Math.min(p + 1, paymentPagination.totalPages))} disabled={paymentPagination.page >= paymentPagination.totalPages} className="bg-zinc-800 px-4 py-2 rounded-xl disabled:opacity-40">Next</button>
          </div>
        </div>
        <p className="text-zinc-500 text-xs mt-4">Auto refresh active: payments update every 10 seconds.</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Activity</h2>
            <p className="text-zinc-500 text-sm">Showing {auditLogs.length} of {auditPagination.totalCount} matching events.</p>
          </div>
          <span className="text-zinc-500 text-sm">Page {auditPagination.page} of {auditPagination.totalPages}</span>
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
              <option key={action} value={action}>{action}</option>
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
              <option key={targetType} value={targetType}>{targetType}</option>
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

        {auditPagination.totalCount === 0 && <p className="text-zinc-400">No activity recorded yet.</p>}

        {auditLogs.length > 0 && (
          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
            {auditLogs.map((log) => {
              const activityMeta = getActivityMeta(log.action);
              const metadataEntries = Object.entries(log.metadata || {}).slice(0, 4);
              const isPaymentLog = (log.targetType || log.entityType) === "payment" && log.targetId;

              return (
                <div key={log.id} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_220px] gap-4 bg-zinc-950 p-4 text-sm">
                  <div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>
                      {activityMeta.label}
                    </span>
                    <p className="mt-2 text-xs capitalize text-zinc-500">{formatActivityAction(log.action)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{log.message || log.description || `${formatActivityAction(log.action)} from dashboard`}</p>
                    <p className="text-zinc-500 text-xs break-all mt-1">{log.targetType || log.entityType || "merchant"}: {log.targetId || log.entityId || "-"}</p>
                    {metadataEntries.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                            <p className="text-[11px] uppercase text-zinc-500">{key}</p>
                            <p className="mt-1 break-all text-xs text-zinc-200">{formatMetadataValue(value)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 lg:items-end">
                    <p className="text-zinc-500 lg:text-right">
                      {formatDateTime(log.createdAt)}
                    </p>
                    {isPaymentLog && (
                      <button
                        onClick={() => openPaymentDetails({ id: log.targetId })}
                        className="w-fit rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
                      >
                        Payment details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-zinc-500 text-sm">Page {auditPagination.page} of {auditPagination.totalPages}</p>
          <div className="flex gap-3">
            <button onClick={() => setAuditPage((currentPage) => Math.max(currentPage - 1, 1))} disabled={auditPagination.page <= 1} className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <button onClick={() => setAuditPage((currentPage) => Math.min(currentPage + 1, auditPagination.totalPages))} disabled={auditPagination.page >= auditPagination.totalPages} className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-4xl font-bold">Payment Details</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClassName(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  {selectedPayment.amount} {selectedPayment.currency}
                  {selectedPayment.orderId ? ` - ${selectedPayment.orderId}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => runPaymentAction(selectedPayment.id, "verify")}
                  disabled={selectedPayment.status !== "PENDING" || paymentAction?.paymentId === selectedPayment.id}
                  className="bg-blue-500 text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-40"
                >
                  {paymentAction?.paymentId === selectedPayment.id && paymentAction?.action === "verify" ? "Verifying..." : "Verify Now"}
                </button>
                <button
                  onClick={() => setConfirmAction({ type: "cancelPayment", paymentId: selectedPayment.id })}
                  disabled={selectedPayment.status !== "PENDING" || paymentAction?.paymentId === selectedPayment.id}
                  className="bg-red-500 text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-40"
                >
                  Cancel
                </button>
                <button onClick={() => copyText(getCheckoutUrl(selectedPayment), "Checkout link")} className="bg-zinc-800 px-4 py-2 rounded-lg font-semibold">Copy Link</button>
                <a href={getCheckoutUrl(selectedPayment)} target="_blank" className="bg-white text-black px-4 py-2 rounded-lg font-semibold">Checkout</a>
                <button onClick={() => setSelectedPayment(null)} className="bg-zinc-800 px-4 py-2 rounded-lg font-semibold">Close</button>
              </div>
            </div>
            {confirmAction?.type === "cancelPayment" &&
              confirmAction.paymentId === selectedPayment.id && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  <p className="mb-3">Cancel this pending payment?</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => runPaymentAction(selectedPayment.id, "cancel")}
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                    >
                      Confirm cancel
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Keep payment
                    </button>
                  </div>
                </div>
              )}

            {verificationResult?.paymentId === selectedPayment.id && (
              <div
                className={`mb-6 rounded-xl border p-4 text-sm ${
                  verificationResult.type === "underpaid"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                <p className="font-semibold">
                  {verificationResult.type === "underpaid"
                    ? "Underpaid transaction detected"
                    : "Payment verification succeeded"}
                </p>
                {verificationResult.type === "underpaid" ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <p>Received: {verificationResult.amountReceived} USDT</p>
                    <p>Missing: {verificationResult.amountMissing} USDT</p>
                    <p className="break-all">Tx: {verificationResult.txHash}</p>
                  </div>
                ) : (
                  <p className="mt-2 break-all">Tx: {verificationResult.txHash || "-"}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
              <aside className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="font-bold mb-4 text-2xl">Timeline</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">Created</p>
                      <p className="text-zinc-500 text-xs">{formatDateTime(selectedPayment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Awaiting payment</p>
                      <p className="text-zinc-500 text-xs">Expires {formatDateTime(selectedPayment.expiresAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="font-bold mb-3 text-2xl">Operation Summary</h3>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p><span className="text-zinc-500">Time left:</span> {formatTimeLeft(selectedPayment.expiresAt, now)}</p>
                    <p><span className="text-zinc-500">Webhook events:</span> {selectedPayment.webhookEvents?.length || 0}</p>
                    <p><span className="text-zinc-500">Network:</span> {selectedPayment.network}</p>
                  </div>
                </div>
              </aside>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="bg-white rounded-lg p-1 w-fit">
                    <QRCodeSVG value={selectedPayment.walletAddress} size={120} />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-sm">Checkout URL</p>
                    <p className="break-all mt-1">{getCheckoutUrl(selectedPayment)}</p>
                    <button
                      onClick={() => copyText(getCheckoutUrl(selectedPayment), "Checkout link")}
                      className="mt-3 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Copy checkout link
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs">Payment ID</p><p className="break-all">{selectedPayment.id}</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs">Order ID</p><p>{selectedPayment.orderId || "-"}</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs">Customer</p><p className="break-all">{selectedPayment.customerEmail || "-"}</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs">Wallet Address</p><p className="break-all">{selectedPayment.walletAddress}</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2"><p className="text-zinc-500 text-xs">Tx Hash</p><p className="break-all">{selectedPayment.txHash || "Not confirmed yet"}</p></div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  {(() => {
                    const webhookSummary = getWebhookSummary(selectedPayment.webhookEvents || []);

                    return (
                      <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">Webhook delivery</h3>
                      <p className="mt-1 text-zinc-400 text-sm">
                        {getWebhookStatusMessage(webhookSummary.latest)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      webhookSummary.latest
                        ? getWebhookStatusClassName(webhookSummary.latest.status)
                        : "border border-zinc-700 bg-zinc-950 text-zinc-400"
                    }`}>
                      {webhookSummary.latest?.status || "NO EVENTS"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Events</p>
                      <p className="mt-1 text-lg font-semibold">{webhookSummary.total}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Successful</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-300">{webhookSummary.successful}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Pending</p>
                      <p className="mt-1 text-lg font-semibold text-amber-200">{webhookSummary.pending}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Failed</p>
                      <p className="mt-1 text-lg font-semibold text-rose-300">{webhookSummary.failed}</p>
                    </div>
                  </div>

                  {!selectedPayment.webhookEvents?.length ? (
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                      No webhook events yet. A webhook is created after a payment status event is sent.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedPayment.webhookEvents.map((webhook) => (
                        <div key={webhook.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>{webhook.status}</span>
                                <span className="text-xs text-zinc-500">{webhook.event}</span>
                              </div>
                              <p className="mt-2 break-all text-sm text-zinc-400">{webhook.url || "No callback URL recorded"}</p>
                            </div>
                            {canRetryWebhook(webhook) ? (
                              <button
                                onClick={() => retryWebhook(selectedPayment.id, webhook.id)}
                                disabled={webhookAction?.webhookId === webhook.id}
                                className="h-10 rounded-lg bg-amber-200 px-4 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {webhookAction?.webhookId === webhook.id ? "Retrying..." : "Retry delivery"}
                              </button>
                            ) : (
                              <span className="inline-flex h-10 items-center rounded-lg border border-zinc-800 px-4 text-xs font-semibold text-zinc-500">
                                No action
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <p className="text-zinc-500">Attempts</p>
                              <p className="mt-1 font-semibold text-zinc-100">{webhook.attempts}/{webhook.maxAttempts}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <p className="text-zinc-500">Last status</p>
                              <p className="mt-1 font-semibold text-zinc-100">{webhook.lastStatusCode || "-"}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <p className="text-zinc-500">Next retry</p>
                              <p className="mt-1 font-semibold text-zinc-100">{formatDateTime(webhook.nextRetryAt)}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <p className="text-zinc-500">Delivered</p>
                              <p className="mt-1 font-semibold text-zinc-100">{formatDateTime(webhook.deliveredAt)}</p>
                            </div>
                          </div>

                          {webhook.lastError && (
                            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
                              <p className="font-semibold">Last error</p>
                              <p className="mt-1 break-all">{webhook.lastError}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </OverviewShell>
  );
}
