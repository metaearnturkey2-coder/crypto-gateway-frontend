import Link from "next/link";
import { Activity, Filter } from "lucide-react";
import {
  formatActivityAction,
  formatDateTime,
  formatMetadataValue,
  getActivityMeta,
} from "@/features/merchant-payments/formatters";

export function ActivityPanel({
  auditActionFilter,
  auditActions,
  auditLogs,
  auditPagination,
  auditTargetTypeFilter,
  auditTargetTypes,
  setAuditActionFilter,
  setAuditPage,
  setAuditTargetTypeFilter,
  timeZone,
  t,
}) {
  return (
    <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-white md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
            <Activity size={17} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{t("merchantPayments.activityTitle")}</h2>
            <p className="text-sm text-zinc-500">
              {t("merchantPayments.showingActivity")
                .replace("{shown}", auditLogs.length)
                .replace("{total}", auditPagination.totalCount)}
            </p>
          </div>
        </div>
      </div>

      <div className="activity-filter-bar mb-4 grid grid-cols-1 gap-2 rounded-lg border p-1.5 sm:grid-cols-[minmax(220px,420px)_minmax(220px,420px)_110px]">
        <select
          value={auditActionFilter}
          onChange={(event) => {
            setAuditActionFilter(event.target.value);
            setAuditPage(1);
          }}
          className="operations-filter-field h-10 rounded-lg border px-3 text-sm outline-none transition"
        >
          <option value="ALL">{t("merchantPayments.allActions")}</option>
          {auditActions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

        <select
          value={auditTargetTypeFilter}
          onChange={(event) => {
            setAuditTargetTypeFilter(event.target.value);
            setAuditPage(1);
          }}
          className="operations-filter-field h-10 rounded-lg border px-3 text-sm outline-none transition"
        >
          <option value="ALL">{t("merchantPayments.allTargetTypes")}</option>
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
          className="operations-filter-button h-10 rounded-lg border px-4 text-sm font-semibold transition"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Filter size={14} />
            {t("merchantPayments.clearFilters")}
          </span>
        </button>
      </div>

      {auditPagination.totalCount === 0 && <p className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">{t("merchantPayments.noActivity")}</p>}

      {auditLogs.length > 0 && (
        <div className="activity-list overflow-hidden rounded-lg border border-zinc-800 divide-y divide-zinc-800">
          {auditLogs.map((log) => {
            const activityMeta = getActivityMeta(log.action);
            const metadataEntries = Object.entries(log.metadata || {}).slice(0, 3);
            const isPaymentLog = (log.targetType || log.entityType) === "payment" && log.targetId;

            return (
              <div key={log.id} className="grid grid-cols-1 gap-3 bg-zinc-950 px-4 py-3 text-sm lg:grid-cols-[150px_1fr_160px] lg:items-center">
                <div>
                  <span className={`activity-type-badge inline-block rounded-full px-3 py-1 text-xs font-semibold ${activityMeta.className}`}>
                    {t(activityMeta.labelKey)}
                  </span>
                  <p className="mt-2 text-xs capitalize text-zinc-500">{formatActivityAction(log.action)}</p>
                </div>
                <div>
                  <p className="font-semibold">{log.message || log.description || `${formatActivityAction(log.action)} from dashboard`}</p>
                  <p className="mt-1 break-all text-xs text-zinc-500">{log.targetType || log.entityType || "merchant"}: {log.targetId || log.entityId || "-"}</p>
                  {metadataEntries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {metadataEntries.map(([key, value]) => (
                        <span key={key} className="activity-meta-chip inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
                          <span className="shrink-0 uppercase">{key}</span>
                          <span className="min-w-0 truncate">{formatMetadataValue(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 lg:items-end">
                  <p className="text-zinc-500 lg:text-right">
                    {formatDateTime(log.createdAt, timeZone)}
                  </p>
                  {isPaymentLog && (
                    <Link
                      href={`/business-wallet/payments/${log.targetId}`}
                      className="operation-action-button operation-action-details w-fit rounded-lg border px-4 py-2 text-xs font-semibold transition"
                    >
                      {t("merchantPayments.details")}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="operations-list-footer mt-4 flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="operations-page-pill w-fit rounded-full border px-3 py-1 text-xs font-semibold">
          {t("merchantPayments.pageIndicator")
            .replace("{page}", auditPagination.page)
            .replace("{totalPages}", auditPagination.totalPages)}
        </span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={() => setAuditPage((currentPage) => Math.max(currentPage - 1, 1))} disabled={auditPagination.page <= 1} className="operations-filter-button h-9 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40">{t("merchantPayments.previous")}</button>
          <button onClick={() => setAuditPage((currentPage) => Math.min(currentPage + 1, auditPagination.totalPages))} disabled={auditPagination.page >= auditPagination.totalPages} className="operations-filter-button h-9 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40">{t("merchantPayments.next")}</button>
        </div>
      </div>
    </div>
  );
}
