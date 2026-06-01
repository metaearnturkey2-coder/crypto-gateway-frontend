"use client";

import { useCallback, useMemo, useState } from "react";

const STATUS_OPTIONS = ["ALL", "REQUESTED", "APPROVED", "REJECTED", "PAID"];

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

export default function AdminPayoutsPage() {
  const primaryButtonClass =
    "bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const secondaryButtonClass =
    "bg-zinc-800 px-4 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const dangerButtonClass =
    "bg-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed";
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
  const baseUrl = "http://localhost:5000";

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/admin/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.accessToken) {
        return null;
      }
      localStorage.setItem("adminAccessToken", data.accessToken);
      setAdminAccessToken(data.accessToken);
      setTokenState("valid");
      return data.accessToken;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const makeRequest = async (token) =>
        fetch(`${baseUrl}${path}`, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

      let response = await makeRequest(adminAccessToken);
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
      const response = await adminFetch("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setTokenState("invalid");
        return false;
      }

      setTokenState("valid");
      return true;
    } catch (error) {
      console.error(error);
      setTokenState("invalid");
      return false;
    }
  }, [adminFetch]);

  const fetchPayouts = useCallback(async (options = {}) => {
    const nextPage = options.page || page;
    const nextStatus = options.status || statusFilter;

    if (!adminAccessToken) {
      alert("Admin token is required");
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
        `/api/admin/payout-requests?${params.toString()}`
      );

      const data = await response.json();

      if (response.status === 401) {
        setTokenState("invalid");
      }

      if (!response.ok) {
        alert(data.message || "Admin payouts error");
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
      alert("Admin payouts error");
    } finally {
      setLoading(false);
    }
  }, [adminAccessToken, page, pagination.limit, statusFilter]);

  const saveToken = async () => {
    localStorage.setItem("adminToken", adminToken);
    try {
      const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token: adminToken,
        }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData.accessToken) {
        setTokenState("invalid");
        if (loginResponse.status === 429) {
          alert(
            `Too many failed attempts. Try again in ${loginData.retryAfterSeconds || "a while"} seconds.`
          );
          return;
        }
        alert(loginData.message || "Invalid admin token");
        return;
      }
      localStorage.setItem("adminAccessToken", loginData.accessToken);
      setAdminAccessToken(loginData.accessToken);
    } catch (error) {
      console.error(error);
      setTokenState("invalid");
      alert("Admin login error");
      return;
    }

    const isValid = await verifyAdminToken(localStorage.getItem("adminAccessToken") || "");

    if (isValid) {
      fetchPayouts({ page: 1 });
      fetchSecurityEvents();
    } else {
      alert("Invalid admin token");
    }
  };

  const clearToken = () => {
    fetch(`${baseUrl}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminAccessToken");
    setAdminToken("");
    setAdminAccessToken("");
    setTokenState("unknown");
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
  };

  const logoutAllSessions = async () => {
    if (!adminAccessToken) {
      alert("Admin token is required");
      return;
    }

    const confirmed = window.confirm(
      "This will revoke all admin sessions. Continue?"
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await adminFetch("/api/admin/logout-all", {
        method: "POST",
      });
      const data = await response.json();
      alert(data.message || "All sessions revoked");
      clearToken();
    } catch (error) {
      console.error(error);
      alert("Logout all sessions error");
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
        alert(data.message || "Payout audit logs error");
        return;
      }

      setSelectedAuditLogs(data.auditLogs || []);
    } catch (error) {
      console.error(error);
      alert("Payout audit logs error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchSecurityEvents = useCallback(async () => {
    if (!adminAccessToken) {
      return;
    }

    try {
      const response = await adminFetch("/api/admin/security-events");
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

  const updatePayoutStatus = async (payoutId, status) => {
    const confirmed = window.confirm(
      `Move this payout request to ${status}?`
    );

    if (!confirmed) {
      return;
    }

    const note = window.prompt(`Optional note for ${status}`, "");

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
            note: note || undefined,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);

      if (response.ok) {
        fetchPayouts();
        if (selectedPayout?.id === payoutId) {
          setSelectedPayout(data.payoutRequest);
          fetchPayoutAuditLogs(payoutId);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Update payout status error");
    }
  };

  const totalAmount = useMemo(() => {
    return payoutRequests.reduce((sum, request) => sum + request.amount, 0);
  }, [payoutRequests]);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Payouts</h1>
            <p className="text-zinc-500 text-sm">Internal settlement operations</p>
          </div>

          <a
            href="/dashboard"
            className="w-fit bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
          >
            Merchant Dashboard
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Access</h2>
            <p className="text-zinc-500 text-sm">Manage admin authentication and active sessions.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 md:gap-4">
            <input
              type="password"
              placeholder="Internal admin token"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
            />

            <button
              onClick={saveToken}
              className={`${primaryButtonClass} w-full lg:w-auto`}
            >
              Save Token
            </button>

            <button
              onClick={clearToken}
              className={`${secondaryButtonClass} w-full lg:w-auto`}
            >
              Clear Token
            </button>

            <button
              onClick={logoutAllSessions}
              className={`${dangerButtonClass} w-full lg:w-auto`}
            >
              Logout All Sessions
            </button>
          </div>

          <div className="mt-3">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                tokenState === "valid"
                  ? "bg-green-500 text-black"
                  : tokenState === "invalid"
                  ? "bg-red-500 text-black"
                  : "bg-zinc-700 text-white"
              }`}
            >
              {tokenState === "valid"
                ? "Token verified"
                : tokenState === "invalid"
                ? "Token not verified"
                : "Token not checked"}
            </span>
          </div>
        </section>

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
                Payout queue and status operations. Showing {payoutRequests.length} of {pagination.totalCount}
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

          {!loading && payoutRequests.length === 0 && (
            <p className="text-zinc-400">No payout requests found.</p>
          )}

          <div className="space-y-4">
            {payoutRequests.map((request) => (
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
                        onClick={() =>
                          updatePayoutStatus(request.id, action.status)
                        }
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
              </div>
            ))}
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
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Security</h3>
            <span className="text-zinc-500 text-sm">Last 50 events</span>
          </div>
          {securityEvents.length === 0 && (
            <p className="text-zinc-400">No security events yet.</p>
          )}
          <div className="space-y-2">
            {securityEvents.map((event) => (
              <div key={event.id} className="border border-zinc-800 rounded-xl p-3 text-sm">
                <p>
                  <span className="font-semibold">{event.event}</span>{" "}
                  <span className="text-zinc-300">{event.status}</span>{" "}
                  <span className="text-zinc-500">{event.reason || "-"}</span>
                </p>
                <p className="text-zinc-500 text-xs">
                  {event.ipAddress || "unknown ip"} - {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
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
                    onClick={() =>
                      updatePayoutStatus(selectedPayout.id, action.status)
                    }
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
                          alert("Wallet copied");
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
                  {selectedAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-zinc-800 rounded-xl p-3 text-sm"
                    >
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-zinc-400 mt-1">{log.message}</p>
                      <p className="text-zinc-500 text-xs mt-2">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
