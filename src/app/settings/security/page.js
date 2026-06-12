"use client";

import { Clipboard, KeyRound, RotateCw, Send, ShieldCheck, Webhook } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardButton, DashboardInput, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";

function Notice({ notice }) {
  if (!notice) return null;

  const className =
    notice.type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";

  return (
    <div className={`max-w-4xl rounded-lg border px-4 py-3 text-sm ${className}`}>
      {notice.message}
    </div>
  );
}

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

const getMerchantApiKeyMode = (merchant) =>
  merchant?.apiKeyMode || (merchant?.apiKeyPrefix?.startsWith("cg_test") ? "TEST" : "LIVE");

const getApiCredentialDisplayValue = (merchant, t) => {
  if (merchant?.apiKey) return merchant.apiKey;
  if (merchant?.apiKeyPreview) return merchant.apiKeyPreview;
  if (merchant?.apiKeyPrefix) return `${merchant.apiKeyPrefix} (${t("security.apiKeyHidden")})`;
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
  const [selectedApiKeyMode, setSelectedApiKeyMode] = useState("LIVE");

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/dashboard");
      if (!ok) {
        showNotice("error", data.message || t("security.merchantDataError"));
        return;
      }
      const nextMerchant = data.merchant || null;
      setMerchant(nextMerchant);
      setSelectedApiKeyMode(getMerchantApiKeyMode(nextMerchant));
      setWebhookUrl(data.merchant?.callbackUrl || data.merchant?.webhookUrl || "");
    } catch (error) {
      reportClientError("settings.security.loadDashboard", error);
      showNotice("error", t("security.merchantDataError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(loadDashboard);
  }, [loadDashboard]);

  const saveWebhookUrl = async () => {
    const validationError = validateWebhookUrlInput(webhookUrl, t);
    if (validationError) {
      showNotice("error", validationError);
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      let result = await merchantFetch("/api/merchant/webhook-url", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookUrl }),
      });

      if (result.status === 404) {
        result = await merchantFetch("/api/merchant/callback-url", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callbackUrl: webhookUrl }),
        });
      }

      const { body: data, ok } = result;
      if (!ok) {
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
    setTestingWebhook(true);
    setNotice(null);
    setWebhookTestResult(null);

    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/webhook-test", {
        method: "POST",
      });
      setWebhookTestResult(data);

      if (!ok) {
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
    setRegenerating(true);
    setNotice(null);
    setConfirmAction(null);
    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/webhook-secret/regenerate", {
        method: "POST",
      });
      if (!ok) {
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
    if (!merchant?.apiKey) {
      showNotice("error", t("security.apiKeyCopyUnavailable"));
      return;
    }

    try {
      await navigator.clipboard.writeText(merchant.apiKey);
      showNotice("success", t("security.apiKeyCopied"));
    } catch {
      showNotice("error", t("security.copyFailed"));
    }
  };

  const apiCredentialDisplayValue = getApiCredentialDisplayValue(merchant, t);
  const hasFullApiKey = Boolean(merchant?.apiKey);

  const regenerateApiKey = async () => {
    setNotice(null);
    setConfirmAction(null);
    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/api-key/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: selectedApiKeyMode }),
      });
      if (!ok) {
        showNotice("error", data.message || t("security.apiKeyRegenerateError"));
        return;
      }
      setMerchant((prev) => ({
        ...prev,
        ...(data.merchant || {}),
        apiKey: data.merchant?.apiKey || data.apiKey || prev?.apiKey || "",
        apiKeyMode: data.merchant?.apiKeyMode || selectedApiKeyMode,
        apiKeyPrefix: data.apiKeyRecord?.prefix || data.merchant?.apiKeyPrefix || prev?.apiKeyPrefix,
      }));
      showNotice("success", t("security.apiKeyRegenerated"));
    } catch {
      showNotice("error", t("security.apiKeyRegenerateError"));
    }
  };

  return (
    <SettingsShell title={t("settings.security")} activeSection="security">
      <div className="space-y-5">
        <Notice notice={notice} />

        <DashboardPanel className="max-w-4xl overflow-hidden rounded-lg p-0 sm:p-0">
          <div className="settings-panel-header border-b px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="settings-preference-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                <Webhook size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white light-dashboard:text-zinc-950">{t("security.title")}</h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">{t("security.description")}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <DashboardInput
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-site.com/webhook"
              className="h-10 min-w-0 rounded-lg font-semibold"
            />
            <DashboardButton
              type="button"
              onClick={saveWebhookUrl}
              disabled={loading || saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-60"
            >
              <ShieldCheck size={16} strokeWidth={2.2} />
              {saving ? t("security.saving") : t("security.saveUrl")}
            </DashboardButton>
            <DashboardButton
              type="button"
              variant="secondary"
              onClick={testWebhook}
              disabled={loading || testingWebhook || !webhookUrl.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-60"
            >
              <Send size={16} strokeWidth={2.2} />
              {testingWebhook ? t("security.testing") : t("security.testWebhook")}
            </DashboardButton>
          </div>

          {webhookTestResult && (
            <div
              className={`mx-4 mb-4 rounded-lg border p-4 text-sm sm:mx-5 ${
                webhookTestResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-red-500/30 bg-red-500/10 text-red-100"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <p className="font-semibold">{webhookTestResult.message || t("security.webhookCompleted")}</p>
                <DashboardPill className="border-current">
                  HTTP {webhookTestResult.statusCode || "-"}
                </DashboardPill>
              </div>
              {webhookTestResult.error && (
                <p className="mt-2 break-all text-xs opacity-80">{webhookTestResult.error}</p>
              )}
            </div>
          )}

          <div className="settings-security-subcard mx-4 mb-4 rounded-lg border p-4 sm:mx-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs uppercase tracking-wide light-dashboard:text-zinc-500">{t("security.webhookSecret")}</p>
              <p className="text-zinc-500 text-sm">{t("security.sensitive")}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <DashboardInput
                type="text"
                value={merchant?.webhookSecret || ""}
                readOnly
                className="h-10 min-w-0 rounded-lg font-mono text-xs"
              />
              <DashboardButton
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!merchant?.webhookSecret) return;
                  await navigator.clipboard.writeText(merchant.webhookSecret);
                  showNotice("success", t("security.webhookSecretCopied"));
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4"
              >
                <Clipboard size={16} strokeWidth={2.2} />
                {t("security.copySecret")}
              </DashboardButton>
              <DashboardButton
                type="button"
                variant="dangerSolid"
                onClick={() => setConfirmAction("webhookSecret")}
                disabled={regenerating}
                className="settings-danger-solid inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-60"
              >
                <RotateCw size={16} strokeWidth={2.2} />
                {regenerating ? t("security.regenerating") : t("security.regenerate")}
              </DashboardButton>
            </div>
            {confirmAction === "webhookSecret" && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <p className="mb-3">{t("security.regenerateWebhookPrompt")}</p>
                <div className="flex flex-wrap gap-3">
                  <DashboardButton
                    type="button"
                    variant="dangerSolid"
                    onClick={regenerateWebhookSecret}
                    className="settings-danger-solid rounded-lg px-4 py-2"
                  >
                    {t("security.confirmRegenerate")}
                  </DashboardButton>
                  <DashboardButton
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg px-4 py-2"
                  >
                    {t("security.cancel")}
                  </DashboardButton>
                </div>
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="max-w-4xl overflow-hidden rounded-lg p-0 sm:p-0">
          <div className="settings-panel-header flex flex-col gap-3 border-b px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="settings-preference-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                <KeyRound size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white light-dashboard:text-zinc-950">{t("security.apiAccess")}</h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">{t("security.apiAccessDescription")}</p>
              </div>
            </div>
            <DashboardPill className="w-fit">
              {t("security.currentMode")}: {getMerchantApiKeyMode(merchant)}
            </DashboardPill>
          </div>
          <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
            {["LIVE", "TEST"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedApiKeyMode(mode)}
                className={`rounded-lg border p-4 text-left transition ${
                  selectedApiKeyMode === mode
                    ? "settings-mode-card-selected border-blue-400 bg-blue-400/10 text-blue-100 light-dashboard:text-blue-800"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-700 light-dashboard:hover:border-zinc-300"
                }`}
              >
                <span className="settings-mode-card-title text-sm font-semibold">
                  {mode === "LIVE" ? t("security.liveMode") : t("security.testMode")}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {mode === "LIVE" ? t("security.liveModeDescription") : t("security.testModeDescription")}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 px-4 pb-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <DashboardInput
              type="text"
              value={apiCredentialDisplayValue}
              readOnly
              placeholder={loading ? t("security.loadingApiKey") : t("security.noApiKeyPreview")}
              className="h-10 min-w-0 rounded-lg font-mono text-xs"
            />
            <DashboardButton
              type="button"
              variant="secondary"
              onClick={copyApiKey}
              disabled={!hasFullApiKey}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clipboard size={16} strokeWidth={2.2} />
              {t("security.copyApiKey")}
            </DashboardButton>
            <DashboardButton
              type="button"
              variant="dangerSolid"
              onClick={() => setConfirmAction("apiKey")}
              className="settings-danger-solid inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4"
            >
              <RotateCw size={16} strokeWidth={2.2} />
              {t("security.regenerate")}
            </DashboardButton>
          </div>
          {confirmAction === "apiKey" && (
            <div className="mx-4 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 sm:mx-5">
              <p className="mb-3">
                {t("security.regenerateApiPrompt")} ({selectedApiKeyMode})
              </p>
              <div className="flex flex-wrap gap-3">
                <DashboardButton
                  type="button"
                  variant="dangerSolid"
                  onClick={regenerateApiKey}
                  className="settings-danger-solid rounded-lg px-4 py-2"
                >
                  {t("security.confirmRegenerate")}
                </DashboardButton>
                <DashboardButton
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg px-4 py-2"
                >
                  {t("security.cancel")}
                </DashboardButton>
              </div>
            </div>
          )}
          {!hasFullApiKey && (
            <p className="px-4 pb-4 text-xs text-zinc-500 light-dashboard:text-zinc-600 sm:px-5">
              {t("security.apiKeyHiddenHelp")}
            </p>
          )}
        </DashboardPanel>
      </div>
    </SettingsShell>
  );
}
