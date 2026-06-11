"use client";

import Link from "next/link";
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
  if (direction === "CREDIT") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (direction === "DEBIT") return "border-rose-400/40 bg-rose-500/15 text-rose-200";
  return "border-zinc-600 bg-zinc-800 text-zinc-200";
};

const getSourceHref = (entry) => {
  if (entry.sourceType === "payment" || entry.entryType?.includes("PAYMENT")) {
    return `/business-wallet/payments/${entry.sourceId}`;
  }

  return "";
};

const formatLedgerLabel = (value) =>
  String(value || "-")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

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
        setNotice(data.message || "Ledger entries could not be loaded.");
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
      setNotice("Ledger entries could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [direction, entryType, page, search, sourceType]);

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
            <h1 className="text-3xl font-bold text-zinc-900 dark-dashboard:text-white">
              {t("ledger.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              {t("ledger.description")}
            </p>
          </div>
          <DashboardPill
            as={Link}
            href="/business-wallet"
            className="flex w-full justify-center px-4 py-2 text-sm sm:w-fit"
          >
            {t("ledger.balanceOverview")}
          </DashboardPill>
        </div>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <LedgerMetric label={t("ledger.entries")} value={pagination.totalCount} />
          <LedgerMetric label={t("ledger.pageCredits")} value={formatTokenAmount(totals.credit, totals.currency)} tone="credit" />
          <LedgerMetric label={t("ledger.pageDebits")} value={formatTokenAmount(totals.debit, totals.currency)} tone="debit" />
        </section>

        <DashboardPanel className="p-4 sm:p-4">
          <form onSubmit={submitSearch} className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_110px_110px]">
            <DashboardInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t("ledger.searchPlaceholder")}
              className="h-10"
            />
            <select
              value={entryType}
              onChange={(event) => {
                setEntryType(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-xl border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allEntryTypes")}</option>
              {filters.entryTypes.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item)}</option>
              ))}
            </select>
            <select
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-xl border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allDirections")}</option>
              {filters.directions.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item)}</option>
              ))}
            </select>
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value);
                setPage(1);
              }}
              className="business-wallet-input h-10 rounded-xl border px-3 text-sm outline-none"
            >
              <option value="ALL">{t("ledger.allSources")}</option>
              {filters.sourceTypes.map((item) => (
                <option key={item} value={item}>{formatLedgerLabel(item)}</option>
              ))}
            </select>
            <DashboardButton className="h-10 px-4">
              {t("ledger.search")}
            </DashboardButton>
            <DashboardButton
              type="button"
              onClick={clearFilters}
              variant="secondary"
              className="h-10 px-4"
            >
              {t("ledger.clear")}
            </DashboardButton>
          </form>
        </DashboardPanel>

        <DashboardPanel className="overflow-hidden p-0 sm:p-0">
          <div className="hidden grid-cols-[155px_1.1fr_0.8fr_0.8fr_1fr_1fr] gap-3 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 xl:grid">
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
            <div className="divide-y divide-zinc-800">
              {entries.map((entry) => {
                const sourceHref = getSourceHref(entry);
                return (
                  <div key={entry.id} className="grid grid-cols-1 gap-3 px-4 py-4 xl:grid-cols-[155px_1.1fr_0.8fr_0.8fr_1fr_1fr] xl:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.date")}</p>
                      <p className="text-sm text-zinc-400">{formatDashboardDateTime(entry.createdAt, timeZone)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.entry")}</p>
                      <p className="font-semibold">{formatLedgerLabel(entry.entryType)}</p>
                      <p className="mt-1 break-all font-mono text-xs text-zinc-500">{entry.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.direction")}</p>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDirectionClassName(entry.direction)}`}>
                        {formatLedgerLabel(entry.direction)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.amount")}</p>
                      <p className="font-semibold">{formatTokenAmount(entry.amount, entry.currency)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.source")}</p>
                      <p className="text-sm">{formatLedgerLabel(entry.sourceType)}</p>
                      {sourceHref ? (
                        <Link href={sourceHref} className="mt-1 block break-all font-mono text-xs text-blue-300 hover:text-blue-200">
                          {entry.sourceId}
                        </Link>
                      ) : (
                        <p className="mt-1 break-all font-mono text-xs text-zinc-500">{entry.sourceId}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">{t("ledger.balanceAfter")}</p>
                      <p className="font-semibold">{formatTokenAmount(entry.availableAfter, entry.currency)}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("overview.reserved")}: {formatTokenAmount(entry.reservedForPayoutsAfter, entry.currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardPanel>

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
      ? "text-emerald-300"
      : tone === "debit"
        ? "text-rose-300"
        : "text-white";

  return (
    <DashboardMetric>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${toneClassName}`}>{value}</p>
    </DashboardMetric>
  );
}
