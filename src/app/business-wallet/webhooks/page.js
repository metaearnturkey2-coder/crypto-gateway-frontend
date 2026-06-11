"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardInput,
  DashboardMetric,
  DashboardPanel,
} from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import {
  getWebhookStatusClassName,
  getWebhookStatusLabel,
  WEBHOOK_STATUS_OPTIONS,
} from "@/features/merchant-payments/formatters";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

const STATUS_OPTIONS = WEBHOOK_STATUS_OPTIONS.filter((status) => status.value !== "NONE");

const formatEventLabel = (event) =>
  String(event || "webhook")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const formatHeaderSummary = (headers) => {
  if (!headers || typeof headers !== "object") {
    return "-";
  }

  return Object.entries(headers)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" / ");
};

export default function BusinessWalletWebhooksPage() {
  const [data, setData] = useState({
    filters: { events: [], statuses: STATUS_OPTIONS.map((status) => status.value) },
    limit: 20,
    page: 1,
    stats: { total: 0, SUCCESS: 0, PENDING: 0, FAILED: 0 },
    totalPages: 1,
    webhooks: [],
  });
  const [eventFilter, setEventFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [opsSummary, setOpsSummary] = useState(null);
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
    });

    if (eventFilter !== "ALL") params.set("event", eventFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    return params.toString();
  }, [eventFilter, page, search, statusFilter]);

  const loadWebhooks = useCallback(async () => {
    const { body, ok } = await merchantFetch(`/api/merchant/webhooks?${queryString}`);

    if (!ok) {
      setNotice({ type: "error", message: body.message || t("webhooks.loadError") });
      return;
    }

    setData({
      filters: body.filters || { events: [], statuses: STATUS_OPTIONS.map((status) => status.value) },
      limit: body.limit || 20,
      page: body.page || 1,
      stats: body.stats || { total: 0, SUCCESS: 0, PENDING: 0, FAILED: 0 },
      totalPages: body.totalPages || 1,
      webhooks: body.webhooks || [],
    });
    setNotice(null);
  }, [queryString, t]);

  const loadOpsSummary = useCallback(async () => {
    const { body, ok } = await merchantFetch("/api/merchant/ops-summary");

    if (ok) {
      setOpsSummary(body.summary || null);
    }
  }, []);

  const refreshPage = useCallback(async () => {
    await Promise.all([loadWebhooks(), loadOpsSummary()]);
  }, [loadOpsSummary, loadWebhooks]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        await refreshPage();
      } finally {
        setLoading(false);
      }
    });
  }, [refreshPage]);

  const sendTestWebhook = async () => {
    setTestingWebhook(true);
    setNotice(null);
    try {
      const { body, ok } = await merchantFetch("/api/merchant/webhook-test", {
        method: "POST",
      });
      setTestResult(body);

      if (!ok) {
        setNotice({ type: "error", message: body.message || t("webhooks.testFailed") });
        return;
      }

      setNotice({ type: "success", message: body.message || t("webhooks.testDelivered") });
      await refreshPage();
    } catch {
      setNotice({ type: "error", message: t("webhooks.testFailed") });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <OverviewShell>
      <div className="space-y-5">
        <DashboardPanel>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold sm:text-[22px]">{t("webhooks.title")}</h2>
              <p className="text-sm text-zinc-500">{t("webhooks.description")}</p>
            </div>
            <DashboardButton
              type="button"
              onClick={refreshPage}
              variant="secondary"
              className="rounded-full px-4 py-2"
            >
              {t("common.refresh")}
            </DashboardButton>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <DashboardMetric>
              <p className="text-xs text-zinc-500">{t("webhooks.total")}</p>
              <p className="font-mono text-2xl font-bold">{data.stats.total || 0}</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">SUCCESS</p>
              <p className="font-mono text-2xl font-bold">{data.stats.SUCCESS || 0}</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">PENDING</p>
              <p className="font-mono text-2xl font-bold">{data.stats.PENDING || 0}</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">FAILED</p>
              <p className="font-mono text-2xl font-bold">{data.stats.FAILED || 0}</p>
            </DashboardMetric>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {t("webhooks.deadLetter")}: {data.stats.deadLetter || 0}
          </p>
        </DashboardPanel>

        <DashboardPanel>
          <div className="mb-4">
            <h2 className="text-xl font-semibold sm:text-[22px]">{t("webhooks.operationsTitle")}</h2>
            <p className="text-sm text-zinc-500">{t("webhooks.operationsDescription")}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric>
              <p className="text-xs text-zinc-500">{t("webhooks.paymentWatcherQueue")}</p>
              <p className="font-mono text-2xl font-bold">{opsSummary?.queues?.paymentWatcher?.pendingJobs ?? "-"}</p>
              <p className="mt-1 text-xs text-zinc-500">{opsSummary?.queues?.paymentWatcher?.backend || "-"}</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">{t("webhooks.webhookRetryQueue")}</p>
              <p className="font-mono text-2xl font-bold">{opsSummary?.queues?.webhookRetry?.pendingJobs ?? "-"}</p>
              <p className="mt-1 text-xs text-zinc-500">{opsSummary?.queues?.webhookRetry?.backend || "-"}</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">{t("webhooks.dueRetries")}</p>
              <p className="font-mono text-2xl font-bold">{opsSummary?.webhooks?.dueRetries ?? "-"}</p>
              <p className="mt-1 text-xs text-zinc-500">FAILED/PENDING</p>
            </DashboardMetric>
            <DashboardMetric>
              <p className="text-xs text-zinc-500">{t("webhooks.deadLetter")}</p>
              <p className="font-mono text-2xl font-bold">{opsSummary?.webhooks?.deadLetter ?? "-"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {opsSummary?.generatedAt ? formatDashboardDateTime(opsSummary.generatedAt, timeZone) : "-"}
              </p>
            </DashboardMetric>
          </div>
        </DashboardPanel>

        <DashboardPanel>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold sm:text-[22px]">{t("webhooks.testToolTitle")}</h2>
              <p className="text-sm text-zinc-500">{t("webhooks.testToolDescription")}</p>
            </div>
            <DashboardButton
              type="button"
              onClick={sendTestWebhook}
              disabled={testingWebhook}
              variant="secondary"
              className="rounded-full px-4 py-2 disabled:cursor-wait disabled:opacity-60"
            >
              {testingWebhook ? t("webhooks.testing") : t("webhooks.sendTest")}
            </DashboardButton>
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
        </DashboardPanel>

        <DashboardPanel>
          <div className="mb-4 grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_180px_220px]">
            <DashboardInput
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder={t("webhooks.searchPlaceholder")}
              className="h-10"
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="business-wallet-input h-10 rounded-xl border px-4 text-sm outline-none"
            >
              <option value="ALL">ALL</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
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
            <DashboardEmptyState>{t("overview.loading")}</DashboardEmptyState>
          ) : data.webhooks.length === 0 ? (
            <DashboardEmptyState>{t("webhooks.empty")}</DashboardEmptyState>
          ) : (
            <div className="business-wallet-activity-list divide-y overflow-hidden rounded-xl border">
              {data.webhooks.map((webhook) => (
                <div key={webhook.id} className="business-wallet-activity-row grid grid-cols-1 gap-3 px-4 py-3 xl:grid-cols-[170px_1fr_160px_180px] xl:items-center">
                  <div className="space-y-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWebhookStatusClassName(webhook.status)}`}>
                      {getWebhookStatusLabel(webhook)}
                    </span>
                    <p className="break-all font-mono text-[11px] text-zinc-500">{webhook.delivery?.requestId || webhook.requestId || "-"}</p>
                    <p className="break-all font-mono text-[11px] text-zinc-600">{webhook.delivery?.eventId || webhook.id}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{formatEventLabel(webhook.event)}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {webhook.payment?.orderId || webhook.payment?.id || "-"} · {webhook.payment?.customerEmail || "-"}
                    </p>
                    <p className="mt-1 break-all text-xs text-zinc-500">
                      {t("webhooks.receiver")}: {webhook.url || "-"}
                    </p>
                    {webhook.retry?.reason && (
                      <p className="mt-1 text-xs text-amber-200">
                        {t("webhooks.retryDecision")}: {webhook.retry.reason}
                      </p>
                    )}
                    {webhook.delivery?.responseBodyPreview && (
                      <p className="mt-1 break-words text-xs text-zinc-400">
                        {t("webhooks.responseBody")}: {webhook.delivery.responseBodyPreview}
                      </p>
                    )}
                    <p className="mt-1 break-words text-xs text-zinc-600">
                      {t("webhooks.responseHeaders")}: {formatHeaderSummary(webhook.delivery?.responseHeaders)}
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
              <DashboardButton
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                variant="secondary"
                className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.previous")}
              </DashboardButton>
              <DashboardButton
                type="button"
                disabled={page >= (data.totalPages || 1)}
                onClick={() => setPage((value) => value + 1)}
                variant="secondary"
                className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.next")}
              </DashboardButton>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </OverviewShell>
  );
}
