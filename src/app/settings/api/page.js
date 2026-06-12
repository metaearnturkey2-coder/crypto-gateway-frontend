"use client";

import { KeyRound, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardPanel } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

const statusClassName = {
  ACTIVE: "api-key-status-active",
  EXPIRED: "api-key-status-expired",
  REVOKED: "api-key-status-revoked",
};

const modeClassName = {
  LIVE: "api-key-mode-live",
  TEST: "api-key-mode-test",
};

export default function ApiSettingsPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [revokingPrefix, setRevokingPrefix] = useState("");

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/api-keys");

      if (!ok) {
        setNotice({ type: "error", message: data.message || t("apiKeys.loadError") });
        return;
      }

      setApiKeys(data.apiKeys || []);
      setNotice(null);
    } catch {
      setNotice({ type: "error", message: t("apiKeys.loadError") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(loadApiKeys);
  }, [loadApiKeys]);

  const revokeApiKey = async (prefix) => {
    setRevokingPrefix(prefix);
    setNotice(null);
    try {
      const { body: data, ok } = await merchantFetch(`/api/merchant/api-keys/${prefix}/revoke`, {
        method: "POST",
      });

      if (!ok) {
        setNotice({ type: "error", message: data.message || t("apiKeys.revokeError") });
        return;
      }

      setNotice({ type: "success", message: t("apiKeys.revoked") });
      await loadApiKeys();
    } catch {
      setNotice({ type: "error", message: t("apiKeys.revokeError") });
    } finally {
      setRevokingPrefix("");
    }
  };

  return (
    <SettingsShell title={t("settings.api")} activeSection="api">
      <div className="space-y-5">
        <DashboardPanel className="max-w-4xl overflow-hidden rounded-lg p-0 sm:p-0">
          <div className="settings-panel-header flex flex-col gap-3 border-b px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="settings-preference-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                <KeyRound size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white light-dashboard:text-zinc-950">
                  {t("apiKeys.title")}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                  {t("apiKeys.description")}
                </p>
              </div>
            </div>
            <DashboardButton
              as="a"
              href="/settings/security"
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 md:w-auto"
            >
              <RotateCcw size={16} strokeWidth={2.2} />
              {t("apiKeys.createOrRotate")}
            </DashboardButton>
          </div>
        </DashboardPanel>

        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {notice.message}
          </div>
        )}

        <DashboardPanel className="max-w-4xl overflow-hidden rounded-lg p-0 sm:p-0">
          <div className="settings-panel-header hidden grid-cols-[1.2fr_90px_100px_1.2fr_1fr_1fr_110px] gap-3 border-b px-5 py-3 text-xs font-semibold uppercase text-zinc-500 lg:grid">
            <span>{t("apiKeys.prefix")}</span>
            <span>{t("apiKeys.mode")}</span>
            <span>{t("apiKeys.status")}</span>
            <span>{t("apiKeys.scopes")}</span>
            <span>{t("apiKeys.lastUsed")}</span>
            <span>{t("apiKeys.expires")}</span>
            <span className="text-right">{t("apiKeys.actions")}</span>
          </div>

          {loading && (
            <DashboardEmptyState className="rounded-none border-0 px-5 py-6">
              {t("apiKeys.loading")}
            </DashboardEmptyState>
          )}

          {!loading && apiKeys.length === 0 && (
            <DashboardEmptyState className="rounded-none border-0 px-5 py-6">
              {t("apiKeys.empty")}
            </DashboardEmptyState>
          )}

          {!loading &&
            apiKeys.map((apiKey) => {
              const effectiveStatus = apiKey.effectiveStatus || apiKey.status;

              return (
                <div
                  key={apiKey.id}
                  className="api-key-row grid grid-cols-1 gap-3 border-b px-4 py-4 text-sm last:border-b-0 sm:grid-cols-2 lg:grid-cols-[1.2fr_90px_100px_1.2fr_1fr_1fr_110px] lg:items-center lg:px-5"
                >
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.prefix")}</span>
                  <p className="break-all font-mono text-sm font-semibold text-zinc-100 light-dashboard:text-zinc-950">{apiKey.prefix}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDashboardDateTime(apiKey.createdAt, timeZone)}</p>
                </div>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.mode")}</span>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${modeClassName[apiKey.mode] || modeClassName.LIVE}`}>
                    {apiKey.mode || "LIVE"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.status")}</span>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[effectiveStatus] || "border-zinc-600 bg-zinc-800 text-zinc-200 light-dashboard:text-zinc-700"}`}>
                    {effectiveStatus}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.scopes")}</span>
                  <p className="break-words text-zinc-300 light-dashboard:text-zinc-700">
                    {(apiKey.scopes || []).join(", ")}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.lastUsed")}</span>
                  <p className="text-zinc-400 light-dashboard:text-zinc-600">
                    {apiKey.lastUsedAt ? formatDashboardDateTime(apiKey.lastUsedAt, timeZone) : "-"}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500 lg:hidden">{t("apiKeys.expires")}</span>
                  <p className="text-zinc-400 light-dashboard:text-zinc-600">
                    {apiKey.expiresAt ? formatDashboardDateTime(apiKey.expiresAt, timeZone) : t("apiKeys.noExpiry")}
                  </p>
                </div>
                <div className="flex justify-start sm:col-span-2 lg:col-span-1 lg:justify-end">
                  <DashboardButton
                    type="button"
                    variant="danger"
                    onClick={() => revokeApiKey(apiKey.prefix)}
                    disabled={effectiveStatus !== "ACTIVE" || revokingPrefix === apiKey.prefix}
                    className="settings-danger-outline inline-flex h-9 w-full items-center justify-center rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    {revokingPrefix === apiKey.prefix ? t("apiKeys.revoking") : t("apiKeys.revoke")}
                  </DashboardButton>
                </div>
              </div>
              );
            })}
        </DashboardPanel>
      </div>
    </SettingsShell>
  );
}
