"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { API_BASE_URL, apiUrl, merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

function getApiCallClassName(success) {
  return success ? "bg-green-500 text-black" : "bg-red-500 text-black";
}

export default function BusinessWalletApiDocsPage() {
  const [loading, setLoading] = useState(true);
  const [apiUsage, setApiUsage] = useState({
    summary: {
      total: 0,
      successful: 0,
      failed: 0,
      createCalls: 0,
      statusCalls: 0,
    },
    recentCalls: [],
  });
  const [apiKey, setApiKey] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [activeIntegrationKey, setActiveIntegrationKey] = useState("create-payment");
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const loadApiUsage = async () => {
    const [{ body: data, ok }, { body: dashboardData, ok: dashboardOk }] = await Promise.all([
      merchantFetch("/api/merchant/api-usage"),
      merchantFetch("/api/merchant/dashboard"),
    ]);

    if (!ok) {
      return;
    }

    setApiUsage({
      summary: data.summary || {
        total: 0,
        successful: 0,
        failed: 0,
        createCalls: 0,
        statusCalls: 0,
      },
      recentCalls: data.recentCalls || [],
    });

    if (dashboardOk) {
      setApiKey(dashboardData?.merchant?.apiKey || "");
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadApiUsage();
      } finally {
        setLoading(false);
      }
    };
    run();

    const refresh = setInterval(() => loadApiUsage(), 10000);
    return () => clearInterval(refresh);
  }, []);

  return (
    <OverviewShell>
      <div className="api-docs-panel rounded-2xl border p-5 mb-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t("apiDocs.apiUsage")}</h2>
            <p className="api-docs-muted text-sm">{t("apiDocs.usageDescription")}</p>
          </div>
          <span className="api-docs-pill rounded-full border px-3 py-1 text-xs font-semibold">{t("apiDocs.last24Hours")}</span>
        </div>

        <div className="api-docs-stat-strip mb-3 grid grid-cols-2 gap-2 rounded-xl border p-2 lg:grid-cols-5">
          <div className="api-docs-stat-item rounded-lg px-3 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.requests")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.total}</p></div>
          <div className="api-docs-stat-item rounded-lg px-3 py-2"><p className="api-docs-muted text-xs">{t("merchantPayments.successful")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.successful}</p></div>
          <div className="api-docs-stat-item rounded-lg px-3 py-2"><p className="api-docs-muted text-xs">{t("merchantPayments.failed")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.failed}</p></div>
          <div className="api-docs-stat-item rounded-lg px-3 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.createCalls")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.createCalls}</p></div>
          <div className="api-docs-stat-item rounded-lg px-3 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.statusCalls")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.statusCalls}</p></div>
        </div>

        {loading ? (
          <p className="api-docs-muted text-sm">{t("overview.loading")}</p>
        ) : apiUsage.recentCalls.length === 0 ? (
          <p className="api-docs-empty rounded-lg border px-3 py-2 text-sm">{t("apiDocs.noRequests")}</p>
        ) : (
          <div className="api-docs-list divide-y rounded-xl border overflow-hidden">
            {apiUsage.recentCalls.map((call) => (
              <div key={call.id} className="grid grid-cols-1 gap-3 p-4 text-sm lg:grid-cols-[170px_1fr_90px_170px]">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApiCallClassName(call.success)}`}>
                    {call.success ? "SUCCESS" : "FAILED"}
                  </span>
                  <span className="api-docs-muted">{call.method}</span>
                </div>
                <div>
                  <p className="font-semibold break-all">{call.path}</p>
                  {call.error && <p className="api-docs-muted text-xs break-all mt-1">{call.error}</p>}
                </div>
                <p className="api-docs-muted">{call.durationMs}ms</p>
                <p className="api-docs-muted lg:text-right">{formatDashboardDateTime(call.createdAt, timeZone)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="api-docs-panel rounded-2xl border p-5">
        <div className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
            <h2 className="text-2xl font-bold">{t("apiDocs.integration")}</h2>
            <p className="api-docs-muted text-sm mt-1">{t("apiDocs.integrationDescription")}</p>
            </div>
            <a
              href={apiUrl("/api/v1/openapi.json")}
              target="_blank"
              className="api-docs-pill flex w-full justify-center rounded-full border px-4 py-2 text-sm font-semibold sm:w-fit"
            >
              {t("apiDocs.openApiSpec")}
            </a>
          </div>
        </div>

        <div className="api-docs-rules-note mb-4 rounded-xl border px-4 py-3 text-xs">
          <span>{t("apiDocs.openApiDescription")}</span>
          <span className="api-docs-rule-separator">/</span>
          <span>{API_BASE_URL}/api/v1/openapi.json</span>
        </div>

        <p className="api-docs-rules-note mb-4 text-xs">
          <span>{t("apiDocs.amountLimits")}: {t("apiDocs.amountLimitsDescription")}</span>
          <span className="api-docs-rule-separator">/</span>
          <span>{t("merchantPayments.orderId")}: {t("apiDocs.orderIdShortDescription")}</span>
          <span className="api-docs-rule-separator">/</span>
          <span>{t("merchantPayments.customerEmail")}: {t("apiDocs.customerEmailShortDescription")}</span>
        </p>

        {(() => {
          const snippets = [
            {
              key: "create-payment",
              title: t("apiDocs.createPaymentTitle"),
              method: "POST",
              description: t("apiDocs.createPaymentDescription"),
              path: "/api/public/payments/create",
              value: `curl -X POST ${API_BASE_URL}/api/public/payments/create \\
-H "Content-Type: application/json" \\
-H "x-api-key: ${apiKey || "your_api_key"}" \\
-d '{
  "amount": 25,
  "orderId": "ORDER-1001",
  "customerEmail": "customer@example.com"
}'`,
            },
            {
              key: "status-payment-id",
              title: t("apiDocs.statusPaymentIdTitle"),
              method: "GET",
              description: t("apiDocs.statusPaymentIdDescription"),
              path: "/api/public/payments/status/{paymentId}",
              value: `curl -X GET "${API_BASE_URL}/api/public/payments/status/{paymentId}" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "status-order-id",
              title: t("apiDocs.statusOrderIdTitle"),
              method: "GET",
              description: t("apiDocs.statusOrderIdDescription"),
              path: "/api/public/payments/status?orderId=ORDER-1001",
              value: `curl -X GET "${API_BASE_URL}/api/public/payments/status?orderId=ORDER-1001" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "invalid-request",
              title: t("apiDocs.invalidRequestTitle"),
              method: "400",
              description: t("apiDocs.invalidRequestDescription"),
              path: "POST /api/public/payments/create",
              value: `HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": "Invalid payment request",
  "errors": [
    "Amount must be at least 0.01",
    "Order ID can only contain letters, numbers, dots, dashes, underscores, and colons",
    "Customer email must be a valid email address"
  ]
}`,
            },
            {
              key: "save-webhook-url",
              title: t("apiDocs.saveWebhookTitle"),
              method: "PUT",
              description: t("apiDocs.saveWebhookDescription"),
              path: "/api/merchant/webhook-url",
              value: `curl -X PUT ${API_BASE_URL}/api/merchant/webhook-url \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer your_dashboard_token" \\
-d '{
  "webhookUrl": "https://your-site.com/webhooks/crypto-gateway"
}'`,
            },
            {
              key: "test-webhook",
              title: t("apiDocs.testWebhookTitle"),
              method: "POST",
              description: t("apiDocs.testWebhookDescription"),
              path: "/api/merchant/webhook-test",
              value: `curl -X POST ${API_BASE_URL}/api/merchant/webhook-test \\
-H "Authorization: Bearer your_dashboard_token"

HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Test webhook delivered successfully",
  "statusCode": 200,
  "success": true,
  "event": "webhook.test"
}` ,
            },
            {
              key: "retry-webhook",
              title: t("apiDocs.retryWebhookTitle"),
              method: "POST",
              description: t("apiDocs.retryWebhookDescription"),
              path: "/api/payments/{paymentId}/webhooks/{webhookId}/retry",
              value: `curl -X POST ${API_BASE_URL}/api/payments/{paymentId}/webhooks/{webhookId}/retry \\
-H "Authorization: Bearer your_dashboard_token"

HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Webhook retry attempted",
  "webhook": {
    "id": "webhook_id",
    "status": "SUCCESS",
    "attempts": 2,
    "lastStatusCode": 200,
    "deliveredAt": "2026-06-02T12:00:00.000Z"
  }
}` ,
            },
            {
              key: "verify-webhook-node",
              title: t("apiDocs.verifyNodeTitle"),
              method: "POST",
              description: t("apiDocs.verifyNodeDescription"),
              path: "merchant webhook URL",
              value: `import crypto from "crypto";
import express from "express";

const app = express();
const WEBHOOK_SECRET = process.env.CRYPTO_GATEWAY_WEBHOOK_SECRET;
const TOLERANCE_SECONDS = 300;

app.post(
  "/webhooks/crypto-gateway",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header("x-webhook-signature");
    const timestamp = req.header("x-webhook-timestamp");
    const rawBody = req.body.toString("utf8");

    if (!signature || !timestamp) {
      return res.status(401).send("Missing signature headers");
    }

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
      return res.status(401).send("Webhook timestamp is too old");
    }

    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(\`\${timestamp}.\${rawBody}\`)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );

    if (!valid) {
      return res.status(401).send("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody);
    // event.event: payment.paid, payment.cancelled, payment.expired, webhook.test
    // event.payment.id, event.payment.status, event.payment.txHash

    return res.sendStatus(200);
  }
);`,
            },
            {
              key: "verify-webhook-php",
              title: t("apiDocs.verifyPhpTitle"),
              method: "POST",
              description: t("apiDocs.verifyPhpDescription"),
              path: "merchant webhook URL",
              value: `<?php
$webhookSecret = getenv('CRYPTO_GATEWAY_WEBHOOK_SECRET');
$toleranceSeconds = 300;

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';
$rawBody = file_get_contents('php://input');

if (!$signature || !$timestamp) {
    http_response_code(401);
    exit('Missing signature headers');
}

$age = abs(time() - intval($timestamp));
if ($age > $toleranceSeconds) {
    http_response_code(401);
    exit('Webhook timestamp is too old');
}

$expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $webhookSecret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid webhook signature');
}

$event = json_decode($rawBody, true);
// $event['event']: payment.paid, payment.cancelled, payment.expired, webhook.test
// $event['payment']['id'], status, txHash

http_response_code(200);`,
            },
          ];

          const active = snippets.find((s) => s.key === activeIntegrationKey) || snippets[0];

          return (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
                <div className="api-docs-endpoint-list overflow-hidden rounded-xl border">
                  {snippets.map((snippet) => (
                    <button
                      key={snippet.key}
                      type="button"
                      onClick={() => setActiveIntegrationKey(snippet.key)}
                      className={`api-docs-endpoint-row w-full px-3 py-2.5 text-left transition ${
                        activeIntegrationKey === snippet.key
                          ? "api-docs-endpoint-row-active"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
                          snippet.method === "GET"
                            ? "bg-blue-500 text-black"
                            : snippet.method === "400"
                            ? "bg-red-500 text-black"
                            : "bg-green-500 text-black"
                        }`}>
                          {snippet.method}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{snippet.title}</p>
                          <p className="api-docs-path truncate font-mono text-[11px]">{snippet.path}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="api-docs-code-panel min-w-0 rounded-xl border overflow-hidden">
                  <div className="api-docs-code-header flex items-center justify-between gap-3 border-b px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
                          active.method === "GET"
                            ? "bg-blue-500 text-black"
                            : active.method === "400"
                            ? "bg-red-500 text-black"
                            : "bg-green-500 text-black"
                        }`}>
                          {active.method}
                        </span>
                        <h3 className="truncate text-sm font-semibold">{active.title}</h3>
                      </div>
                      <p className="api-docs-muted mt-1 truncate text-xs">{active.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(active.value);
                        setCopiedKey(active.key);
                        setTimeout(() => setCopiedKey(""), 1200);
                      }}
                      className="api-docs-copy-button shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    >
                      {copiedKey === active.key ? t("common.copied") : t("common.copy")}
                    </button>
                  </div>
                  <pre className="api-docs-code max-h-[28rem] overflow-auto px-4 py-3 text-[11px] leading-5 whitespace-pre-wrap">
                    <code>{active.value}</code>
                  </pre>
                </div>
              </div>

              <p className="api-docs-rules-note mt-3 text-xs">
                <span>{t("apiDocs.apiHeader")}: <code>x-api-key</code></span>
                <span className="api-docs-rule-separator">/</span>
                <span>{t("apiDocs.webhookHeader")}: <code>x-webhook-signature</code>, <code>x-webhook-timestamp</code></span>
                <span className="api-docs-rule-separator">/</span>
                <span>{t("apiDocs.signatureFormat")}: <code>HMAC_SHA256(timestamp.rawBody)</code></span>
              </p>
            </>
          );
        })()}
      </div>
    </OverviewShell>
  );
}
