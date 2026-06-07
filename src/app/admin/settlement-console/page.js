"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount, parseMoneyAmount } from "@/lib/money";
import { AdminAccessRequired, AdminConsoleNav } from "@/components/admin-auth";

const STATUS_OPTIONS = ["ALL", "REQUESTED", "APPROVED", "FAILED", "REJECTED", "PAID"];
const CRITICAL_CONFIRMATION_TEXT = "CONFIRM";

const getStatusClassName = (status) => {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-green-500 text-black";
  }

  if (status === "REJECTED" || status === "FAILED") {
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
      { label: "Mark Failed", status: "FAILED", className: "bg-red-500" },
      { label: "Reject", status: "REJECTED", className: "bg-red-500" },
    ];
  }

  if (status === "FAILED") {
    return [
      { label: "Retry", status: "APPROVED", className: "bg-yellow-500" },
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

const isCriticalPayoutStatus = (status) =>
  ["APPROVED", "FAILED", "PAID", "REJECTED"].includes(status);

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

const readJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const body = await response.text();

  return {
    message: `Expected JSON but received ${contentType || "unknown content"} from ${response.url || "API"}.`,
    responsePreview: body.replace(/\s+/g, " ").slice(0, 140),
  };
};

export default function AdminPayoutsPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();
  const primaryButtonClass =
    "bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const secondaryButtonClass =
    "border border-zinc-700 bg-zinc-900 px-4 py-3 rounded-xl font-semibold text-zinc-100 hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed";
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
  const baseUrl = API_BASE_URL;

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
    setConfirmAction(null);
    setCriticalConfirmationText("");
    setAdminMfaCode("");
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/admin/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const data = await readJsonResponse(response);
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
  }, [baseUrl, resetAdminSession]);

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
    [adminAccessToken, baseUrl, refreshAccessToken]
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
      reportClientError("admin.settlement.verifySession", error);
      resetAdminSession("invalid");
      return false;
    }
  }, [baseUrl, resetAdminSession]);

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

      const data = await readJsonResponse(response);

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
    const data = await readJsonResponse(response);

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

      const data = await readJsonResponse(response);

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
      const data = await readJsonResponse(response);
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
      const data = await readJsonResponse(response);
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

      const data = await readJsonResponse(response);

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

  const totalAmount = useMemo(() => {
    return payoutRequests.reduce((sum, request) => sum + parseMoneyAmount(request.amount), 0);
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

          <a
            href="/dashboard"
            className="w-fit rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 transition"
          >
            {t("admin.merchantDashboard")}
          </a>
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
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveAdminTab(tab.id);
                    if (tab.id === "security") fetchSecurityEvents();
                    if (tab.id === "sessions") fetchAdminSessions();
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                    activeAdminTab === tab.id
                      ? "border-white bg-white text-black"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">
                {adminSessionSummary.active} {t("admin.activeSessions")}
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-semibold text-zinc-400">
                {pagination.totalCount} {t("admin.payoutsCount")}
              </span>
            </div>
          </div>
        </section>

        {activeAdminTab === "payouts" && (
          <>
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">{t("admin.overview")}</h2>
            <p className="text-zinc-500 text-sm">{t("admin.overviewDescription")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-sm mb-2">{t("admin.matchingRequests")}</p>
            <p className="text-2xl font-bold">{pagination.totalCount}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-sm mb-2">{t("admin.pageAmount")}</p>
            <p className="text-2xl font-bold">
              {formatTokenAmount(totalAmount, "USDT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-sm mb-2">{t("admin.currentPage")}</p>
            <p className="text-2xl font-bold">
              {pagination.page}/{pagination.totalPages}
            </p>
          </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">{t("admin.operations")}</h2>
              <p className="text-zinc-500 text-sm">
                {t("admin.operationsDescription")
                  .replace("{shown}", visiblePayoutRequests.length)
                  .replace("{total}", pagination.totalCount)}
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
                    {status === "ALL" ? t("admin.allStatuses") : status}
                  </option>
                ))}
              </select>

              <select
                value={auditSummaryFilter}
                onChange={(e) => setAuditSummaryFilter(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              >
                <option value="ALL">{t("admin.allAuditSummaries")}</option>
                <option value="SETTLED_TX">{t("admin.hasSettlementTx")}</option>
                <option value="REJECT_REASON">{t("admin.hasRejectReason")}</option>
              </select>

              <button
                onClick={() => fetchPayouts()}
                className={secondaryButtonClass}
              >
                {t("admin.refresh")}
              </button>
              <button
                onClick={fetchSecurityEvents}
                className={secondaryButtonClass}
              >
                {t("admin.securityEvents")}
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
            <p className="text-zinc-400">{t("admin.noPayoutRequests")}</p>
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
                      {formatTokenAmount(request.amount, request.currency)}
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
                      <span className="text-zinc-500">{t("admin.merchant")}:</span>{" "}
                      {request.merchant?.name} ({request.merchant?.email})
                    </p>
                    <p className="break-all">
                      <span className="text-zinc-500">{t("admin.wallet")}:</span>{" "}
                      {request.walletAddress}
                    </p>
                    <p className="break-all">
                      <span className="text-zinc-500">{t("admin.payoutId")}:</span>{" "}
                      {request.id}
                    </p>
                    {request.note && (
                      <p className="break-all">
                        <span className="text-zinc-500">
                          {request.status === "REJECTED"
                            ? t("admin.rejectReason")
                            : request.status === "FAILED"
                            ? t("admin.failureReason")
                            : t("admin.adminNote")}:
                        </span>{" "}
                        {request.note}
                      </p>
                    )}
                    {auditSummary && (
                      <div className={`rounded-xl border p-3 ${auditSummary.className}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{auditSummary.label}</p>
                        <p className="mt-1 break-all text-sm">{auditSummary.value}</p>
                      </div>
                    )}
                    {request.settlementTxHash && (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/70">
                          {t("admin.settlementTracking")}
                        </p>
                        <p className="mt-1 break-all text-sm">{request.settlementTxHash}</p>
                        <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                          <span>{t("admin.settlementStatus")}: {request.settlementStatus || "-"}</span>
                          <span>{t("admin.settlementConfirmations")}: {request.settlementConfirmations ?? "-"}</span>
                          <span>{t("admin.settlementFee")}: {formatTokenAmount(request.settlementFee || 0, request.currency)}</span>
                        </div>
                      </div>
                    )}
                    <p>
                      <span className="text-zinc-500">{t("admin.created")}:</span>{" "}
                      {formatDashboardDateTime(request.createdAt, timeZone)}
                    </p>
                    {request.processedAt && (
                      <p>
                        <span className="text-zinc-500">{t("admin.processed")}:</span>{" "}
                        {formatDashboardDateTime(request.processedAt, timeZone)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row xl:flex-col gap-3">
                    <button
                      onClick={() => openPayoutDetails(request)}
                      className="bg-zinc-800 px-4 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition"
                    >
                      {t("admin.details")}
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
                        {t("admin.noActions")}
                      </p>
                    )}
                  </div>
                </div>
                {confirmAction?.type === "payoutStatus" &&
                  confirmAction.payoutId === request.id && (
                    <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                      <p className="mb-3">
                        {t("admin.movePrompt").replace("{status}", confirmAction.status)}
                      </p>
                      {confirmAction.status === "PAID" && (
                        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={settlementTxHash}
                            onChange={(e) => setSettlementTxHash(e.target.value)}
                            placeholder={t("admin.settlementTxHash")}
                            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                          <select
                            value={settlementStatus}
                            onChange={(e) => setSettlementStatus(e.target.value)}
                            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          >
                            <option value="BROADCASTED">BROADCASTED</option>
                            <option value="CONFIRMING">CONFIRMING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={settlementConfirmations}
                            onChange={(e) => setSettlementConfirmations(e.target.value)}
                            placeholder={t("admin.settlementConfirmations")}
                            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.000001"
                            value={settlementFee}
                            onChange={(e) => setSettlementFee(e.target.value)}
                            placeholder={t("admin.settlementFee")}
                            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                        </div>
                      )}
                      {confirmAction.status === "REJECTED" && (
                        <textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder={t("admin.rejectReason")}
                          className="mb-3 min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      )}
                      {confirmAction.status === "FAILED" && (
                        <div className="mb-3 grid grid-cols-1 gap-3">
                          <textarea
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            placeholder={t("admin.failureReason")}
                            className="min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                          <input
                            type="text"
                            value={providerError}
                            onChange={(e) => setProviderError(e.target.value)}
                            placeholder={t("admin.providerError")}
                            className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                          />
                        </div>
                      )}
                      {confirmAction.status === "APPROVED" && (
                        <input
                          type="text"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder={t("admin.requiredAdminNote")}
                          className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      )}
                      {isCriticalPayoutStatus(confirmAction.status) && (
                        <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                          <p className="mb-2 text-xs text-yellow-100/80">
                            {t("admin.criticalConfirmPrompt")}
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
                      <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                        <p className="mb-2 text-xs text-yellow-100/80">
                          {t("admin.mfaCodePrompt")}
                        </p>
                        <input
                          type="password"
                          value={adminMfaCode}
                          onChange={(e) => setAdminMfaCode(e.target.value)}
                          placeholder={t("admin.mfaCode")}
                          className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            updatePayoutStatus(
                              confirmAction.payoutId,
                              confirmAction.status
                            )
                          }
                          disabled={
                            (isCriticalPayoutStatus(confirmAction.status) &&
                              criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) ||
                            (confirmAction.status === "PAID" && (!settlementTxHash.trim() || !settlementConfirmations.trim())) ||
                            (confirmAction.status === "FAILED" && !statusNote.trim()) ||
                            !adminMfaCode.trim() ||
                            (confirmAction.status === "APPROVED" && !statusNote.trim())
                          }
                          className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t("admin.confirmStatusChange")}
                        </button>
                        <button
                          onClick={clearConfirmAction}
                          className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                        >
                          {t("admin.cancel")}
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
              {t("admin.pageOf").replace("{page}", pagination.page).replace("{total}", pagination.totalPages)}
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
                {t("admin.previous")}
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
                {t("admin.next")}
              </button>
            </div>
          </div>
        </section>
          </>
        )}

        {activeAdminTab === "security" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("admin.adminSecurity")}</p>
              <h3 className="mt-1 text-xl font-bold">{t("admin.securityEvents")}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {t("admin.securityDescription")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400">
              {t("admin.lastEvents")}
            </span>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">{t("admin.successful")}</p>
              <p className="mt-2 text-2xl font-bold text-emerald-100">{securitySummary.success}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-200/70">{t("admin.failed")}</p>
              <p className="mt-2 text-2xl font-bold text-red-100">{securitySummary.failed}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">{t("admin.blocked")}</p>
              <p className="mt-2 text-2xl font-bold text-amber-100">{securitySummary.blocked}</p>
            </div>
          </div>

          {securityEvents.length === 0 && (
            <p className="text-zinc-400">{t("admin.noSecurityEvents")}</p>
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
                    {event.reason ? event.reason.replace(/_/g, " ") : t("admin.noReason")}
                  </p>
                </div>
                <div className="text-left text-xs text-zinc-500 md:text-right">
                  <p>{event.ipAddress || t("admin.unknownIp")}</p>
                  <p className="mt-1">{formatDashboardDateTime(event.createdAt, timeZone)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {activeAdminTab === "sessions" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("admin.adminSessions")}</p>
              <h3 className="mt-1 text-xl font-bold">{t("admin.sessionOverview")}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {t("admin.sessionDescription")}
              </p>
            </div>
            <button
              onClick={() => fetchAdminSessions()}
              className={secondaryButtonClass}
            >
              {t("admin.refreshSessions")}
            </button>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            {[
              { label: t("admin.active"), value: adminSessionSummary.active, className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" },
              { label: t("admin.revoked"), value: adminSessionSummary.revoked, className: "border-red-500/20 bg-red-500/10 text-red-100" },
              { label: t("admin.expired"), value: adminSessionSummary.expired, className: "border-amber-500/20 bg-amber-500/10 text-amber-100" },
              { label: t("admin.total"), value: adminSessionSummary.total, className: "border-zinc-700 bg-zinc-950 text-zinc-100" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border p-4 ${item.className}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {adminSessions.length === 0 && (
            <p className="text-zinc-400">{t("admin.noSessions")}</p>
          )}

          <div className="space-y-3">
            {adminSessions.map((session) => (
              <div
                key={session.id}
                className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-black p-4 text-sm md:grid-cols-[140px_1fr_1fr]"
              >
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                    session.status === "ACTIVE"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : session.status === "REVOKED"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {session.status}
                </span>
                <p className="text-zinc-400">
                  {t("admin.sessionCreated")} <span className="text-zinc-200">{formatDashboardDateTime(session.createdAt, timeZone)}</span>
                </p>
                <p className="text-zinc-400">
                  {t("admin.sessionExpires")} <span className="text-zinc-200">{formatDashboardDateTime(session.expiresAt, timeZone)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
        )}
          </>
        )}
      </div>

      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
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
                  {t("admin.close")}
                </button>
              </div>
            </div>

            {confirmAction?.type === "payoutStatus" &&
              confirmAction.payoutId === selectedPayout.id && (
                <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  <p className="mb-3">
                    {t("admin.movePrompt").replace("{status}", confirmAction.status)}
                  </p>
                {confirmAction.status === "PAID" && (
                  <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={settlementTxHash}
                      onChange={(e) => setSettlementTxHash(e.target.value)}
                      placeholder={t("admin.settlementTxHash")}
                      className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                    <select
                      value={settlementStatus}
                      onChange={(e) => setSettlementStatus(e.target.value)}
                      className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    >
                      <option value="BROADCASTED">BROADCASTED</option>
                      <option value="CONFIRMING">CONFIRMING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settlementConfirmations}
                      onChange={(e) => setSettlementConfirmations(e.target.value)}
                      placeholder={t("admin.settlementConfirmations")}
                      className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={settlementFee}
                      onChange={(e) => setSettlementFee(e.target.value)}
                      placeholder={t("admin.settlementFee")}
                      className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  </div>
                )}
                  {confirmAction.status === "REJECTED" && (
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder={t("admin.rejectReason")}
                      className="mb-3 min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  )}
                  {confirmAction.status === "FAILED" && (
                    <div className="mb-3 grid grid-cols-1 gap-3">
                      <textarea
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder={t("admin.failureReason")}
                        className="min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                      />
                      <input
                        type="text"
                        value={providerError}
                        onChange={(e) => setProviderError(e.target.value)}
                        placeholder={t("admin.providerError")}
                        className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                      />
                    </div>
                  )}
                  {confirmAction.status === "APPROVED" && (
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder={t("admin.requiredAdminNote")}
                      className="mb-3 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  )}
                  {isCriticalPayoutStatus(confirmAction.status) && (
                    <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                      <p className="mb-2 text-xs text-yellow-100/80">
                        {t("admin.criticalConfirmPrompt")}
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
                  <div className="mb-3 rounded-lg border border-yellow-500/30 bg-black/20 p-3">
                    <p className="mb-2 text-xs text-yellow-100/80">
                      {t("admin.mfaCodePrompt")}
                    </p>
                    <input
                      type="password"
                      value={adminMfaCode}
                      onChange={(e) => setAdminMfaCode(e.target.value)}
                      placeholder={t("admin.mfaCode")}
                      className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        updatePayoutStatus(
                          confirmAction.payoutId,
                          confirmAction.status
                        )
                      }
                      disabled={
                        (isCriticalPayoutStatus(confirmAction.status) &&
                          criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) ||
                        (confirmAction.status === "PAID" && (!settlementTxHash.trim() || !settlementConfirmations.trim())) ||
                        (confirmAction.status === "FAILED" && !statusNote.trim()) ||
                        !adminMfaCode.trim() ||
                        (confirmAction.status === "APPROVED" && !statusNote.trim())
                      }
                      className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("admin.confirmStatusChange")}
                    </button>
                    <button
                      onClick={clearConfirmAction}
                      className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      {t("admin.cancel")}
                    </button>
                  </div>
                </div>
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
          </div>
        </div>
      )}
    </main>
  );
}
