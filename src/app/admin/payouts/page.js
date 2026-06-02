"use client";

import { useCallback, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const STATUS_OPTIONS = ["ALL", "REQUESTED", "APPROVED", "REJECTED", "PAID"];
const CRITICAL_CONFIRMATION_TEXT = "CONFIRM";

const getStatusClassName = (status) => {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-green-500 text-black";
  }

  if (status === "REJECTED") {
    return "bg-red-500 text-black";
  }

  return "bg-yellow-500 text-black";
};

const getAllowedActions = (status) => {
  if (status === "REQUESTED") {
    return [
      { label: "Approve", status: "APPROVED", className: "bg-green-500" },
      { label: "Reject", status: "REJECTED", className: "bg-red-500" },
    ];
  }

  if (status === "APPROVED") {
    return [
      { label: "Mark Paid", status: "PAID", className: "bg-blue-500" },
      { label: "Reject", status: "REJECTED", className: "bg-red-500" },
    ];
  }

  return [];
};

const formatAuditAction = (action) =>
  String(action || "audit")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const getAuditActionClassName = (action) => {
  if (action?.includes("paid")) return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
  if (action?.includes("approved")) return "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40";
  if (action?.includes("rejected")) return "bg-red-500/20 text-red-200 border border-red-400/40";
  return "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40";
};

const formatAuditValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
};

const getAuditMetadataEntries = (metadata = {}) => {
  const preferredKeys = [
    "previousStatus",
    "status",
    "amount",
    "currency",
    "txHash",
    "rejectReason",
    "note",
  ];

  return preferredKeys
    .filter((key) => metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== "")
    .map((key) => [key, metadata[key]]);
};

const isCriticalPayoutStatus = (status) => status === "PAID" || status === "REJECTED";

const formatSecurityEvent = (event) =>
  String(event || "security_event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSecurityStatusClassName = (status) => {
  if (status === "SUCCESS") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "FAILED" || status === "ERROR") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  if (status === "BLOCKED") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-zinc-700 bg-zinc-950 text-zinc-300";
};

const getPayoutAuditSummary = (request) => {
  const metadata = request.latestAuditLog?.metadata || {};

  if (request.status === "PAID" && metadata.txHash) {
    return {
      label: "Settlement tx",
      value: metadata.txHash,
      className: "border-blue-500/30 bg-blue-500/10 text-blue-100",
    };
  }

  if (request.status === "REJECTED" && (metadata.rejectReason || request.note)) {
    return {
      label: "Reject reason",
      value: metadata.rejectReason || request.note,
      className: "border-red-500/30 bg-red-500/10 text-red-100",
    };
  }

  if (request.latestAuditLog) {
    return {
      label: "Latest action",
      value: formatAuditAction(request.latestAuditLog.action),
      className: "border-zinc-700 bg-zinc-950 text-zinc-300",
    };
  }

  return null;
};

export default function AdminPayoutsPage() {
  const primaryButtonClass =
    "bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const secondaryButtonClass =
    "border border-zinc-700 bg-zinc-900 px-4 py-3 rounded-xl font-semibold text-zinc-100 hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const dangerButtonClass =
    "border border-red-500/40 bg-red-500/10 px-6 py-3 rounded-xl font-semibold text-red-200 hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("adminToken") || "";
  });
  const [adminAccessToken, setAdminAccessToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("adminAccessToken") || "";
  });
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [auditSummaryFilter, setAuditSummaryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tokenState, setTokenState] = useState("unknown");
  const [savingToken, setSavingToken] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [settlementTxHash, setSettlementTxHash] = useState("");
  const [criticalConfirmationText, setCriticalConfirmationText] = useState("");
  const baseUrl = API_BASE_URL;

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const clearConfirmAction = () => {
    setConfirmAction(null);
    setCriticalConfirmationText("");
  };

  const resetAdminSession = useCallback((nextTokenState = "unknown") => {
    localStorage.removeItem("adminAccessToken");
    setAdminAccessToken("");
    setTokenState(nextTokenState);
    setPayoutRequests([]);
    setSelectedPayout(null);
    setSelectedAuditLogs([]);
    setSecurityEvents([]);
    setPagination({
      page: 1,
      limit: 10,
      totalCount: 0,
      totalPages: 1,
    });
    setConfirmAction(null);
    setCriticalConfirmationText("");
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/admin/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken) {
        resetAdminSession("invalid");
        return null;
      }
      localStorage.setItem("adminAccessToken", data.accessToken);
      setAdminAccessToken(data.accessToken);
      setTokenState("valid");
      return data.accessToken;
    } catch (error) {
      console.error(error);
      resetAdminSession("invalid");
      return null;
    }
  }, [resetAdminSession]);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const { accessToken, ...fetchOptions } = options;
      const makeRequest = async (token) =>
        fetch(`${baseUrl}${path}`, {
          ...fetchOptions,
          headers: {
            ...(fetchOptions.headers || {}),
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

      let response = await makeRequest(accessToken || adminAccessToken);
      if (response.status !== 401) {
        return response;
      }

      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        return response;
      }

      response = await makeRequest(nextAccessToken);
      return response;
    },
    [adminAccessToken, refreshAccessToken]
  );

  const verifyAdminToken = useCallback(async (token) => {
    if (!token) {
      setTokenState("invalid");
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        resetAdminSession("invalid");
        setTokenState("invalid");
        return false;
      }

      setTokenState("valid");
      return true;
    } catch (error) {
      console.error(error);
      resetAdminSession("invalid");
      return false;
    }
  }, [baseUrl, resetAdminSession]);

  const fetchPayouts = useCallback(async (options = {}) => {
    const nextPage = options.page || page;
    const nextStatus = options.status || statusFilter;
    const accessToken = options.accessToken || adminAccessToken;

    if (!accessToken) {
      showNotice("error", "Admin token is required.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pagination.limit),
        status: nextStatus,
      });

      const response = await adminFetch(
        `/api/admin/payout-requests?${params.toString()}`,
        { accessToken }
      );

      const data = await response.json();

      if (response.status === 401) {
        resetAdminSession("invalid");
      }

      if (!response.ok) {
        showNotice("error", data.message || "Admin payouts error.");
        return;
      }

      setPayoutRequests(data.payoutRequests || []);
      setPagination({
        page: data.page || nextPage,
        limit: data.limit || pagination.limit,
        totalCount: data.totalCount || 0,
        totalPages: data.totalPages || 1,
      });
    } catch (error) {
      console.error(error);
      showNotice("error", "Admin payouts error.");
    } finally {
      setLoading(false);
    }
  }, [adminAccessToken, adminFetch, page, pagination.limit, resetAdminSession, statusFilter]);

  const saveToken = async () => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      showNotice("error", "Enter the current internal admin token.");
      setTokenState("invalid");
      return;
    }

    setSavingToken(true);
    setNotice(null);
    localStorage.setItem("adminToken", trimmedToken);
    try {
      const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token: trimmedToken,
        }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData.accessToken) {
        resetAdminSession("invalid");
        if (loginResponse.status === 429) {
          showNotice("error", `Too many failed attempts. Try again in ${loginData.retryAfterSeconds || "a while"} seconds.`);
          return;
        }
        showNotice("error", loginData.message || "Invalid admin token.");
        return;
      }
      localStorage.setItem("adminAccessToken", loginData.accessToken);
      setAdminAccessToken(loginData.accessToken);
    } catch (error) {
      console.error(error);
      resetAdminSession("invalid");
      showNotice("error", "Admin login error.");
      return;
    } finally {
      setSavingToken(false);
    }

    const isValid = await verifyAdminToken(localStorage.getItem("adminAccessToken") || "");

    if (isValid) {
      fetchPayouts({ page: 1, accessToken: localStorage.getItem("adminAccessToken") || "" });
      fetchSecurityEvents(localStorage.getItem("adminAccessToken") || "");
      showNotice("success", "Admin session verified.");
    } else {
      resetAdminSession("invalid");
      showNotice("error", "Invalid admin token.");
    }
  };

  const clearToken = () => {
    fetch(`${baseUrl}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    localStorage.removeItem("adminToken");
    setAdminToken("");
    resetAdminSession("unknown");
  };

  const logoutAllSessions = async () => {
    if (!adminAccessToken) {
      showNotice("error", "Admin token is required.");
      return;
    }

    if (criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) {
      showNotice("error", `Type ${CRITICAL_CONFIRMATION_TEXT} to confirm this critical action.`);
      return;
    }

    try {
      const response = await adminFetch("/api/admin/logout-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText: criticalConfirmationText.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice("error", data.message || "Logout all sessions error.");
        return;
      }
      showNotice("success", data.message || "All sessions revoked.");
      setCriticalConfirmationText("");
      clearToken();
    } catch (error) {
      console.error(error);
      showNotice("error", "Logout all sessions error.");
    }
  };

  const fetchPayoutAuditLogs = async (payoutId) => {
    setDetailsLoading(true);

    try {
      const response = await adminFetch(
        `/api/admin/payout-requests/${payoutId}/audit-logs`
      );

      const data = await response.json();

      if (!response.ok) {
        showNotice("error", data.message || "Payout audit logs error.");
        return;
      }

      setSelectedAuditLogs(data.auditLogs || []);
    } catch (error) {
      console.error(error);
      showNotice("error", "Payout audit logs error.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchSecurityEvents = useCallback(async (accessTokenOverride) => {
    const accessToken = accessTokenOverride || adminAccessToken;
    if (!accessToken) {
      return;
    }

    try {
      const response = await adminFetch("/api/admin/security-events", {
        accessToken,
      });
      const data = await response.json();
      if (response.ok) {
        setSecurityEvents(data.events || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, [adminAccessToken, adminFetch]);

  const openPayoutDetails = (request) => {
    setSelectedPayout(request);
    setSelectedAuditLogs([]);
    fetchPayoutAuditLogs(request.id);
  };

  const openStatusConfirm = (payoutId, status) => {
    setStatusNote("");
    setSettlementTxHash("");
    setCriticalConfirmationText("");
    setConfirmAction({
      type: "payoutStatus",
      payoutId,
      status,
    });
  };

  const updatePayoutStatus = async (payoutId, status) => {
    const trimmedTxHash = settlementTxHash.trim();
    const trimmedNote = statusNote.trim();

    if (status === "PAID" && !trimmedTxHash) {
      showNotice("error", "Settlement tx hash is required.");
      return;
    }

    if (status === "REJECTED" && !trimmedNote) {
      showNotice("error", "Reject reason is required.");
      return;
    }

    if (isCriticalPayoutStatus(status) && criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) {
      showNotice("error", `Type ${CRITICAL_CONFIRMATION_TEXT} to confirm this critical action.`);
      return;
    }

    try {
      const response = await adminFetch(
        `/api/admin/payout-requests/${payoutId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            txHash: trimmedTxHash || undefined,
            rejectReason: status === "REJECTED" ? trimmedNote : undefined,
            note: status !== "REJECTED" ? trimmedNote || undefined : undefined,
            confirmationText: isCriticalPayoutStatus(status)
              ? criticalConfirmationText.trim()
              : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showNotice("error", data.message || "Update payout status error.");
        return;
      }

      showNotice("success", data.message || `Payout moved to ${status}.`);
      clearConfirmAction();
      setStatusNote("");
      setSettlementTxHash("");
      setCriticalConfirmationText("");
      fetchPayouts();
      if (selectedPayout?.id === payoutId) {
        setSelectedPayout(data.payoutRequest);
        fetchPayoutAuditLogs(payoutId);
      }
    } catch (error) {
      console.error(error);
      showNotice("error", "Update payout status error.");
    }
  };

  const totalAmount = useMemo(() => {
    return payoutRequests.reduce((sum, request) => sum + request.amount, 0);
  }, [payoutRequests]);

  const visiblePayoutRequests = useMemo(() => {
    if (auditSummaryFilter === "SETTLED_TX") {
      return payoutRequests.filter((request) => Boolean(request.latestAuditLog?.metadata?.txHash));
    }

    if (auditSummaryFilter === "REJECT_REASON") {
      return payoutRequests.filter((request) =>
        Boolean(request.latestAuditLog?.metadata?.rejectReason || request.note)
      );
    }

    return payoutRequests;
  }, [auditSummaryFilter, payoutRequests]);

  const securitySummary = useMemo(() => {
    return securityEvents.reduce(
      (summary, event) => {
        if (event.status === "SUCCESS") summary.success += 1;
        if (event.status === "FAILED" || event.status === "ERROR") summary.failed += 1;
        if (event.status === "BLOCKED") summary.blocked += 1;
        return summary;
      },
      {
        success: 0,
        failed: 0,
        blocked: 0,
      }
    );
  }, [securityEvents]);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Internal console</p>
            <h1 className="mt-1 text-2xl font-bold">Admin Payouts</h1>
            <p className="text-zinc-500 text-sm">Protected settlement review and payout processing.</p>
          </div>

          <a
            href="/dashboard"
            className="w-fit rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 transition"
          >
            Merchant Dashboard
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-8">
        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_.8fr]">
            <div className="p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Restricted Access</h2>
                  <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                    Verify the current internal admin token before settlement data is loaded. Saved sessions are revoked automatically when they become invalid.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                    tokenState === "valid"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : tokenState === "invalid"
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {tokenState === "valid"
                    ? "Verified session"
                    : tokenState === "invalid"
                    ? "Verification failed"
                    : "Awaiting verification"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
                <input
                  type="password"
                  placeholder="Internal admin token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  className="h-12 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-zinc-100 outline-none focus:border-zinc-500"
                />

                <button
                  onClick={saveToken}
                  disabled={savingToken}
                  className={`${primaryButtonClass} h-12 w-full lg:w-auto`}
                >
                  {savingToken ? "Verifying..." : "Verify Token"}
                </button>

                <button
                  onClick={clearToken}
                  className={`${secondaryButtonClass} h-12 w-full lg:w-auto`}
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-zinc-500">
                  Access tokens are short-lived. Refresh sessions are stored as httpOnly cookies.
                </p>
                <button
                  onClick={() => {
                    setCriticalConfirmationText("");
                    setConfirmAction({ type: "logoutAll" });
                  }}
                  disabled={!adminAccessToken}
                  className={`${dangerButtonClass} w-full md:w-auto`}
                >
                  Revoke All Sessions
                </button>
              </div>

              {tokenState === "invalid" && (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Use the latest INTERNAL_ADMIN_TOKEN value. Old saved sessions are no longer trusted.
                </p>
              )}
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950 p-6 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Guarded data</p>
              <div className="mt-4 space-y-3 text-sm">
                {["Payout requests", "Settlement actions", "Audit trail", "Security events"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3">
                    <span className="text-zinc-300">{item}</span>
                    <span className={tokenState === "valid" ? "text-emerald-300" : "text-zinc-600"}>
                      {tokenState === "valid" ? "unlocked" : "locked"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {confirmAction?.type === "logoutAll" && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="mb-3">This will revoke all admin sessions. Type {CRITICAL_CONFIRMATION_TEXT} to continue.</p>
              <input
                type="text"
                value={criticalConfirmationText}
                onChange={(e) => setCriticalConfirmationText(e.target.value)}
                placeholder={CRITICAL_CONFIRMATION_TEXT}
                className="mb-3 w-full rounded-lg border border-red-500/30 bg-black/30 px-3 py-2 text-red-50 outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={logoutAllSessions}
                  disabled={criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Confirm logout all
                </button>
                <button
                  onClick={clearConfirmAction}
                  className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {tokenState === "valid" && (
          <>
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Overview</h2>
            <p className="text-zinc-500 text-sm">Live snapshot of payout workload.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-sm mb-2">Matching Requests</p>
            <p className="text-3xl font-bold">{pagination.totalCount}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-sm mb-2">Page Amount</p>
            <p className="text-3xl font-bold">
              {totalAmount.toFixed(2)} USDT
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-sm mb-2">Current Page</p>
            <p className="text-3xl font-bold">
              {pagination.page}/{pagination.totalPages}
            </p>
          </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">Operations</h2>
              <p className="text-zinc-500 text-sm">
                Payout queue and status operations. Showing {visiblePayoutRequests.length} of {pagination.totalCount}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                  fetchPayouts({
                    page: 1,
                    status: e.target.value,
                  });
                }}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>

              <select
                value={auditSummaryFilter}
                onChange={(e) => setAuditSummaryFilter(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">All audit summaries</option>
                <option value="SETTLED_TX">Has settlement tx</option>
                <option value="REJECT_REASON">Has reject reason</option>
              </select>

              <button
                onClick={() => fetchPayouts()}
                className={secondaryButtonClass}
              >
                Refresh
              </button>
              <button
                onClick={fetchSecurityEvents}
                className={secondaryButtonClass}
              >
                Security Events
              </button>
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="h-12 rounded-xl bg-zinc-800/70 animate-pulse" />
              <div className="h-12 rounded-xl bg-zinc-800/50 animate-pulse" />
              <div className="h-12 rounded-xl bg-zinc-800/40 animate-pulse" />
            </div>
          )}

          {!loading && visiblePayoutRequests.length === 0 && (
            <p className="text-zinc-400">No payout requests found.</p>
          )}

          <div className="space-y-4">
            {visiblePayoutRequests.map((request) => {
              const auditSummary = getPayoutAuditSummary(request);

              return (
              <div
                key={request.id}
                className="border border-zinc-800 rounded-xl p-5"
              >
                <div className="grid grid-cols-1 xl:grid-cols-[180px_1fr_220px] gap-5">
                  <div>
                    <p className="text-xl md:text-2xl font-bold">
                      {request.amount} {request.currency}
                    </p>
                    <p className="text-zinc-500 text-sm">{request.network}</p>
                    <span
                      className={`inline-block mt-3 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-400 space-y-2">
                    <p>
                      <span className="text-zinc-500">Merchant:</span>{" "}
                      {request.merchant?.name} ({request.merchant?.email})
                    </p>
                    <p className="break-all">
                      <span className="text-zinc-500">Wallet:</span>{" "}
                      {request.walletAddress}
                    </p>
                    <p className="break-all">
                      <span className="text-zinc-500">Payout ID:</span>{" "}
                      {request.id}
                    </p>
                    {request.note && (
                      <p className="break-all">
                        <span className="text-zinc-500">Note:</span>{" "}
                        {request.note}
                      </p>
                    )}
                    {auditSummary && (
                      <div className={`rounded-xl border p-3 ${auditSummary.className}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{auditSummary.label}</p>
                        <p className="mt-1 break-all text-sm">{auditSummary.value}</p>
                      </div>
                    )}
                    <p>
                      <span className="text-zinc-500">Created:</span>{" "}
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                    {request.processedAt && (
                      <p>
                        <span className="text-zinc-500">Processed:</span>{" "}
                        {new Date(request.processedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row xl:flex-col gap-3">
                    <button
                      onClick={() => openPayoutDetails(request)}
                      className="bg-zinc-800 px-4 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition"
                    >
                      Details
                    </button>

                    {getAllowedActions(request.status).map((action) => (
                      <button
                        key={action.status}
                        onClick={() => openStatusConfirm(request.id, action.status)}
                        className={`${action.className} text-black px-4 py-3 rounded-xl font-semibold hover:opacity-80 transition`}
                      >
                        {action.label}
                      </button>
                    ))}

                    {getAllowedActions(request.status).length === 0 && (
                      <p className="text-zinc-500 text-sm">
                        No actions available.
                      </p>
                    )}
                  </div>
                </div>
                {confirmAction?.type === "payoutStatus" &&
                  confirmAction.payoutId === request.id && (
                    <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                      <p className="mb-3">
                        Move this payout request to {confirmAction.status}?
                      </p>
                      {confirmAction.status === "PAID" && (
                        <input
                          type="text"
                          value={settlementTxHash}
                          onChange={(e) => setSettlementTxHash(e.target.value)}
                          placeholder="Settlement tx hash"
                          className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      )}
                      {confirmAction.status === "REJECTED" && (
                        <textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Reject reason"
                          className="mb-3 min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      )}
                      {confirmAction.status === "APPROVED" && (
                        <input
                          type="text"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Optional admin note"
                          className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      )}
                      {isCriticalPayoutStatus(confirmAction.status) && (
                        <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                          <p className="mb-2 text-xs text-yellow-100/80">
                            Type {CRITICAL_CONFIRMATION_TEXT} to confirm this critical settlement action.
                          </p>
                          <input
                            type="text"
                            value={criticalConfirmationText}
                            onChange={(e) => setCriticalConfirmationText(e.target.value)}
                            placeholder={CRITICAL_CONFIRMATION_TEXT}
                            className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            updatePayoutStatus(
                              confirmAction.payoutId,
                              confirmAction.status
                            )
                          }
                          disabled={
                            isCriticalPayoutStatus(confirmAction.status) &&
                            criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT
                          }
                          className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Confirm status change
                        </button>
                        <button
                          onClick={clearConfirmAction}
                          className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
              </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-zinc-500 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const nextPage = Math.max(page - 1, 1);
                  setPage(nextPage);
                  fetchPayouts({ page: nextPage });
                }}
                disabled={pagination.page <= 1}
                className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() => {
                  const nextPage = Math.min(page + 1, pagination.totalPages);
                  setPage(nextPage);
                  fetchPayouts({ page: nextPage });
                }}
                disabled={pagination.page >= pagination.totalPages}
                className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin security</p>
              <h3 className="mt-1 text-xl font-bold">Security Events</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Login, refresh, protected API access, and session revocation activity.
              </p>
            </div>
            <span className="w-fit rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400">
              Last 50 events
            </span>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">Successful</p>
              <p className="mt-2 text-2xl font-bold text-emerald-100">{securitySummary.success}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-200/70">Failed</p>
              <p className="mt-2 text-2xl font-bold text-red-100">{securitySummary.failed}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">Blocked</p>
              <p className="mt-2 text-2xl font-bold text-amber-100">{securitySummary.blocked}</p>
            </div>
          </div>

          {securityEvents.length === 0 && (
            <p className="text-zinc-400">No security events yet.</p>
          )}
          <div className="space-y-3">
            {securityEvents.map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-black p-4 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-100">{formatSecurityEvent(event.event)}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSecurityStatusClassName(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-2 text-zinc-500">
                    {event.reason ? event.reason.replace(/_/g, " ") : "No reason attached"}
                  </p>
                </div>
                <div className="text-left text-xs text-zinc-500 md:text-right">
                  <p>{event.ipAddress || "unknown ip"}</p>
                  <p className="mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
          </>
        )}
      </div>

      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">Payout Details</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                      selectedPayout.status
                    )}`}
                  >
                    {selectedPayout.status}
                  </span>
                </div>
                <p className="text-zinc-400">
                  {selectedPayout.amount} {selectedPayout.currency} to{" "}
                  {selectedPayout.walletAddress}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {getAllowedActions(selectedPayout.status).map((action) => (
                  <button
                    key={action.status}
                    onClick={() => openStatusConfirm(selectedPayout.id, action.status)}
                    className={`${action.className} text-black px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition`}
                  >
                    {action.label}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setSelectedPayout(null);
                    setSelectedAuditLogs([]);
                  }}
                  className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
                >
                  Close
                </button>
              </div>
            </div>

            {confirmAction?.type === "payoutStatus" &&
              confirmAction.payoutId === selectedPayout.id && (
                <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  <p className="mb-3">
                    Move this payout request to {confirmAction.status}?
                  </p>
                  {confirmAction.status === "PAID" && (
                    <input
                      type="text"
                      value={settlementTxHash}
                      onChange={(e) => setSettlementTxHash(e.target.value)}
                      placeholder="Settlement tx hash"
                      className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  )}
                  {confirmAction.status === "REJECTED" && (
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Reject reason"
                      className="mb-3 min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  )}
                  {confirmAction.status === "APPROVED" && (
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Optional admin note"
                      className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  )}
                  {isCriticalPayoutStatus(confirmAction.status) && (
                    <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                      <p className="mb-2 text-xs text-yellow-100/80">
                        Type {CRITICAL_CONFIRMATION_TEXT} to confirm this critical settlement action.
                      </p>
                      <input
                        type="text"
                        value={criticalConfirmationText}
                        onChange={(e) => setCriticalConfirmationText(e.target.value)}
                        placeholder={CRITICAL_CONFIRMATION_TEXT}
                        className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        updatePayoutStatus(
                          confirmAction.payoutId,
                          confirmAction.status
                        )
                      }
                      disabled={
                        isCriticalPayoutStatus(confirmAction.status) &&
                        criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT
                      }
                      className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirm status change
                    </button>
                    <button
                      onClick={clearConfirmAction}
                      className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <section className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">Merchant</p>
                    <p className="font-semibold">
                      {selectedPayout.merchant?.name}
                    </p>
                    <p className="text-zinc-400 break-all">
                      {selectedPayout.merchant?.email}
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">Amount</p>
                    <p className="text-xl font-bold">
                      {selectedPayout.amount} {selectedPayout.currency}
                    </p>
                    <p className="text-zinc-400">{selectedPayout.network}</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-zinc-500 text-xs mb-1">
                          Wallet Address
                        </p>
                        <p className="break-all">
                          {selectedPayout.walletAddress}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            selectedPayout.walletAddress
                          );
                          showNotice("success", "Wallet copied.");
                        }}
                        className="shrink-0 bg-zinc-800 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">Created</p>
                    <p>{new Date(selectedPayout.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">Processed</p>
                    <p>
                      {selectedPayout.processedAt
                        ? new Date(selectedPayout.processedAt).toLocaleString()
                        : "Not processed yet"}
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                    <p className="text-zinc-500 text-xs mb-1">Note</p>
                    <p className="break-all">
                      {selectedPayout.note || "No note provided."}
                    </p>
                  </div>
                </div>
              </section>

              <aside className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-bold mb-4">Audit Trail</h3>

                {detailsLoading && (
                  <p className="text-zinc-400">Loading audit logs...</p>
                )}

                {!detailsLoading && selectedAuditLogs.length === 0 && (
                  <p className="text-zinc-400">No audit logs found.</p>
                )}

                <div className="space-y-3">
                  {selectedAuditLogs.map((log, index) => {
                    const metadataEntries = getAuditMetadataEntries(log.metadata || {});

                    return (
                      <div key={log.id} className="relative pl-5">
                        <span className="absolute left-0 top-4 h-2.5 w-2.5 rounded-full bg-zinc-500" />
                        {index < selectedAuditLogs.length - 1 && (
                          <span className="absolute left-[4px] top-7 h-[calc(100%-1rem)] w-px bg-zinc-800" />
                        )}
                        <div className="border border-zinc-800 rounded-xl p-3 text-sm">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAuditActionClassName(log.action)}`}>
                                {formatAuditAction(log.action)}
                              </span>
                              <p className="text-zinc-400 mt-2">{log.message}</p>
                            </div>
                            <p className="text-zinc-500 text-xs sm:text-right">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>

                          {metadataEntries.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              {metadataEntries.map(([key, value]) => (
                                <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                                  <p className="text-[11px] uppercase text-zinc-500">{key}</p>
                                  <p className="mt-1 break-all text-xs text-zinc-200">
                                    {formatAuditValue(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
