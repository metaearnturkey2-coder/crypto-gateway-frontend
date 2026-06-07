"use client";

import { useEffect, useMemo, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

const STATUS_OPTIONS = ["ALL", "SUCCESS", "PENDING", "FAILED"];

const getStatusClassName = (status) => {
  if (status === "SUCCESS") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
  if (status === "FAILED") return "border-rose-400/40 bg-rose-500/15 text-rose-300";
  return "border-amber-300/40 bg-amber-400/15 text-amber-200";
};

const formatEventLabel = (event) =>
  String(event || "webhook")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

export default function BusinessWalletWebhooksPage() {
  const [data, setData] = useState({
    filters: { events: [], statuses: STATUS_OPTIONS.slice(1) },
    limit: 20,
    page: 1,
    stats: { total: 0, SUCCESS: 0, PENDING: 0, FAILED: 0 },
    totalPages: 1,
    webhooks: [],
  });
  const [eventFilter, setEventFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      limit: "20",
      page: String(page),
      t: String(Date.now()),
    });

    if (eventFilter !== "ALL") params.set("event", eventFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    return params.toString();
  }, [eventFilter, page, search, statusFilter]);

  const loadWebhooks = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(apiUrl(`/api/merchant/webhooks?${queryString}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    const body = await response.json();

    if (!response.ok) {
      setNotice({ type: "error", message: body.message || t("webhooks.loadError") });
      return;
    }

    setData({
      filters: body.filters || { events: [], statuses: STATUS_OPTIONS.slice(1) },
      limit: body.limit || 20,
      page: body.page || 1,
      stats: body.stats || { total: 0, SUCCESS: 0, PENDING: 0, FAILED: 0 },
      totalPages: body.totalPages || 1,
      webhooks: body.webhooks || [],
    });
    setNotice(null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadWebhooks();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [queryString]);

  const sendTestWebhook = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setTestingWebhook(true);
    setNotice(null);
    try {
      const response = await fetch(apiUrl("/api/merchant/webhook-test"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      setTestResult(body);

      if (!response.ok) {
        setNotice({ type: "error", message: body.message || t("webhooks.testFailed") });
        return;
      }

      setNotice({ type: "success", message: body.message || t("webhooks.testDelivered") });
      await loadWebhooks();
    } catch {
      setNotice({ type: "error", message: t("webhooks.testFailed") });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <OverviewShell>
      <div className="space-y-5">
        <section className="business-wallet-panel rounded-2xl border p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold sm:text-[22px]">{t("webhooks.title")}</h2>
              <p className="text-sm text-zinc-500">{t("webhooks.description")}</p>
            </div>
            <button
              type="button"
              onClick={loadWebhooks}
              className="business-wallet-pill rounded-full border px-4 py-2 text-sm font-semibold"
            >
              {t("common.refresh")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="business-wallet-metric rounded-xl border px-4 py-3">
              <p className="text-xs text-zinc-500">{t("webhooks.total")}</p>
              <p className="font-mono text-2xl font-bold">{data.stats.total || 0}</p>
            </div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3">
              <p className="text-xs text-zinc-500">SUCCESS</p>
              <p className="font-mono text-2xl font-bold">{data.stats.SUCCESS || 0}</p>
            </div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3">
              <p className="text-xs text-zinc-500">PENDING</p>
              <p className="font-mono text-2xl font-bold">{data.stats.PENDING || 0}</p>
            </div>
            <div className="business-wallet-metric rounded-xl border px-4 py-3">
              <p className="text-xs text-zinc-500">FAILED</p>
              <p className="font-mono text-2xl font-bold">{data.stats.FAILED || 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {t("webhooks.deadLetter")}: {data.stats.deadLetter || 0}
          </p>
        </section>

        <section className="business-wallet-panel rounded-2xl border p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold sm:text-[22px]">{t("webhooks.testToolTitle")}</h2>
              <p className="text-sm text-zinc-500">{t("webhooks.testToolDescription")}</p>
            </div>
            <button
              type="button"
              onClick={sendTestWebhook}
              disabled={testingWebhook}
              className="business-wallet-pill rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {testingWebhook ? t("webhooks.testing") : t("webhooks.sendTest")}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t("webhooks.sampleHeaders")}</p>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                  HTTP {testResult?.statusCode || "-"}
                </span>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                {JSON.stringify(
                  testResult?.headers || {
                    "content-type": "application/json",
                    "user-agent": "crypto-gateway-webhook/1.0",
                    "x-webhook-event": "webhook.test",
                    "x-webhook-id": "event-id",
                    "x-webhook-signature": "hmac-sha256-signature",
                    "x-webhook-timestamp": "unix-timestamp",
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <p className="mb-3 text-sm font-semibold">{t("webhooks.samplePayload")}</p>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                {JSON.stringify(
                  testResult?.payload || {
                    id: "event-id",
                    apiVersion: "2026-01-01",
                    event: "webhook.test",
                    test: true,
                    createdAt: "2026-06-07T12:00:00.000Z",
                    merchant: {
                      id: "merchant-id",
                      email: "merchant@example.com",
                    },
                    payment: {
                      id: "test-payment",
                      amount: 1,
                      currency: "USDT",
                      network: "TRC20",
                      orderId: "WEBHOOK-TEST",
                      customerEmail: "merchant@example.com",
                      status: "TEST",
                      txHash: null,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </section>

        <section className="business-wallet-panel rounded-2xl border p-4 sm:p-5">
          <div className="mb-4 grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_180px_220px]">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder={t("webhooks.searchPlaceholder")}
              className="business-wallet-input h-10 rounded-xl border px-4 text-sm outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="business-wallet-input h-10 rounded-xl border px-4 text-sm outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={eventFilter}
              onChange={(event) => {
                setPage(1);
                setEventFilter(event.target.value);
              }}
              className="business-wallet-input h-10 rounded-xl border px-4 text-sm outline-none"
            >
              <option value="ALL">{t("webhooks.allEvents")}</option>
              {(data.filters.events || []).map((event) => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>

          {notice && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {notice.message}
            </div>
          )}

          {loading ? (
            <p className="business-wallet-empty-state rounded-xl border px-4 py-3 text-sm">{t("overview.loading")}</p>
          ) : data.webhooks.length === 0 ? (
            <p className="business-wallet-empty-state rounded-xl border px-4 py-3 text-sm">{t("webhooks.empty")}</p>
          ) : (
            <div className="business-wallet-activity-list divide-y overflow-hidden rounded-xl border">
              {data.webhooks.map((webhook) => (
                <div key={webhook.id} className="business-wallet-activity-row grid grid-cols-1 gap-3 px-4 py-3 xl:grid-cols-[170px_1fr_160px_180px] xl:items-center">
                  <div className="space-y-1">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(webhook.status)}`}>
                      {webhook.status}
                    </span>
                    <p className="break-all font-mono text-[11px] text-zinc-500">{webhook.requestId || webhook.id}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{formatEventLabel(webhook.event)}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {webhook.payment?.orderId || webhook.payment?.id || "-"} · {webhook.payment?.customerEmail || "-"}
                    </p>
                    {webhook.lastError && (
                      <p className="mt-1 break-words text-xs text-rose-300">{webhook.lastError}</p>
                    )}
                    {webhook.deadLetter && (
                      <p className="mt-1 text-xs text-amber-200">
                        {t("webhooks.deadLetter")}: {webhook.deadLetter.reason}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs xl:block xl:space-y-1">
                    <p><span className="text-zinc-500">{t("webhooks.attempts")}:</span> {webhook.attempts}/{webhook.maxAttempts}</p>
                    <p><span className="text-zinc-500">HTTP:</span> {webhook.lastStatusCode || "-"}</p>
                    <p><span className="text-zinc-500">{t("webhooks.duration")}:</span> {webhook.durationMs ?? "-"}ms</p>
                  </div>

                  <div className="text-xs text-zinc-500 xl:text-right">
                    <p>{formatDashboardDateTime(webhook.deliveredAt || webhook.updatedAt || webhook.createdAt, timeZone)}</p>
                    {webhook.nextRetryAt && (
                      <p className="mt-1">{t("webhooks.nextRetry")}: {formatDashboardDateTime(webhook.nextRetryAt, timeZone)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              {t("webhooks.page")} {data.page || page} / {data.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                className="business-wallet-pill rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.previous")}
              </button>
              <button
                type="button"
                disabled={page >= (data.totalPages || 1)}
                onClick={() => setPage((value) => value + 1)}
                className="business-wallet-pill rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </OverviewShell>
  );
}
