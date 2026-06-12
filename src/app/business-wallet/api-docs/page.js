"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardEmptyState, DashboardMetric, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import { API_BASE_URL, apiUrl, merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

function getApiCallClassName(success) {
  return success ? "api-docs-status-success" : "api-docs-status-failed";
}

function getSnippetMethodClassName(method) {
  if (method === "GET") return "api-docs-method-get";
  if (method === "400") return "api-docs-method-error";
  if (method === "FLOW") return "api-docs-method-flow";
  return "api-docs-method-post";
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
  const goLiveChecklist = [
    {
      title: t("apiDocs.checklistApiKeyTitle"),
      description: t("apiDocs.checklistApiKeyDescription"),
    },
    {
      title: t("apiDocs.checklistIdempotencyTitle"),
      description: t("apiDocs.checklistIdempotencyDescription"),
    },
    {
      title: t("apiDocs.checklistCheckoutTitle"),
      description: t("apiDocs.checklistCheckoutDescription"),
    },
    {
      title: t("apiDocs.checklistWebhookTitle"),
      description: t("apiDocs.checklistWebhookDescription"),
    },
    {
      title: t("apiDocs.checklistStatusTitle"),
      description: t("apiDocs.checklistStatusDescription"),
    },
  ];
  const readinessNotes = [
    {
      title: t("apiDocs.readinessLocalTitle"),
      description: t("apiDocs.readinessLocalDescription"),
    },
    {
      title: t("apiDocs.readinessPublicUrlTitle"),
      description: t("apiDocs.readinessPublicUrlDescription"),
    },
    {
      title: t("apiDocs.readinessSecretsTitle"),
      description: t("apiDocs.readinessSecretsDescription"),
    },
  ];
  const troubleshootingNotes = [
    {
      code: "400",
      title: t("apiDocs.troubleshootValidationTitle"),
      description: t("apiDocs.troubleshootValidationDescription"),
    },
    {
      code: "401",
      title: t("apiDocs.troubleshootAuthTitle"),
      description: t("apiDocs.troubleshootAuthDescription"),
    },
    {
      code: "409",
      title: t("apiDocs.troubleshootDuplicateTitle"),
      description: t("apiDocs.troubleshootDuplicateDescription"),
    },
    {
      code: "WEBHOOK",
      title: t("apiDocs.troubleshootWebhookTitle"),
      description: t("apiDocs.troubleshootWebhookDescription"),
    },
  ];
  const preflightChecks = [
    t("apiDocs.preflightServerCreate"),
    t("apiDocs.preflightBrowserRedirect"),
    t("apiDocs.preflightWebhookVerified"),
    t("apiDocs.preflightStatusFallback"),
    t("apiDocs.preflightDuplicateProtection"),
    t("apiDocs.preflightOperationalLogs"),
  ];

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
      <DashboardPanel as="div" variant="api" className="mb-4 rounded-lg p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold">{t("apiDocs.apiUsage")}</h2>
            <p className="api-docs-muted text-sm">{t("apiDocs.usageDescription")}</p>
          </div>
          <DashboardPill variant="api">{t("apiDocs.last24Hours")}</DashboardPill>
        </div>

        <div className="api-docs-stat-strip mb-3 grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardMetric variant="api" className="min-w-0 rounded-lg border-0 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.requests")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.total}</p></DashboardMetric>
          <DashboardMetric variant="api" className="min-w-0 rounded-lg border-0 py-2"><p className="api-docs-muted text-xs">{t("merchantPayments.successful")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.successful}</p></DashboardMetric>
          <DashboardMetric variant="api" className="min-w-0 rounded-lg border-0 py-2"><p className="api-docs-muted text-xs">{t("merchantPayments.failed")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.failed}</p></DashboardMetric>
          <DashboardMetric variant="api" className="min-w-0 rounded-lg border-0 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.createCalls")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.createCalls}</p></DashboardMetric>
          <DashboardMetric variant="api" className="min-w-0 rounded-lg border-0 py-2"><p className="api-docs-muted text-xs">{t("apiDocs.statusCalls")}</p><p className="font-mono text-xl font-bold">{apiUsage.summary.statusCalls}</p></DashboardMetric>
        </div>

        {loading ? (
          <p className="api-docs-muted text-sm">{t("overview.loading")}</p>
        ) : apiUsage.recentCalls.length === 0 ? (
          <DashboardEmptyState variant="api" className="rounded-lg px-3 py-2">{t("apiDocs.noRequests")}</DashboardEmptyState>
        ) : (
          <div className="api-docs-list divide-y overflow-hidden rounded-lg border">
            {apiUsage.recentCalls.map((call) => (
              <div key={call.id} className="api-docs-call-row grid grid-cols-1 gap-3 p-3 text-sm lg:grid-cols-[170px_1fr_90px_170px] lg:items-center">
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
      </DashboardPanel>

      <DashboardPanel as="div" variant="api" className="rounded-lg p-4 sm:p-5">
        <div className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">{t("apiDocs.integration")}</h2>
              <p className="api-docs-muted mt-1 text-sm">{t("apiDocs.integrationDescription")}</p>
            </div>
            <a
              href={apiUrl("/api/v1/openapi.json")}
              target="_blank"
              className="api-docs-pill inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold sm:w-fit"
            >
              <ExternalLink size={16} strokeWidth={2.2} />
              {t("apiDocs.openApiSpec")}
            </a>
          </div>
        </div>

        <div className="api-docs-rules-note mb-4 rounded-lg border px-4 py-3 text-xs">
          <span>{t("apiDocs.openApiDescription")}</span>
          <span className="api-docs-rule-separator">/</span>
          <span>{API_BASE_URL}/api/v1/openapi.json</span>
        </div>

        <div className="api-docs-section-card mb-4 rounded-lg border p-4">
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-bold">{t("apiDocs.goLiveChecklist")}</h3>
              <p className="api-docs-muted text-sm">{t("apiDocs.goLiveChecklistDescription")}</p>
            </div>
            <DashboardPill variant="api" className="w-fit">
              {goLiveChecklist.length} {t("common.steps")}
            </DashboardPill>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            {goLiveChecklist.map((item, index) => (
              <DashboardMetric key={item.title} variant="api" className="rounded-lg">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="api-docs-muted mt-1 text-xs">{item.description}</p>
              </DashboardMetric>
            ))}
          </div>
        </div>

        <div className="api-docs-section-card mb-4 rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold">{t("apiDocs.testLiveReadiness")}</h3>
            <p className="api-docs-muted text-sm">{t("apiDocs.testLiveReadinessDescription")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {readinessNotes.map((item) => (
              <DashboardMetric key={item.title} variant="api" className="rounded-lg">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="api-docs-muted mt-1 text-xs">{item.description}</p>
              </DashboardMetric>
            ))}
          </div>
        </div>

        <div className="api-docs-section-card mb-4 rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold">{t("apiDocs.troubleshooting")}</h3>
            <p className="api-docs-muted text-sm">{t("apiDocs.troubleshootingDescription")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
            {troubleshootingNotes.map((item) => (
              <DashboardMetric key={item.code} variant="api" className="rounded-lg">
                <span className="inline-flex rounded-md border px-2 py-1 font-mono text-[10px] font-bold">
                  {item.code}
                </span>
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="api-docs-muted mt-1 text-xs">{item.description}</p>
              </DashboardMetric>
            ))}
          </div>
        </div>

        <div className="api-docs-section-card mb-4 rounded-lg border p-4">
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-bold">{t("apiDocs.preflightTitle")}</h3>
              <p className="api-docs-muted text-sm">{t("apiDocs.preflightDescription")}</p>
            </div>
            <DashboardPill variant="api" className="w-fit">
              {preflightChecks.length} {t("common.checks")}
            </DashboardPill>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {preflightChecks.map((item, index) => (
              <DashboardMetric key={item} variant="api" className="flex gap-3 rounded-lg">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                  {index + 1}
                </span>
                <p className="api-docs-muted text-sm">{item}</p>
              </DashboardMetric>
            ))}
          </div>
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
              path: "/api/v1/public/payments/create",
              value: `curl -X POST ${API_BASE_URL}/api/v1/public/payments/create \\
-H "Content-Type: application/json" \\
-H "Idempotency-Key: ORDER-1001" \\
-H "x-api-key: ${apiKey || "your_api_key"}" \\
-d '{
  "amount": 25,
  "orderId": "ORDER-1001",
  "customerEmail": "customer@example.com"
}'

HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "Payment created successfully",
  "checkout": {
    "paymentId": "payment_id",
    "url": "https://pay.example.com/pay/payment_id",
    "expiresAt": "2026-06-09T14:30:00.000Z"
  },
  "checkoutUrl": "https://pay.example.com/pay/payment_id",
  "payment": {
    "id": "payment_id",
    "amount": "25",
    "currency": "USDT",
    "network": "TRC20",
    "status": "PENDING"
  }
}`,
            },
            {
              key: "storefront-integration",
              title: t("apiDocs.storefrontIntegrationTitle"),
              method: "FLOW",
              description: t("apiDocs.storefrontIntegrationDescription"),
              path: "storefront server + browser",
              value: `// Storefront backend: POST /checkout/create
import express from "express";

const app = express();
app.use(express.json());

app.post("/checkout/create", async (req, res) => {
  const order = await loadOrder(req.body.orderId);

  const gatewayResponse = await fetch("${API_BASE_URL}/api/v1/public/payments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": order.id,
      "x-api-key": process.env.CRYPTO_GATEWAY_API_KEY
    },
    body: JSON.stringify({
      amount: order.total,
      orderId: order.id,
      customerEmail: order.customerEmail
    })
  });

  const data = await gatewayResponse.json();

  if (!gatewayResponse.ok) {
    return res.status(gatewayResponse.status).json({
      message: data.message,
      errors: data.errors || []
    });
  }

  return res.json({ redirectUrl: data.checkoutUrl });
});

// Storefront browser
async function startCryptoCheckout(orderId) {
  const response = await fetch("/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Checkout could not be created");
  }

  window.location.assign(data.redirectUrl);
}`,
            },
            {
              key: "checkout-detail",
              title: t("apiDocs.checkoutDetailTitle"),
              method: "GET",
              description: t("apiDocs.checkoutDetailDescription"),
              path: "/api/v1/public/payments/{paymentId}",
              value: `curl -X GET "${API_BASE_URL}/api/v1/public/payments/{paymentId}"

HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Payment details",
  "checkout": {
    "paymentId": "payment_id",
    "url": "https://pay.example.com/pay/payment_id",
    "expiresAt": "2026-06-09T14:30:00.000Z"
  },
  "checkoutUrl": "https://pay.example.com/pay/payment_id",
  "payment": {
    "id": "payment_id",
    "amount": "25",
    "currency": "USDT",
    "network": "TRC20",
    "walletAddress": "TRC20_wallet_address",
    "status": "PENDING",
    "createdAt": "2026-06-09T14:00:00.000Z",
    "expiresAt": "2026-06-09T14:30:00.000Z"
  }
}`,
            },
            {
              key: "status-payment-id",
              title: t("apiDocs.statusPaymentIdTitle"),
              method: "GET",
              description: t("apiDocs.statusPaymentIdDescription"),
              path: "/api/v1/public/payments/status/{paymentId}",
              value: `curl -X GET "${API_BASE_URL}/api/v1/public/payments/status/{paymentId}" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "status-order-id",
              title: t("apiDocs.statusOrderIdTitle"),
              method: "GET",
              description: t("apiDocs.statusOrderIdDescription"),
              path: "/api/v1/public/payments/status?orderId=ORDER-1001",
              value: `curl -X GET "${API_BASE_URL}/api/v1/public/payments/status?orderId=ORDER-1001" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "invalid-request",
              title: t("apiDocs.invalidRequestTitle"),
              method: "400",
              description: t("apiDocs.invalidRequestDescription"),
              path: "POST /api/v1/public/payments/create",
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
              key: "fulfillment-status-fallback",
              title: t("apiDocs.fulfillmentFallbackTitle"),
              method: "FLOW",
              description: t("apiDocs.fulfillmentFallbackDescription"),
              path: "order fulfillment + status fallback",
              value: `// Storefront backend: idempotent fulfillment
app.post(
  "/webhooks/crypto-gateway",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookId = req.header("x-webhook-id");
    const event = JSON.parse(req.body.toString("utf8"));
    const payment = event.payment;

    if (!webhookId || !payment?.orderId) {
      return res.status(400).send("Missing webhook id or order id");
    }

    const alreadyProcessed = await webhookEvents.exists(webhookId);
    if (alreadyProcessed) {
      return res.sendStatus(200);
    }

    await db.transaction(async (tx) => {
      await tx.webhookEvents.insert({
        id: webhookId,
        paymentId: payment.id,
        event: event.event
      });

      if (payment.status === "PAID") {
        await tx.orders.markPaid(payment.orderId, {
          paymentId: payment.id,
          txHash: payment.txHash
        });
        return;
      }

      if (payment.status === "EXPIRED" || payment.status === "CANCELLED") {
        await tx.orders.markPaymentClosed(payment.orderId, payment.status);
      }
    });

    return res.sendStatus(200);
  }
);

// Fallback when webhook delivery is delayed
async function reconcileOrderPayment(orderId) {
  const url = "${API_BASE_URL}/api/v1/public/payments/status?orderId=" + encodeURIComponent(orderId);
  const response = await fetch(url, {
    headers: { "x-api-key": process.env.CRYPTO_GATEWAY_API_KEY }
  });

  if (!response.ok) {
    throw new Error("Payment status could not be checked");
  }

  const data = await response.json();

  if (data.payment.status === "PAID") {
    await orders.markPaid(orderId, {
      paymentId: data.payment.id,
      txHash: data.payment.txHash
    });
  }

  return data.payment.status;
}`,
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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="api-docs-endpoint-list max-h-[22rem] overflow-auto rounded-lg border xl:max-h-[36rem]">
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
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${getSnippetMethodClassName(snippet.method)}`}>
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

                <div className="api-docs-code-panel min-w-0 overflow-hidden rounded-lg border">
                  <div className="api-docs-code-header flex flex-col gap-3 border-b px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${getSnippetMethodClassName(active.method)}`}>
                          {active.method}
                        </span>
                        <h3 className="min-w-0 text-sm font-semibold sm:truncate">{active.title}</h3>
                      </div>
                      <p className="api-docs-muted mt-1 text-xs sm:truncate">{active.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(active.value);
                        setCopiedKey(active.key);
                        setTimeout(() => setCopiedKey(""), 1200);
                      }}
                      className="api-docs-copy-button inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold sm:w-auto"
                    >
                      {copiedKey === active.key ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2.2} />}
                      {copiedKey === active.key ? t("common.copied") : t("common.copy")}
                    </button>
                  </div>
                  <pre className="api-docs-code max-h-[30rem] overflow-auto px-4 py-3 text-[11px] leading-5 whitespace-pre">
                    <code>{active.value}</code>
                  </pre>
                </div>
              </div>

              <p className="api-docs-rules-note mt-3 text-xs">
                <span>{t("apiDocs.apiHeader")}: <code>x-api-key</code></span>
                <span className="api-docs-rule-separator">/</span>
                <span>{t("apiDocs.webhookHeader")}: <code>x-webhook-signature</code>, <code>x-webhook-timestamp</code>, <code>x-webhook-id</code></span>
                <span className="api-docs-rule-separator">/</span>
                <span>{t("apiDocs.webhookIdempotency")}</span>
                <span className="api-docs-rule-separator">/</span>
                <span>{t("apiDocs.signatureFormat")}: <code>HMAC_SHA256(timestamp.rawBody)</code></span>
              </p>
            </>
          );
        })()}
      </DashboardPanel>
    </OverviewShell>
  );
}
