"use client";

import { useEffect, useState } from "react";
import SettingsShell from "@/components/settings-shell";
import { apiUrl } from "@/lib/api";
import { useDashboardLanguage } from "@/lib/i18n";

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

const readJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 240),
    };
  }
};

const BLOCKED_WEBHOOK_HOSTS = ["localhost", "localhost.localdomain", "0.0.0.0", "127.", "10.", "192.168."];

const validateWebhookUrlInput = (value, t) => {
  const trimmed = value.trim();
  if (!trimmed) return t("security.webhookRequired");

  try {
    const parsedUrl = new URL(trimmed);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return t("security.webhookProtocol");
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isBlocked =
      BLOCKED_WEBHOOK_HOSTS.some((blocked) => hostname === blocked || hostname.startsWith(blocked)) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      hostname.endsWith(".localhost");

    if (isBlocked) {
      return t("security.webhookPrivate");
    }
  } catch {
    return t("security.webhookInvalid");
  }

  return "";
};

export default function SecuritySettingsPage() {
  const { t } = useDashboardLanguage();
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
      const data = await readJsonResponse(response);
      if (!response.ok) {
        showNotice("error", data.message || t("security.merchantDataError"));
        return;
      }
      setMerchant(data.merchant || null);
      setWebhookUrl(data.merchant?.callbackUrl || data.merchant?.webhookUrl || "");
    } catch {
      showNotice("error", t("security.merchantDataError"));
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
    const validationError = validateWebhookUrlInput(webhookUrl, t);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      let response = await fetch(apiUrl("/api/merchant/webhook-url"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webhookUrl }),
      });

      if (response.status === 404) {
        response = await fetch(apiUrl("/api/merchant/callback-url"), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ callbackUrl: webhookUrl }),
        });
      }

      const data = await readJsonResponse(response);
      if (!response.ok) {
        showNotice("error", data.errors?.join(" ") || data.message || t("security.webhookSaveError"));
        return;
      }
      showNotice("success", t("security.webhookUpdated"));
      setMerchant((prev) => ({
        ...prev,
        callbackUrl: data.callbackUrl || data.webhookUrl || webhookUrl,
        webhookUrl: data.webhookUrl || data.callbackUrl || webhookUrl,
      }));
      setWebhookTestResult(null);
    } catch (error) {
      showNotice("error", `${t("security.webhookSaveError")}: ${error.message}`);
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
      const data = await readJsonResponse(response);
      setWebhookTestResult(data);

      if (!response.ok) {
        showNotice("error", data.message || t("security.webhookTestFailed"));
        return;
      }

      showNotice("success", data.message || t("security.webhookDelivered"));
    } catch (error) {
      showNotice("error", `${t("security.webhookTestFailed")}: ${error.message}`);
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
      const data = await readJsonResponse(response);
      if (!response.ok) {
        showNotice("error", data.message || t("security.webhookSecretRegenerateError"));
        return;
      }
      setMerchant((prev) => ({ ...prev, webhookSecret: data.webhookSecret }));
      showNotice("success", t("security.webhookSecretRegenerated"));
    } catch {
      showNotice("error", t("security.webhookSecretRegenerateError"));
    } finally {
      setRegenerating(false);
    }
  };

  const copyApiKey = async () => {
    if (!merchant?.apiKey) return;
    try {
      await navigator.clipboard.writeText(merchant.apiKey);
      showNotice("success", t("security.apiKeyCopied"));
    } catch {
      showNotice("error", t("security.copyFailed"));
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
      const data = await readJsonResponse(response);
      if (!response.ok) {
        showNotice("error", data.message || t("security.apiKeyRegenerateError"));
        return;
      }
      setMerchant((prev) => ({ ...prev, apiKey: data.apiKey }));
      showNotice("success", t("security.apiKeyRegenerated"));
    } catch {
      showNotice("error", t("security.apiKeyRegenerateError"));
    }
  };

  return (
    <SettingsShell title={t("settings.security")} activeSection="security">
      <div className="space-y-6">
        <Notice notice={notice} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">{t("security.title")}</h2>
          <p className="text-zinc-400 mt-2">{t("security.description")}</p>

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
              {saving ? t("security.saving") : t("security.saveUrl")}
            </button>
            <button
              onClick={testWebhook}
              disabled={loading || testingWebhook || !webhookUrl.trim()}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
            >
              {testingWebhook ? t("security.testing") : t("security.testWebhook")}
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
                <p className="font-semibold">{webhookTestResult.message || t("security.webhookCompleted")}</p>
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
              <p className="text-zinc-400 text-xs uppercase tracking-wide">{t("security.webhookSecret")}</p>
              <p className="text-zinc-500 text-sm">{t("security.sensitive")}</p>
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
                  showNotice("success", t("security.webhookSecretCopied"));
                }}
                className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800"
              >
                {t("security.copySecret")}
              </button>
              <button
                onClick={() => setConfirmAction("webhookSecret")}
                disabled={regenerating}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {regenerating ? t("security.regenerating") : t("security.regenerate")}
              </button>
            </div>
            {confirmAction === "webhookSecret" && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <p className="mb-3">{t("security.regenerateWebhookPrompt")}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={regenerateWebhookSecret}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                  >
                    {t("security.confirmRegenerate")}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    {t("security.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">{t("security.apiAccess")}</h2>
          <p className="text-zinc-400 mb-4">{t("security.apiAccessDescription")}</p>
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
              {t("security.copyApiKey")}
            </button>
            <button
              onClick={() => setConfirmAction("apiKey")}
              className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
            >
              {t("security.regenerate")}
            </button>
          </div>
          {confirmAction === "apiKey" && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="mb-3">{t("security.regenerateApiPrompt")}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={regenerateApiKey}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  {t("security.confirmRegenerate")}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  {t("security.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  );
}
