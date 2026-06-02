"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { API_BASE_URL, apiUrl } from "@/lib/api";

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

  const loadApiUsage = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch(apiUrl("/api/merchant/api-usage"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
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

    const dashboardRes = await fetch(apiUrl("/api/merchant/dashboard"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const dashboardData = await dashboardRes.json();
    setApiKey(dashboardData?.merchant?.apiKey || "");
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold">API Usage</h2>
            <p className="text-zinc-500 text-sm">Public API request volume and recent integration calls.</p>
          </div>
          <span className="text-zinc-500 text-sm">Last 24 hours</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs mb-2 h-8">Requests</p><p className="text-4xl font-bold font-mono">{apiUsage.summary.total}</p></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs mb-2 h-8">Successful</p><p className="text-4xl font-bold font-mono">{apiUsage.summary.successful}</p></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs mb-2 h-8">Failed</p><p className="text-4xl font-bold font-mono">{apiUsage.summary.failed}</p></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs mb-2 h-8">Create Calls</p><p className="text-4xl font-bold font-mono">{apiUsage.summary.createCalls}</p></div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-zinc-500 text-xs mb-2 h-8">Status Calls</p><p className="text-4xl font-bold font-mono">{apiUsage.summary.statusCalls}</p></div>
        </div>

        {loading ? (
          <p className="text-zinc-400">Loading...</p>
        ) : apiUsage.recentCalls.length === 0 ? (
          <p className="text-zinc-400">No API requests recorded yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
            {apiUsage.recentCalls.map((call) => (
              <div key={call.id} className="grid grid-cols-1 lg:grid-cols-[170px_1fr_110px_190px] gap-3 bg-zinc-950 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApiCallClassName(call.success)}`}>
                    {call.success ? "SUCCESS" : "FAILED"}
                  </span>
                  <span className="text-zinc-500">{call.method}</span>
                </div>
                <div>
                  <p className="font-semibold break-all">{call.path}</p>
                  {call.error && <p className="text-zinc-500 text-xs break-all mt-1">{call.error}</p>}
                </div>
                <p className="text-zinc-500">{call.durationMs}ms</p>
                <p className="text-zinc-500 lg:text-right">{new Date(call.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Integration</h2>
            <p className="text-zinc-400 text-sm mt-2">Production-ready API examples for merchant checkout flows.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {["payment.paid", "payment.cancelled", "payment.expired"].map((event) => (
              <span key={event} className="border border-zinc-700 bg-zinc-950 rounded-lg px-3 py-2 text-zinc-300">
                {event}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-2 text-xs text-zinc-500">Amount limits</p>
            <p>0.01 to 1,000,000 USDT, max 2 decimal places.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-2 text-xs text-zinc-500">Order ID</p>
            <p>Optional, max 80 chars: letters, numbers, dot, dash, underscore, colon.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-2 text-xs text-zinc-500">Customer email</p>
            <p>Optional, must be a valid email address, max 254 chars.</p>
          </div>
        </div>

        {(() => {
          const snippets = [
            {
              key: "create-payment",
              title: "Create Payment",
              method: "POST",
              description: "Creates a checkout session and returns a checkoutUrl.",
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
              title: "Status by Payment ID",
              method: "GET",
              description: "Checks a payment by its gateway payment ID.",
              path: "/api/public/payments/status/{paymentId}",
              value: `curl -X GET "${API_BASE_URL}/api/public/payments/status/{paymentId}" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "status-order-id",
              title: "Status by Order ID",
              method: "GET",
              description: "Checks a payment by the merchant order ID.",
              path: "/api/public/payments/status?orderId=ORDER-1001",
              value: `curl -X GET "${API_BASE_URL}/api/public/payments/status?orderId=ORDER-1001" \\
-H "x-api-key: ${apiKey || "your_api_key"}"`,
            },
            {
              key: "invalid-request",
              title: "Invalid Request Response",
              method: "400",
              description: "Validation errors are returned as a message plus an errors array.",
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
              key: "verify-webhook-node",
              title: "Verify Webhook in Node.js",
              method: "POST",
              description: "Verifies timestamped signatures with a raw JSON body.",
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
    // event.event: payment.paid, payment.cancelled, payment.expired
    // event.payment.id, event.payment.status, event.payment.txHash

    return res.sendStatus(200);
  }
);`,
            },
            {
              key: "verify-webhook-php",
              title: "Verify Webhook in PHP",
              method: "POST",
              description: "Validates the webhook signature before reading the event.",
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
// $event['event']: payment.paid, payment.cancelled, payment.expired
// $event['payment']['id'], status, txHash

http_response_code(200);`,
            },
          ];

          const active = snippets.find((s) => s.key === activeIntegrationKey) || snippets[0];

          return (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
                <div className="space-y-3">
                  {snippets.map((snippet) => (
                    <button
                      key={snippet.key}
                      type="button"
                      onClick={() => setActiveIntegrationKey(snippet.key)}
                      className={`w-full text-left border rounded-xl p-4 transition ${
                        activeIntegrationKey === snippet.key
                          ? "border-white bg-zinc-950"
                          : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{snippet.title}</p>
                        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                          snippet.method === "GET"
                            ? "bg-blue-500 text-black"
                            : snippet.method === "400"
                            ? "bg-red-500 text-black"
                            : "bg-green-500 text-black"
                        }`}>
                          {snippet.method}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-2">{snippet.description}</p>
                      <p className="font-mono text-[11px] text-zinc-400 mt-3 break-all">{snippet.path}</p>
                    </button>
                  ))}
                </div>

                <div className="min-w-0 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                  <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
                    <div>
                      <h3 className="font-semibold">{active.title}</h3>
                      <p className="text-zinc-500 text-xs mt-1">{active.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(active.value);
                        setCopiedKey(active.key);
                        setTimeout(() => setCopiedKey(""), 1200);
                      }}
                      className="shrink-0 bg-white text-black px-4 py-2 rounded-lg text-xs font-semibold"
                    >
                      {copiedKey === active.key ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-zinc-200 whitespace-pre-wrap">
                    <code>{active.value}</code>
                  </pre>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs mb-2">API header</p>
                  <p className="font-mono break-all">x-api-key</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs mb-2">Webhook header</p>
                  <p className="font-mono break-all">x-webhook-signature + x-webhook-timestamp</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs mb-2">Signature format</p>
                  <p className="font-mono break-all">HMAC_SHA256(timestamp + "." + rawBody)</p>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </OverviewShell>
  );
}
