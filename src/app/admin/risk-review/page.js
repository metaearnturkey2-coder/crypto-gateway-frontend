"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardInput,
  DashboardMetric,
  DashboardPanel,
  DashboardPill,
  DashboardSelect,
} from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const STATUS_OPTIONS = ["ALL", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];
const SEVERITY_OPTIONS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SOURCE_OPTIONS = ["ALL", "payment", "payout", "merchant", "wallet"];
const REVIEW_ACTIONS = ["REVIEWING", "RESOLVED", "DISMISSED"];

const STATUS_LABELS = {
  ALL: "Tüm durumlar",
  OPEN: "Açık",
  REVIEWING: "İnceleniyor",
  RESOLVED: "Çözüldü",
  DISMISSED: "Yok sayıldı",
};

const SEVERITY_LABELS = {
  ALL: "Tüm seviyeler",
  CRITICAL: "Kritik",
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
};

const SOURCE_LABELS = {
  ALL: "Tüm kaynaklar",
  payment: "Payment",
  payout: "Payout",
  merchant: "Merchant",
  wallet: "Wallet",
};

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
  const normalized = String(value);
  return normalized.length > 24 ? `${normalized.slice(0, 10)}...${normalized.slice(-8)}` : normalized;
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
          setNotice({ type: "error", message: data.message || "Risk olayları yüklenemedi." });
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
        setNotice({ type: "error", message: "Risk inceleme verileri yüklenemedi." });
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
        setNotice({ type: "error", message: data.message || "Risk olayı güncellenemedi." });
        return;
      }

      setEvents((current) => current.map((event) => (event.id === eventId ? data.event : event)));
      setNotice({ type: "success", message: "Risk olayı güncellendi." });
    } catch (error) {
      reportClientError("admin.riskReview.update", error);
      setNotice({ type: "error", message: "Risk olayı güncellemesi başarısız." });
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
        label: SEVERITY_LABELS[severity] || severity,
        severity,
        value: stats.bySeverity?.[severity] || 0,
      })),
    [stats]
  );

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Risk inceleme için admin girişi gerekli" />;
  }

  return (
    <main className="admin-treasury-page admin-risk-page min-h-screen text-zinc-100">
      <header className="admin-treasury-header admin-risk-header border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-1 text-2xl font-bold">Risk inceleme</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Risk kurallarının ürettiği sinyalleri inceleyin, durumlarını güncelleyin ve kaynak bağlamını görün.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <DashboardButton
              as="a"
              href="/admin/settlement-console"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Settlement konsolu
            </DashboardButton>
            <DashboardButton
              as="a"
              href="/admin/treasury"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Hazine
            </DashboardButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-8 md:py-6">
        <AdminConsoleNav currentPath="/admin/risk-review" onRefresh={() => fetchRiskEvents()} loading={loading || !adminAccessToken} />

        {notice && (
          <div
            className={`admin-risk-notice rounded-lg border px-4 py-3 text-sm ${
              notice.type === "error"
                ? "admin-treasury-notice-error admin-risk-notice-error"
                : "admin-treasury-notice-success admin-risk-notice-success"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <DashboardMetric variant="admin" className="admin-treasury-metric admin-risk-metric rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Toplam</p>
            <p className="mt-2 text-2xl font-bold">{stats.total || 0}</p>
          </DashboardMetric>
          {severityCards.map((item) => (
            <DashboardMetric key={item.severity} variant="admin" className="admin-treasury-metric admin-risk-metric rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </DashboardMetric>
          ))}
        </section>

        <DashboardPanel variant="adminMuted" className="admin-treasury-panel admin-risk-panel rounded-lg p-4 sm:p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Risk olayları</p>
            <h2 className="mt-1 text-xl font-bold">İnceleme kuyruğu</h2>
            <p className="mt-1 text-sm text-zinc-500">{pagination.totalCount || 0} olay filtreyle eşleşiyor</p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_165px_165px_165px_auto]">
            <DashboardInput
              variant="admin"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Kural, merchant veya kaynak ID ara"
              className="h-10 rounded-lg"
            />
            <DashboardSelect
              variant="admin"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="h-10 rounded-lg"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] || status}
                </option>
              ))}
            </DashboardSelect>
            <DashboardSelect
              variant="admin"
              value={severityFilter}
              onChange={(event) => {
                setPage(1);
                setSeverityFilter(event.target.value);
              }}
              className="h-10 rounded-lg"
            >
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_LABELS[severity] || severity}
                </option>
              ))}
            </DashboardSelect>
            <DashboardSelect
              variant="admin"
              value={sourceFilter}
              onChange={(event) => {
                setPage(1);
                setSourceFilter(event.target.value);
              }}
              className="h-10 rounded-lg"
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABELS[source] || source}
                </option>
              ))}
            </DashboardSelect>
            <DashboardButton
              type="button"
              variant="adminPrimary"
              onClick={() => fetchRiskEvents(undefined, 1)}
              disabled={loading || !adminAccessToken}
              className="h-10 rounded-lg px-5 disabled:opacity-40"
            >
              Filtrele
            </DashboardButton>
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <DashboardPanel
                as="div"
                key={event.id}
                variant="admin"
                className="admin-treasury-sweep-card admin-risk-event-card rounded-lg p-4 sm:p-4"
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_1fr_230px]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <DashboardPill className={`inline-flex ${getSeverityClassName(event.severity)}`}>
                        {SEVERITY_LABELS[event.severity] || event.severity}
                      </DashboardPill>
                      <DashboardPill className={`inline-flex ${getStatusClassName(event.status)}`}>
                        {STATUS_LABELS[event.status] || event.status}
                      </DashboardPill>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Skor</p>
                    <p className="mt-1 text-2xl font-bold">{event.score}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold">{event.ruleCode}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{event.message}</p>
                    <p className="mt-2 break-all text-xs text-zinc-500">
                      {SOURCE_LABELS[event.sourceType] || event.sourceType} / {shortValue(event.sourceId)} / {event.merchant?.email || "-"}
                    </p>
                    <pre className="admin-treasury-panel admin-risk-metadata mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-3 text-xs">
                      {JSON.stringify(event.metadata || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-3 xl:text-right">
                    <p className="text-xs text-zinc-500">{formatDate(event.createdAt)}</p>
                    {event.reviewedAt && (
                      <p className="text-xs text-zinc-500">
                        İnceleme {formatDate(event.reviewedAt)} / {event.reviewedBy || "-"}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {REVIEW_ACTIONS.map((status) => (
                        <DashboardButton
                          type="button"
                          variant="adminSecondary"
                          key={status}
                          onClick={() => updateRiskStatus(event.id, status)}
                          disabled={updatingId === event.id || event.status === status}
                          className="h-9 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {STATUS_LABELS[status] || status}
                        </DashboardButton>
                      ))}
                    </div>
                  </div>
                </div>
              </DashboardPanel>
            ))}
          </div>

          {!loading && events.length === 0 && (
            <DashboardEmptyState variant="admin" className="rounded-lg p-6">
              Bu filtre için risk olayı yok.
            </DashboardEmptyState>
          )}

          <div className="admin-settlement-pagination admin-risk-pagination mt-5 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Sayfa {pagination.page} / {pagination.totalPages} - {pagination.totalCount} olay
            </p>
            <div className="flex gap-2">
              <DashboardButton
                type="button"
                variant="adminSecondary"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const nextPage = Math.max(page - 1, 1);
                  setPage(nextPage);
                  fetchRiskEvents(undefined, nextPage);
                }}
                className="h-9 rounded-lg px-4 disabled:opacity-40"
              >
                Önceki
              </DashboardButton>
              <DashboardButton
                type="button"
                variant="adminSecondary"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchRiskEvents(undefined, nextPage);
                }}
                className="h-9 rounded-lg px-4 disabled:opacity-40"
              >
                Sonraki
              </DashboardButton>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}
