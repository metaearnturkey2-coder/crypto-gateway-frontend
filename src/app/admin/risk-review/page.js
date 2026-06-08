"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const STATUS_OPTIONS = ["ALL", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];
const SEVERITY_OPTIONS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SOURCE_OPTIONS = ["ALL", "payment", "payout", "merchant", "wallet"];
const REVIEW_ACTIONS = ["REVIEWING", "RESOLVED", "DISMISSED"];

const getSeverityClassName = (severity) => {
  if (severity === "CRITICAL") return "border-red-400/50 bg-red-500/15 text-red-200";
  if (severity === "HIGH") return "border-orange-400/50 bg-orange-500/15 text-orange-200";
  if (severity === "MEDIUM") return "border-amber-400/50 bg-amber-500/15 text-amber-200";
  return "border-blue-400/40 bg-blue-500/10 text-blue-200";
};

const getStatusClassName = (status) => {
  if (status === "RESOLVED") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (status === "DISMISSED") return "border-zinc-500/40 bg-zinc-700/30 text-zinc-200";
  if (status === "REVIEWING") return "border-sky-400/40 bg-sky-500/10 text-sky-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const shortValue = (value) => {
  if (!value) return "-";
  return String(value).length > 24 ? `${String(value).slice(0, 10)}...${String(value).slice(-8)}` : value;
};

export default function AdminRiskReviewPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ bySeverity: {}, byStatus: {}, total: 0 });
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [updatingId, setUpdatingId] = useState("");

  const fetchRiskEvents = useCallback(
    async (accessTokenOverride, nextPage = page) => {
      const token = accessTokenOverride || adminAccessToken;
      if (!token) return;

      setLoading(true);
      setNotice(null);
      try {
        const params = new URLSearchParams({
          limit: "20",
          page: String(nextPage),
          severity: severityFilter,
          sourceType: sourceFilter,
          status: statusFilter,
        });
        if (search.trim()) params.set("search", search.trim());

        const response = await adminFetch(`/api/admin/risk-events?${params.toString()}`, {
          accessToken: token,
        });
        const data = response.body;

        if (!response.ok) {
          setNotice({ type: "error", message: data.message || "Risk events could not be loaded." });
          return;
        }

        setEvents(data.events || []);
        setStats(data.stats || { bySeverity: {}, byStatus: {}, total: 0 });
        setPagination({
          page: data.page || nextPage,
          totalCount: data.totalCount || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (error) {
        reportClientError("admin.riskReview.load", error);
        setNotice({ type: "error", message: "Risk review data could not be loaded." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, page, search, severityFilter, sourceFilter, statusFilter]
  );

  const updateRiskStatus = async (eventId, status) => {
    setUpdatingId(eventId);
    setNotice(null);
    try {
      const response = await adminFetch(`/api/admin/risk-events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = response.body;

      if (!response.ok) {
        setNotice({ type: "error", message: data.message || "Risk event could not be updated." });
        return;
      }

      setEvents((current) => current.map((event) => (event.id === eventId ? data.event : event)));
      setNotice({ type: "success", message: "Risk event updated." });
    } catch (error) {
      reportClientError("admin.riskReview.update", error);
      setNotice({ type: "error", message: "Risk event update failed." });
    } finally {
      setUpdatingId("");
    }
  };

  useEffect(() => {
    let active = true;

    queueMicrotask(async () => {
      const savedAccessToken = await verifyStoredAdminSession();

      if (!active) return;

      if (!savedAccessToken) {
        setTokenState("invalid");
        return;
      }

      setAdminAccessToken(savedAccessToken);
      setTokenState("valid");
      fetchRiskEvents(savedAccessToken, 1);
    });

    return () => {
      active = false;
    };
  }, [fetchRiskEvents]);

  const severityCards = useMemo(
    () =>
      SEVERITY_OPTIONS.filter((severity) => severity !== "ALL").map((severity) => ({
        severity,
        value: stats.bySeverity?.[severity] || 0,
      })),
    [stats]
  );

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Risk review access required" />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Compliance & Risk</p>
            <h1 className="mt-1 text-2xl font-bold">Suspicious Activity Review</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Risk kurallarinin urettigi sinyalleri inceleyin, review durumunu guncelleyin ve kaynak merchant/odeme/payout baglamini gorun.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/settlement-console" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Settlement Console
            </a>
            <a href="/admin/treasury" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Treasury
            </a>
          </div>
        </header>

        <AdminConsoleNav currentPath="/admin/risk-review" onRefresh={() => fetchRiskEvents()} loading={loading || !adminAccessToken} />
        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{stats.total || 0}</p>
          </div>
          {severityCards.map((item) => (
            <div key={item.severity} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.severity}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Rule, merchant, source id ara"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
            />
            <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none">
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={severityFilter} onChange={(event) => { setPage(1); setSeverityFilter(event.target.value); }} className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none">
              {SEVERITY_OPTIONS.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
            <select value={sourceFilter} onChange={(event) => { setPage(1); setSourceFilter(event.target.value); }} className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none">
              {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            <button onClick={() => fetchRiskEvents(undefined, 1)} disabled={loading || !adminAccessToken} className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-40">
              Filtrele
            </button>
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_1fr_220px]">
                  <div className="space-y-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSeverityClassName(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className={`ml-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(event.status)}`}>
                      {event.status}
                    </span>
                    <p className="font-mono text-xs text-zinc-500">Score {event.score}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold">{event.ruleCode}</p>
                    <p className="mt-1 text-sm text-zinc-400">{event.message}</p>
                    <p className="mt-2 break-all text-xs text-zinc-500">
                      {event.sourceType} / {shortValue(event.sourceId)} / {event.merchant?.email || "-"}
                    </p>
                    <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                      {JSON.stringify(event.metadata || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-3 xl:text-right">
                    <p className="text-xs text-zinc-500">{formatDate(event.createdAt)}</p>
                    {event.reviewedAt && (
                      <p className="text-xs text-zinc-500">
                        Reviewed {formatDate(event.reviewedAt)} by {event.reviewedBy || "-"}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {REVIEW_ACTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateRiskStatus(event.id, status)}
                          disabled={updatingId === event.id || event.status === status}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && events.length === 0 && (
            <p className="rounded-xl border border-zinc-800 bg-black p-6 text-zinc-500">Bu filtre icin risk event yok.</p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Sayfa {pagination.page} / {pagination.totalPages} - {pagination.totalCount} event
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => {
                  const nextPage = Math.max(page - 1, 1);
                  setPage(nextPage);
                  fetchRiskEvents(undefined, nextPage);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Onceki
              </button>
              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchRiskEvents(undefined, nextPage);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
