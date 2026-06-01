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
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("adminToken") || "";
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

  const fetchPayouts = useCallback(async (options = {}) => {
    const nextPage = options.page || page;
    const nextStatus = options.status || statusFilter;

    if (!adminToken) {
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

      const response = await fetch(
        `http://localhost:5000/api/admin/payout-requests?${params.toString()}`,
        {
          headers: {
            "x-admin-token": adminToken,
          },
        }
      );

      const data = await response.json();

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
  }, [adminToken, page, pagination.limit, statusFilter]);

  const saveToken = () => {
    localStorage.setItem("adminToken", adminToken);
    fetchPayouts({ page: 1 });
  };

  const updatePayoutStatus = async (payoutId, status) => {
    const note = window.prompt(`Optional note for ${status}`, "");

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/payout-requests/${payoutId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken,
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

      <div className="max-w-7xl mx-auto px-8 py-10">
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <input
              type="password"
              placeholder="Internal admin token"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
            />

            <button
              onClick={saveToken}
              className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
            >
              Save Token
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">Payout Requests</h2>
              <p className="text-zinc-500 text-sm">
                Showing {payoutRequests.length} of {pagination.totalCount}
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
                className="bg-zinc-800 px-4 py-3 rounded-xl hover:bg-zinc-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="text-zinc-400">Loading payouts...</p>}

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
                    <p className="text-2xl font-bold">
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

                  <div className="flex flex-col gap-3">
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
      </div>
    </main>
  );
}
