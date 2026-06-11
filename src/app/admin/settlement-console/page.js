"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardButton, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import { apiResponseResult, fetchApi } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount, parseMoneyAmount } from "@/lib/money";
import { AdminAccessRequired, AdminConsoleNav } from "@/components/admin-auth";
import {
  AdminSecurityEventsPanel,
  AdminSessionsPanel,
  CRITICAL_CONFIRMATION_TEXT,
  getAllowedActions,
  getStatusClassName,
  isCriticalPayoutStatus,
  PayoutOperationsPanel,
  PayoutOverviewPanel,
  PayoutStatusConfirmPanel,
} from "./components";

const formatAuditAction = (action) =>
  String(action || "audit")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const getAuditActionClassName = (action) => {
  if (action?.includes("paid")) return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
  if (action?.includes("approved")) return "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40";
  if (action?.includes("rejected") || action?.includes("failed")) return "bg-red-500/20 text-red-200 border border-red-400/40";
  if (action?.includes("retry")) return "bg-yellow-500/20 text-yellow-100 border border-yellow-400/40";
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
    "adminNote",
    "amount",
    "currency",
    "txHash",
    "rejectReason",
    "failureReason",
    "providerError",
    "retryCount",
    "confirmationRequired",
    "confirmationProvided",
    "actorType",
  ];

  return preferredKeys
    .filter((key) => metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== "")
    .map((key) => [key, metadata[key]]);
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

  if (request.status === "FAILED" && (metadata.failureReason || request.failureReason || request.note)) {
    return {
      label: "Failure reason",
      value: metadata.failureReason || request.failureReason || request.note,
      className: "border-red-500/30 bg-red-500/10 text-red-100",
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
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [auditSummaryFilter, setAuditSummaryFilter] = useState("ALL");
  const [activeAdminTab, setActiveAdminTab] = useState("payouts");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [payoutSummary, setPayoutSummary] = useState({
    totalAmount: "0",
    byStatus: {},
  });
  const [loading, setLoading] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [adminSessions, setAdminSessions] = useState([]);
  const [adminSessionSummary, setAdminSessionSummary] = useState({
    total: 0,
    active: 0,
    revoked: 0,
    expired: 0,
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tokenState, setTokenState] = useState("unknown");
  const [notice, setNotice] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [providerError, setProviderError] = useState("");
  const [settlementTxHash, setSettlementTxHash] = useState("");
  const [settlementFee, setSettlementFee] = useState("");
  const [settlementConfirmations, setSettlementConfirmations] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("CONFIRMED");
  const [criticalConfirmationText, setCriticalConfirmationText] = useState("");
  const [adminMfaCode, setAdminMfaCode] = useState("");
  const sessionRestoreStartedRef = useRef(false);

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const clearConfirmAction = () => {
    setConfirmAction(null);
    setCriticalConfirmationText("");
    setAdminMfaCode("");
  };

  const resetAdminSession = useCallback((nextTokenState = "unknown") => {
    localStorage.removeItem("adminAccessToken");
    setAdminAccessToken("");
    setTokenState(nextTokenState);
    setPayoutRequests([]);
    setSelectedPayout(null);
    setSelectedAuditLogs([]);
    setSecurityEvents([]);
    setAdminSessions([]);
    setAdminSessionSummary({
      total: 0,
      active: 0,
      revoked: 0,
      expired: 0,
    });
    setPagination({
      page: 1,
      limit: 10,
      totalCount: 0,
      totalPages: 1,
    });
    setPayoutSummary({
      totalAmount: "0",
      byStatus: {},
    });
    setConfirmAction(null);
    setCriticalConfirmationText("");
    setAdminMfaCode("");
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetchApi("/api/admin/refresh", {
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
      reportClientError("admin.settlement.refreshSession", error);
      resetAdminSession("invalid");
      return null;
    }
  }, [resetAdminSession]);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const { accessToken, ...fetchOptions } = options;
      const makeRequest = async (token) =>
        fetchApi(path, {
          ...fetchOptions,
          headers: {
            ...(fetchOptions.headers || {}),
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

      let response = await makeRequest(accessToken || adminAccessToken);
      if (response.status !== 401) {
        return apiResponseResult(response);
      }

      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        return apiResponseResult(response);
      }

      response = await makeRequest(nextAccessToken);
      return apiResponseResult(response);
    },
    [adminAccessToken, refreshAccessToken]
  );

  const verifyAdminToken = useCallback(async (token) => {
    if (!token) {
      setTokenState("invalid");
      return false;
    }

    try {
      const response = await fetchApi("/api/admin/me", {
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
      reportClientError("admin.settlement.verifySession", error);
      resetAdminSession("invalid");
      return false;
    }
  }, [resetAdminSession]);

  const fetchPayouts = useCallback(async (options = {}) => {
    const nextPage = options.page || page;
    const nextStatus = options.status || statusFilter;
    const accessToken = options.accessToken || adminAccessToken;

    if (!accessToken) {
      showNotice("error", "Admin session is required.");
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

      const data = response.body;

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
      setPayoutSummary(
        data.summary || {
          totalAmount: "0",
          byStatus: {},
        }
      );
    } catch (error) {
      reportClientError("admin.settlement.fetchPayouts", error);
      showNotice("error", "Admin payouts error.");
    } finally {
      setLoading(false);
    }
  }, [adminAccessToken, adminFetch, page, pagination.limit, resetAdminSession, statusFilter]);

  const requestAdminStepUpToken = async (mfaCode) => {
    const response = await adminFetch("/api/admin/step-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mfaCode,
      }),
    });
    const data = response.body;

    if (!response.ok || !data.stepUpToken) {
      showNotice("error", data.message || "Admin step-up verification error.");
      return null;
    }

    return data.stepUpToken;
  };

  const fetchPayoutAuditLogs = async (payoutId) => {
    setDetailsLoading(true);

    try {
      const response = await adminFetch(
        `/api/admin/payout-requests/${payoutId}/audit-logs`
      );

      const data = response.body;

      if (!response.ok) {
        showNotice("error", data.message || "Payout audit logs error.");
        return;
      }

      setSelectedAuditLogs(data.auditLogs || []);
    } catch (error) {
      reportClientError("admin.settlement.fetchPayoutAuditLogs", error);
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
      const data = response.body;
      if (response.ok) {
        setSecurityEvents(data.events || []);
      }
    } catch (error) {
      reportClientError("admin.settlement.fetchSecurityEvents", error);
    }
  }, [adminAccessToken, adminFetch]);

  const fetchAdminSessions = useCallback(async (accessTokenOverride) => {
    const accessToken = accessTokenOverride || adminAccessToken;
    if (!accessToken) {
      return;
    }

    try {
      const response = await adminFetch("/api/admin/sessions", {
        accessToken,
      });
      const data = response.body;
      if (response.ok) {
        setAdminSessions(data.sessions || []);
        setAdminSessionSummary(
          data.summary || {
            total: 0,
            active: 0,
            revoked: 0,
            expired: 0,
          }
        );
      }
    } catch (error) {
      reportClientError("admin.settlement.fetchAdminSessions", error);
    }
  }, [adminAccessToken, adminFetch]);

  useEffect(() => {
    if (sessionRestoreStartedRef.current) {
      return;
    }

    sessionRestoreStartedRef.current = true;

    localStorage.removeItem("adminToken");
    const savedAccessToken = localStorage.getItem("adminAccessToken") || "";

    queueMicrotask(() => {
      if (!savedAccessToken) {
        return;
      }

      setAdminAccessToken(savedAccessToken);

      const restoreSession = async () => {
        const isValid = await verifyAdminToken(savedAccessToken);

        if (!isValid) {
          resetAdminSession("invalid");
          return;
        }

        fetchPayouts({ page: 1, accessToken: savedAccessToken });
        fetchSecurityEvents(savedAccessToken);
        fetchAdminSessions(savedAccessToken);
      };

      restoreSession();
    });
  }, [fetchAdminSessions, fetchPayouts, fetchSecurityEvents, resetAdminSession, verifyAdminToken]);

  const openPayoutDetails = (request) => {
    setSelectedPayout(request);
    setSelectedAuditLogs([]);
    fetchPayoutAuditLogs(request.id);
  };

  const openStatusConfirm = (payoutId, status) => {
    setStatusNote("");
    setProviderError("");
    setSettlementTxHash("");
    setSettlementFee("");
    setSettlementConfirmations("");
    setSettlementStatus("CONFIRMED");
    setCriticalConfirmationText("");
    setAdminMfaCode("");
    setConfirmAction({
      type: "payoutStatus",
      payoutId,
      status,
    });
  };

  const updatePayoutStatus = async (payoutId, status) => {
    const trimmedTxHash = settlementTxHash.trim();
    const trimmedNote = statusNote.trim();
    const trimmedProviderError = providerError.trim();
    const trimmedSettlementFee = settlementFee.trim();
    const trimmedSettlementConfirmations = settlementConfirmations.trim();

    if (status === "PAID" && !trimmedTxHash) {
      showNotice("error", t("admin.settlementTxRequired"));
      return;
    }

    if (status === "PAID" && !trimmedSettlementConfirmations) {
      showNotice("error", t("admin.settlementConfirmationsRequired"));
      return;
    }

    if (status === "PAID" && trimmedSettlementFee && parseMoneyAmount(trimmedSettlementFee, -1) < 0) {
      showNotice("error", t("admin.settlementFeeInvalid"));
      return;
    }

    if (status === "REJECTED" && !trimmedNote) {
      showNotice("error", t("admin.rejectReasonRequired"));
      return;
    }

    if (status === "APPROVED" && !trimmedNote) {
      showNotice("error", t("admin.adminNoteRequired"));
      return;
    }

    if (status === "FAILED" && !trimmedNote) {
      showNotice("error", t("admin.failureReasonRequired"));
      return;
    }

    if (isCriticalPayoutStatus(status) && criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) {
      showNotice("error", t("admin.criticalConfirmRequired"));
      return;
    }

    if (!adminMfaCode.trim()) {
      showNotice("error", t("admin.mfaCodeRequired"));
      return;
    }

    try {
      const stepUpToken = await requestAdminStepUpToken(adminMfaCode.trim());
      if (!stepUpToken) {
        return;
      }

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
            settlementConfirmations: status === "PAID" ? Number(trimmedSettlementConfirmations) : undefined,
            settlementFee: status === "PAID" ? trimmedSettlementFee || "0" : undefined,
            settlementStatus: status === "PAID" ? settlementStatus : undefined,
            failureReason: status === "FAILED" ? trimmedNote : undefined,
            providerError: status === "FAILED" ? trimmedProviderError || undefined : undefined,
            rejectReason: status === "REJECTED" ? trimmedNote : undefined,
            note: status !== "REJECTED" && status !== "FAILED" ? trimmedNote || undefined : undefined,
            confirmationText: isCriticalPayoutStatus(status)
              ? criticalConfirmationText.trim()
              : undefined,
            stepUpToken,
          }),
        }
      );

      const data = response.body;

      if (!response.ok) {
        showNotice("error", data.message || "Update payout status error.");
        return;
      }

      showNotice("success", data.message || `Payout moved to ${status}.`);
      clearConfirmAction();
      setStatusNote("");
      setProviderError("");
      setSettlementTxHash("");
      setSettlementFee("");
      setSettlementConfirmations("");
      setSettlementStatus("CONFIRMED");
      setCriticalConfirmationText("");
      setAdminMfaCode("");
      fetchPayouts();
      if (selectedPayout?.id === payoutId) {
        setSelectedPayout(data.payoutRequest);
        fetchPayoutAuditLogs(payoutId);
      }
    } catch (error) {
      reportClientError("admin.settlement.updatePayoutStatus", error);
      showNotice("error", "Update payout status error.");
    }
  };

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

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Settlement console access required" />;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/70">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("admin.internalConsole")}</p>
            <h1 className="mt-1 text-2xl font-bold">{t("admin.payoutsTitle")}</h1>
            <p className="text-zinc-500 text-sm">{t("admin.subtitle")}</p>
          </div>

          <DashboardButton
            as="a"
            variant="adminSecondary"
            href="/dashboard"
            className="w-fit px-4 py-2"
          >
            {t("admin.merchantDashboard")}
          </DashboardButton>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-8 md:py-6">
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

        <AdminConsoleNav
          currentPath="/admin/settlement-console"
          onRefresh={() => {
            fetchPayouts({ page: 1 });
            fetchSecurityEvents();
            fetchAdminSessions();
          }}
          loading={loading || !adminAccessToken}
        />

        {tokenState === "valid" && (
          <>
        <section className="sticky top-0 z-20 -mx-4 border-y border-zinc-800 bg-black/90 px-4 py-2.5 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "payouts", label: t("admin.payouts") },
                { id: "security", label: t("admin.security") },
                { id: "sessions", label: t("admin.sessions") },
              ].map((tab) => (
                <DashboardButton
                  type="button"
                  variant={activeAdminTab === tab.id ? "adminPrimary" : "adminSecondary"}
                  key={tab.id}
                  onClick={() => {
                    setActiveAdminTab(tab.id);
                    if (tab.id === "security") fetchSecurityEvents();
                    if (tab.id === "sessions") fetchAdminSessions();
                  }}
                  className="px-3 py-1.5"
                >
                  {tab.label}
                </DashboardButton>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <DashboardPill className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                {adminSessionSummary.active} {t("admin.activeSessions")}
              </DashboardPill>
              <DashboardPill variant="admin" className="bg-zinc-900 text-zinc-400">
                {pagination.totalCount} {t("admin.payoutsCount")}
              </DashboardPill>
            </div>
          </div>
        </section>

        {activeAdminTab === "payouts" && (
          <>
            <PayoutOverviewPanel
              pagination={pagination}
              payoutSummary={payoutSummary}
              t={t}
            />

            <PayoutOperationsPanel
              adminMfaCode={adminMfaCode}
              auditSummaryFilter={auditSummaryFilter}
              clearConfirmAction={clearConfirmAction}
              confirmAction={confirmAction}
              criticalConfirmationText={criticalConfirmationText}
              fetchPayouts={fetchPayouts}
              fetchSecurityEvents={fetchSecurityEvents}
              formatDashboardDateTime={formatDashboardDateTime}
              getPayoutAuditSummary={getPayoutAuditSummary}
              loading={loading}
              openPayoutDetails={openPayoutDetails}
              openStatusConfirm={openStatusConfirm}
              page={page}
              pagination={pagination}
              providerError={providerError}
              setAdminMfaCode={setAdminMfaCode}
              setAuditSummaryFilter={setAuditSummaryFilter}
              setCriticalConfirmationText={setCriticalConfirmationText}
              setPage={setPage}
              setProviderError={setProviderError}
              setSettlementConfirmations={setSettlementConfirmations}
              setSettlementFee={setSettlementFee}
              setSettlementStatus={setSettlementStatus}
              setSettlementTxHash={setSettlementTxHash}
              setStatusFilter={setStatusFilter}
              setStatusNote={setStatusNote}
              settlementConfirmations={settlementConfirmations}
              settlementFee={settlementFee}
              settlementStatus={settlementStatus}
              settlementTxHash={settlementTxHash}
              statusFilter={statusFilter}
              statusNote={statusNote}
              t={t}
              timeZone={timeZone}
              updatePayoutStatus={updatePayoutStatus}
              visiblePayoutRequests={visiblePayoutRequests}
            />
          </>
        )}
        {activeAdminTab === "security" && (
          <AdminSecurityEventsPanel
            formatDashboardDateTime={formatDashboardDateTime}
            securityEvents={securityEvents}
            securitySummary={securitySummary}
            t={t}
            timeZone={timeZone}
          />
        )}

        {activeAdminTab === "sessions" && (
          <AdminSessionsPanel
            adminSessionSummary={adminSessionSummary}
            adminSessions={adminSessions}
            formatDashboardDateTime={formatDashboardDateTime}
            onRefresh={() => fetchAdminSessions()}
            t={t}
            timeZone={timeZone}
          />
        )}
          </>
        )}
      </div>

      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <DashboardPanel as="div" variant="admin" className="max-w-5xl mx-auto p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{t("admin.payoutDetails")}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                      selectedPayout.status
                    )}`}
                  >
                    {selectedPayout.status}
                  </span>
                </div>
                <p className="text-zinc-400">
                  {formatTokenAmount(selectedPayout.amount, selectedPayout.currency)} {t("admin.to")}{" "}
                  {selectedPayout.walletAddress}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {getAllowedActions(selectedPayout.status).map((action) => (
                  <DashboardButton
                    type="button"
                    variant="plain"
                    key={action.status}
                    onClick={() => openStatusConfirm(selectedPayout.id, action.status)}
                    className={`${action.className} text-black px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition`}
                  >
                    {action.label}
                  </DashboardButton>
                ))}

                <DashboardButton
                  type="button"
                  variant="adminSecondary"
                  onClick={() => {
                    setSelectedPayout(null);
                    setSelectedAuditLogs([]);
                  }}
                  className="px-4 py-2 hover:bg-zinc-700"
                >
                  {t("admin.close")}
                </DashboardButton>
              </div>
            </div>

            {confirmAction?.type === "payoutStatus" &&
              confirmAction.payoutId === selectedPayout.id && (
                <PayoutStatusConfirmPanel
                  adminMfaCode={adminMfaCode}
                  clearConfirmAction={clearConfirmAction}
                  confirmAction={confirmAction}
                  criticalConfirmationText={criticalConfirmationText}
                  providerError={providerError}
                  setAdminMfaCode={setAdminMfaCode}
                  setCriticalConfirmationText={setCriticalConfirmationText}
                  setProviderError={setProviderError}
                  setSettlementConfirmations={setSettlementConfirmations}
                  setSettlementFee={setSettlementFee}
                  setSettlementStatus={setSettlementStatus}
                  setSettlementTxHash={setSettlementTxHash}
                  setStatusNote={setStatusNote}
                  settlementConfirmations={settlementConfirmations}
                  settlementFee={settlementFee}
                  settlementStatus={settlementStatus}
                  settlementTxHash={settlementTxHash}
                  statusNote={statusNote}
                  t={t}
                  updatePayoutStatus={updatePayoutStatus}
                  variant="modal"
                />
              )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <section className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">{t("admin.merchant")}</p>
                    <p className="font-semibold">
                      {selectedPayout.merchant?.name}
                    </p>
                    <p className="text-zinc-400 break-all">
                      {selectedPayout.merchant?.email}
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">{t("admin.amount")}</p>
                    <p className="text-xl font-bold">
                      {formatTokenAmount(selectedPayout.amount, selectedPayout.currency)}
                    </p>
                    <p className="text-zinc-400">{selectedPayout.network}</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-zinc-500 text-xs mb-1">
                          {t("admin.walletAddress")}
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
                          showNotice("success", t("admin.walletCopied"));
                        }}
                        className="shrink-0 bg-zinc-800 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition"
                      >
                        {t("admin.copy")}
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">{t("admin.created")}</p>
                    <p>{formatDashboardDateTime(selectedPayout.createdAt, timeZone)}</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">{t("admin.processed")}</p>
                    <p>
                      {selectedPayout.processedAt
                        ? formatDashboardDateTime(selectedPayout.processedAt, timeZone)
                        : t("admin.notProcessed")}
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                    <p className="text-zinc-500 text-xs mb-1">{t("admin.note")}</p>
                    <p className="break-all">
                      {selectedPayout.note || t("admin.noNote")}
                    </p>
                  </div>

                  {(selectedPayout.failureReason || selectedPayout.providerError || selectedPayout.retryCount > 0) && (
                    <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4 md:col-span-2">
                      <p className="text-red-100/70 text-xs mb-1">{t("admin.failureRetryTracking")}</p>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-zinc-500 text-xs">{t("admin.failureReason")}</p>
                          <p className="break-all">{selectedPayout.failureReason || "-"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">{t("admin.providerError")}</p>
                          <p className="break-all">{selectedPayout.providerError || "-"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">{t("admin.retryCount")}</p>
                          <p>{selectedPayout.retryCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-4 md:col-span-2">
                    <p className="text-blue-100/70 text-xs mb-1">{t("admin.settlementTracking")}</p>
                    {selectedPayout.settlementTxHash ? (
                      <div className="space-y-3">
                        <p className="break-all text-blue-100">{selectedPayout.settlementTxHash}</p>
                        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-zinc-500 text-xs">{t("admin.settlementStatus")}</p>
                            <p>{selectedPayout.settlementStatus || "-"}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs">{t("admin.settlementConfirmations")}</p>
                            <p>{selectedPayout.settlementConfirmations ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs">{t("admin.settlementFee")}</p>
                            <p>{formatTokenAmount(selectedPayout.settlementFee || 0, selectedPayout.currency)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-500">{t("admin.noSettlementTracking")}</p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-bold mb-4">{t("admin.auditTrail")}</h3>

                {detailsLoading && (
                  <p className="text-zinc-400">{t("admin.loadingAuditLogs")}</p>
                )}

                {!detailsLoading && selectedAuditLogs.length === 0 && (
                  <p className="text-zinc-400">{t("admin.noAuditLogs")}</p>
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
                              {formatDashboardDateTime(log.createdAt, timeZone)}
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
          </DashboardPanel>
        </div>
      )}
    </main>
  );
}
