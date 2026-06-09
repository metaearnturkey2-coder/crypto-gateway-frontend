"use client";

import { formatTokenAmount } from "@/lib/money";

export const CRITICAL_CONFIRMATION_TEXT = "CONFIRM";

export const STATUS_OPTIONS = ["ALL", "REQUESTED", "APPROVED", "FAILED", "REJECTED", "PAID"];

export const getStatusClassName = (status) => {
  if (status === "PAID" || status === "APPROVED") {
    return "bg-green-500 text-black";
  }

  if (status === "REJECTED" || status === "FAILED") {
    return "bg-red-500 text-black";
  }

  return "bg-yellow-500 text-black";
};

export const getAllowedActions = (status) => {
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

export const isCriticalPayoutStatus = (status) =>
  ["APPROVED", "FAILED", "PAID", "REJECTED"].includes(status);

export function PayoutStatusConfirmPanel({
  adminMfaCode,
  clearConfirmAction,
  confirmAction,
  criticalConfirmationText,
  providerError,
  setAdminMfaCode,
  setCriticalConfirmationText,
  setProviderError,
  setSettlementConfirmations,
  setSettlementFee,
  setSettlementStatus,
  setSettlementTxHash,
  setStatusNote,
  settlementConfirmations,
  settlementFee,
  settlementStatus,
  settlementTxHash,
  statusNote,
  t,
  updatePayoutStatus,
  variant = "inline",
}) {
  if (!confirmAction) {
    return null;
  }

  const wrapperClassName =
    variant === "modal"
      ? "mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100"
      : "mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100";

  return (
    <div className={wrapperClassName}>
      <p className="mb-3">
        {t("admin.movePrompt").replace("{status}", confirmAction.status)}
      </p>

      {confirmAction.status === "PAID" && (
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={settlementTxHash}
            onChange={(event) => setSettlementTxHash(event.target.value)}
            placeholder={t("admin.settlementTxHash")}
            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
          />
          <select
            value={settlementStatus}
            onChange={(event) => setSettlementStatus(event.target.value)}
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
            onChange={(event) => setSettlementConfirmations(event.target.value)}
            placeholder={t("admin.settlementConfirmations")}
            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.000001"
            value={settlementFee}
            onChange={(event) => setSettlementFee(event.target.value)}
            placeholder={t("admin.settlementFee")}
            className="rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
          />
        </div>
      )}

      {confirmAction.status === "REJECTED" && (
        <textarea
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
          placeholder={t("admin.rejectReason")}
          className="mb-3 min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
        />
      )}

      {confirmAction.status === "FAILED" && (
        <div className="mb-3 grid grid-cols-1 gap-3">
          <textarea
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            placeholder={t("admin.failureReason")}
            className="min-h-24 w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
          />
          <input
            type="text"
            value={providerError}
            onChange={(event) => setProviderError(event.target.value)}
            placeholder={t("admin.providerError")}
            className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
          />
        </div>
      )}

      {confirmAction.status === "APPROVED" && (
        <input
          type="text"
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
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
            onChange={(event) => setCriticalConfirmationText(event.target.value)}
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
          onChange={(event) => setAdminMfaCode(event.target.value)}
          placeholder={t("admin.mfaCode")}
          className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-yellow-50 outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            updatePayoutStatus(confirmAction.payoutId, confirmAction.status)
          }
          disabled={
            (isCriticalPayoutStatus(confirmAction.status) &&
              criticalConfirmationText.trim() !== CRITICAL_CONFIRMATION_TEXT) ||
            (confirmAction.status === "PAID" &&
              (!settlementTxHash.trim() || !settlementConfirmations.trim())) ||
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
  );
}

export const formatSecurityEvent = (event) =>
  String(event || "security_event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getSecurityStatusClassName = (status) => {
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

export function AdminSecurityEventsPanel({
  formatDashboardDateTime,
  securityEvents,
  securitySummary,
  t,
  timeZone,
}) {
  return (
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
  );
}

export function PayoutOverviewPanel({ pagination, payoutSummary, t }) {
  return (
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
          <p className="text-zinc-500 text-sm mb-2">{t("admin.matchingAmount")}</p>
          <p className="text-2xl font-bold">
            {formatTokenAmount(payoutSummary.totalAmount, "USDT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  );
}

export function PayoutOperationsPanel({
  adminMfaCode,
  auditSummaryFilter,
  clearConfirmAction,
  confirmAction,
  criticalConfirmationText,
  fetchPayouts,
  fetchSecurityEvents,
  formatDashboardDateTime,
  getPayoutAuditSummary,
  loading,
  openPayoutDetails,
  openStatusConfirm,
  page,
  pagination,
  providerError,
  secondaryButtonClass,
  setAdminMfaCode,
  setAuditSummaryFilter,
  setCriticalConfirmationText,
  setPage,
  setProviderError,
  setSettlementConfirmations,
  setSettlementFee,
  setSettlementStatus,
  setSettlementTxHash,
  setStatusFilter,
  setStatusNote,
  settlementConfirmations,
  settlementFee,
  settlementStatus,
  settlementTxHash,
  statusFilter,
  statusNote,
  t,
  timeZone,
  updatePayoutStatus,
  visiblePayoutRequests,
}) {
  return (
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
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
              fetchPayouts({
                page: 1,
                status: event.target.value,
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
            onChange={(event) => setAuditSummaryFilter(event.target.value)}
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
                  />
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
  );
}

export function AdminSessionsPanel({
  adminSessionSummary,
  adminSessions,
  formatDashboardDateTime,
  onRefresh,
  secondaryButtonClass,
  t,
  timeZone,
}) {
  return (
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
          onClick={onRefresh}
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
  );
}
