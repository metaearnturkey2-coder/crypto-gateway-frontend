"use client";

import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardInput,
  DashboardMetric,
  DashboardPanel,
  DashboardPill,
} from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { formatTokenAmount } from "@/lib/money";

const getDirectionClassName = (direction) => {
  if (direction === "CREDIT") {
    return "ledger-direction-credit border-emerald-400/60 bg-emerald-500/15 text-emerald-200 light-dashboard:border-emerald-500 light-dashboard:bg-emerald-50 light-dashboard:text-emerald-700";
  }
  if (direction === "DEBIT") {
    return "ledger-direction-debit border-rose-400/60 bg-rose-500/15 text-rose-200 light-dashboard:border-rose-500 light-dashboard:bg-rose-50 light-dashboard:text-rose-700";
  }
  return "ledger-direction-neutral border-zinc-600 bg-zinc-800 text-zinc-200 light-dashboard:border-zinc-300 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-700";
};

const getSourceHref = (entry) => {
  if (entry.sourceType === "payment" || entry.entryType?.includes("PAYMENT")) {
    return `/business-wallet/payments/${entry.sourceId}`;
  }

  return "";
};

const ledgerLabelKeys = {
  CREDIT: "ledger.credit",
  DEBIT: "ledger.debit",
  PAYMENT_PAID: "ledger.paymentPaid",
  PAYOUT_RESERVED: "ledger.payoutReserved",
  PAYOUT_RELEASED: "ledger.payoutReleased",
  PAYMENT_EXPIRED_RELEASE: "ledger.paymentExpiredRelease",
  payment: "ledger.sourcePayment",
  payout: "ledger.sourcePayout",
};

const formatLedgerLabel = (value, t) => {
  const labelKey = ledgerLabelKeys[value];
  if (labelKey) return t(labelKey);

  return String(value || "-")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

export default function BusinessWalletLedgerPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [filters, setFilters] = useState({ entryTypes: [], directions: [], sourceTypes: [] });
  const [page, setPage] = useState(1);
  const [entryType, setEntryType] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [sourceType, setSourceType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [notice, setNotice] = useState("");

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setNotice("");

    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
    });
    if (entryType !== "ALL") params.set("entryType", entryType);
    if (direction !== "ALL") params.set("direction", direction);
    if (sourceType !== "ALL") params.set("sourceType", sourceType);
    if (search.trim()) params.set("search", search.trim());

    try {
      const { body: data, ok } = await merchantFetch(`/api/merchant/ledger?${params.toString()}`);

      if (!ok) {
        setEntries([]);
        setNotice(data.message || t("ledger.loadError"));
        return;
      }

      setEntries(data.entries || []);
      setFilters(data.filters || { entryTypes: [], directions: [], sourceTypes: [] });
      setPagination({
        page: data.page || page,
        totalPages: data.totalPages || 1,
        totalCount: data.totalCount || 0,
      });
    } catch {
      setEntries([]);
      setNotice(t("ledger.loadError"));
    } finally {
      setLoading(false);
    }
  }, [direction, entryType, page, search, sourceType, t]);

  useEffect(() => {
    queueMicrotask(loadLedger);
  }, [loadLedger]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const amount = Number(entry.amount || 0);
        if (entry.direction === "CREDIT") acc.credit += amount;
        if (entry.direction === "DEBIT") acc.debit += amount;
        acc.currency = entry.currency || acc.currency;
        return acc;
      },
      { credit: 0, debit: 0, currency: "USDT" }
    );
  }, [entries]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft);
  };

  const clearFilters = () => {
    setEntryType("ALL");
    setDirection("ALL");
    setSourceType("ALL");
    setSearch("");
    setSearchDraft("");
    setPage(1);
  };

  return (
    <OverviewShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark-dashboard:text-white">
              {t("ledger.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              {t("ledger.description")}
            </p>
          </div>
          <DashboardPill
            as={Link}
            href="/business-wallet"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm sm:w-fit"
          >
            <ArrowLeft size={16} strokeWidth={2.2} />
            {t("ledger.balanceOverview")}
          </DashboardPill>
        </div>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <LedgerMetric label={t("ledger.entries")} value={pagination.totalCount} />
          <LedgerMetric label={t("ledger.pageCredits")} value={formatTokenAmount(totals.credit, totals.currency)} tone="credit" />
          <LedgerMetric label={t("ledger.pageDebits")} value={formatTokenAmount(totals.debit, totals.currency)} tone="debit" />
        </section>

        <DashboardPanel className="rounded-lg p-4 sm:p-4">
          <form onSubmit={submitSearch} className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_110px_110px]">
            <DashboardInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t("ledger.searchPlaceholder")}
              className="h-10 rounded-lg"
            />
            <select
              value={entryType}
              onChange={(event) => {
                setEntryType(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-lg border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allEntryTypes")}</option>
              {filters.entryTypes.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item, t)}</option>
              ))}
            </select>
            <select
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-lg border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allDirections")}</option>
              {filters.directions.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item, t)}</option>
              ))}
            </select>
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-lg border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allSources")}</option>
              {filters.sourceTypes.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item, t)}</option>
              ))}
            </select>
            <DashboardButton type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4">
              <Search size={16} strokeWidth={2.2} />
              {t("ledger.search")}
            </DashboardButton>
            <DashboardButton
              type="button"
              onClick={clearFilters}
              variant="secondary"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4"
            >
              <X size={16} strokeWidth={2.2} />
              {t("ledger.clear")}
            </DashboardButton>
          </form>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden rounded-lg p-0 sm:p-0">
          <div className="ledger-table-header hidden grid-cols-[155px_1.1fr_0.8fr_0.8fr_1fr_1fr] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-zinc-500 xl:grid">
            <span>{t("ledger.date")}</span>
            <span>{t("ledger.entry")}</span>
            <span>{t("ledger.direction")}</span>
            <span>{t("ledger.amount")}</span>
            <span>{t("ledger.source")}</span>
            <span>{t("ledger.balanceAfter")}</span>
          </div>

          {loading ? (
            <DashboardEmptyState className="rounded-none border-0 px-4 py-5">{t("overview.loading")}</DashboardEmptyState>
          ) : notice ? (
            <DashboardEmptyState className="rounded-none border-0 px-4 py-5">{notice}</DashboardEmptyState>
          ) : entries.length === 0 ? (
            <DashboardEmptyState className="rounded-none border-0 px-4 py-5">{t("ledger.empty")}</DashboardEmptyState>
          ) : (
            <div className="ledger-entry-list divide-y">
              {entries.map((entry) => {
                const sourceHref = getSourceHref(entry);
                return (
                  <div key={entry.id} className="ledger-entry-row grid grid-cols-1 gap-3 px-4 py-4 xl:grid-cols-[155px_1.1fr_0.8fr_0.8fr_1fr_1fr] xl:items-center">
                    <div className="ledger-mobile-cell ledger-mobile-cell-muted">
                      <p className="xl:hidden">{t("ledger.date")}</p>
                      <span>{formatDashboardDateTime(entry.createdAt, timeZone)}</span>
                    </div>
                    <div className="ledger-mobile-cell min-w-0">
                      <p className="xl:hidden">{t("ledger.entry")}</p>
                      <span className="font-semibold">{formatLedgerLabel(entry.entryType, t)}</span>
                      <span className="mt-1 block break-all font-mono text-xs opacity-70">{entry.id}</span>
                    </div>
                    <div className="ledger-mobile-cell ledger-mobile-cell-compact">
                      <p className="xl:hidden">{t("ledger.direction")}</p>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDirectionClassName(entry.direction)}`}>
                        {formatLedgerLabel(entry.direction, t)}
                      </span>
                    </div>
                    <div className="ledger-mobile-cell ledger-mobile-cell-compact">
                      <p className="xl:hidden">{t("ledger.amount")}</p>
                      <span className="font-semibold">{formatTokenAmount(entry.amount, entry.currency)}</span>
                    </div>
                    <div className="ledger-mobile-cell min-w-0">
                      <p className="xl:hidden">{t("ledger.source")}</p>
                      <span className="text-sm">{formatLedgerLabel(entry.sourceType, t)}</span>
                      {sourceHref ? (
                        <Link href={sourceHref} className="ledger-source-link mt-1 block break-all font-mono text-xs">
                          {entry.sourceId}
                        </Link>
                      ) : (
                        <span className="mt-1 block break-all font-mono text-xs opacity-70">{entry.sourceId}</span>
                      )}
                    </div>
                    <div className="ledger-mobile-cell ledger-mobile-cell-balance">
                      <p className="xl:hidden">{t("ledger.balanceAfter")}</p>
                      <span className="font-semibold">{formatTokenAmount(entry.availableAfter, entry.currency)}</span>
                      <span className="mt-1 block text-xs opacity-70">
                        {t("overview.reserved")}: {formatTokenAmount(entry.reservedForPayoutsAfter, entry.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardPanel>

        <div className="ledger-pagination flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <DashboardPill className="w-fit text-zinc-500">
            {t("ledger.page")} {pagination.page} / {pagination.totalPages}
          </DashboardPill>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <DashboardButton
              variant="secondary"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={pagination.page <= 1 || loading}
              className="h-9 rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("merchantPayments.previous")}
            </DashboardButton>
            <DashboardButton
              variant="secondary"
              onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="h-9 rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("merchantPayments.next")}
            </DashboardButton>
          </div>
        </div>
      </div>
    </OverviewShell>
  );
}

function LedgerMetric({ label, value, tone = "neutral" }) {
  const toneClassName =
    tone === "credit"
      ? "ledger-metric-value-credit text-emerald-300 light-dashboard:text-emerald-700"
      : tone === "debit"
        ? "ledger-metric-value-debit text-rose-300 light-dashboard:text-rose-700"
        : "ledger-metric-value-neutral text-white light-dashboard:text-zinc-950";

  return (
    <DashboardMetric className="rounded-lg">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${toneClassName}`}>{value}</p>
    </DashboardMetric>
  );
}
