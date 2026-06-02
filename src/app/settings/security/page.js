"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";

function Notice({ notice }) {
  if (!notice) return null;

  const className =
    notice.type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${className}`}>
      {notice.message}
    </div>
  );
}

const BLOCKED_WEBHOOK_HOSTS = ["localhost", "localhost.localdomain", "0.0.0.0", "127.", "10.", "192.168."];

const validateWebhookUrlInput = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "Webhook URL is required.";

  try {
    const parsedUrl = new URL(trimmed);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "Webhook URL must start with http or https.";
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isBlocked =
      BLOCKED_WEBHOOK_HOSTS.some((blocked) => hostname === blocked || hostname.startsWith(blocked)) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      hostname.endsWith(".localhost");

    if (isBlocked) {
      return "Webhook URL cannot point to localhost or a private network.";
    }
  } catch {
    return "Webhook URL must be a valid URL.";
  }

  return "";
};

export default function SecuritySettingsPage() {
  const [merchant, setMerchant] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/merchant/dashboard"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice("error", data.message || "Merchant data error");
        return;
      }
      setMerchant(data.merchant || null);
      setWebhookUrl(data.merchant?.callbackUrl || data.merchant?.webhookUrl || "");
    } catch {
      showNotice("error", "Merchant data error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const saveWebhookUrl = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const validationError = validateWebhookUrlInput(webhookUrl);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(apiUrl("/api/merchant/webhook-url"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice("error", data.errors?.join(" ") || data.message || "Webhook URL save error");
        return;
      }
      showNotice("success", "Webhook URL updated");
      setMerchant((prev) => ({
        ...prev,
        callbackUrl: data.callbackUrl || data.webhookUrl || webhookUrl,
        webhookUrl: data.webhookUrl || data.callbackUrl || webhookUrl,
      }));
      setWebhookTestResult(null);
    } catch {
      showNotice("error", "Webhook URL save error");
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setTestingWebhook(true);
    setNotice(null);
    setWebhookTestResult(null);

    try {
      const response = await fetch(apiUrl("/api/merchant/webhook-test"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setWebhookTestResult(data);

      if (!response.ok) {
        showNotice("error", data.message || "Webhook test failed");
        return;
      }

      showNotice("success", data.message || "Webhook test delivered");
    } catch {
      showNotice("error", "Webhook test failed");
    } finally {
      setTestingWebhook(false);
    }
  };

  const regenerateWebhookSecret = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setRegenerating(true);
    setNotice(null);
    setConfirmAction(null);
    try {
      const response = await fetch(apiUrl("/api/merchant/webhook-secret/regenerate"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice("error", data.message || "Webhook secret regenerate error");
        return;
      }
      setMerchant((prev) => ({ ...prev, webhookSecret: data.webhookSecret }));
      showNotice("success", "Webhook secret regenerated");
    } catch {
      showNotice("error", "Webhook secret regenerate error");
    } finally {
      setRegenerating(false);
    }
  };

  const copyApiKey = async () => {
    if (!merchant?.apiKey) return;
    try {
      await navigator.clipboard.writeText(merchant.apiKey);
      showNotice("success", "API key copied");
    } catch {
      showNotice("error", "Copy failed");
    }
  };

  const regenerateApiKey = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setNotice(null);
    setConfirmAction(null);
    try {
      const response = await fetch(apiUrl("/api/merchant/api-key/regenerate"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showNotice("error", data.message || "API key regenerate error");
        return;
      }
      setMerchant((prev) => ({ ...prev, apiKey: data.apiKey }));
      showNotice("success", "API key regenerated");
    } catch {
      showNotice("error", "API key regenerate error");
    }
  };

  return (
    <OverviewShell>
      <div className="space-y-6">
        <Notice notice={notice} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Security</h2>
          <p className="text-zinc-400 mt-2">Configure your receiver URL and manage webhook credentials.</p>

          <div className="mt-6 flex gap-3 flex-col md:flex-row">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-site.com/webhook"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-zinc-500"
            />
            <button
              onClick={saveWebhookUrl}
              disabled={loading || saving}
              className="rounded-xl bg-zinc-100 text-zinc-900 px-6 py-3 font-semibold hover:bg-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save URL"}
            </button>
            <button
              onClick={testWebhook}
              disabled={loading || testingWebhook || !webhookUrl.trim()}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
            >
              {testingWebhook ? "Testing..." : "Test Webhook"}
            </button>
          </div>

          {webhookTestResult && (
            <div
              className={`mt-4 rounded-xl border p-4 text-sm ${
                webhookTestResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-red-500/30 bg-red-500/10 text-red-100"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <p className="font-semibold">{webhookTestResult.message || "Webhook test completed"}</p>
                <span className="rounded-full border border-current px-3 py-1 text-xs">
                  HTTP {webhookTestResult.statusCode || "-"}
                </span>
              </div>
              {webhookTestResult.error && (
                <p className="mt-2 break-all text-xs opacity-80">{webhookTestResult.error}</p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs uppercase tracking-wide">Webhook Secret</p>
              <p className="text-zinc-500 text-sm">Sensitive</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={merchant?.webhookSecret || ""}
                readOnly
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100"
              />
              <button
                onClick={async () => {
                  if (!merchant?.webhookSecret) return;
                  await navigator.clipboard.writeText(merchant.webhookSecret);
                  showNotice("success", "Webhook secret copied");
                }}
                className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800"
              >
                Copy Secret
              </button>
              <button
                onClick={() => setConfirmAction("webhookSecret")}
                disabled={regenerating}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            {confirmAction === "webhookSecret" && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <p className="mb-3">Regenerate webhook secret? Existing integrations must be updated.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={regenerateWebhookSecret}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                  >
                    Confirm regenerate
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">API Access</h2>
          <p className="text-zinc-400 mb-4">Use this key to create payments from external merchant websites.</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={merchant?.apiKey || ""}
              readOnly
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100"
            />
            <button
              onClick={copyApiKey}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Copy API Key
            </button>
            <button
              onClick={() => setConfirmAction("apiKey")}
              className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
            >
              Regenerate
            </button>
          </div>
          {confirmAction === "apiKey" && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="mb-3">Regenerate API key? Existing external integrations will stop working until updated.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={regenerateApiKey}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  Confirm regenerate
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </OverviewShell>
  );
}
