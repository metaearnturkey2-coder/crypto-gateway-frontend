"use client";

import { useCallback, useEffect, useState } from "react";
import SettingsShell from "@/components/settings-shell";
import { apiUrl } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

const statusClassName = {
  ACTIVE: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  REVOKED: "border-red-400/40 bg-red-400/10 text-red-200",
};

const modeClassName = {
  LIVE: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  TEST: "border-blue-300/40 bg-blue-300/10 text-blue-100",
};

export default function ApiSettingsPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [revokingPrefix, setRevokingPrefix] = useState("");

  const loadApiKeys = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/merchant/api-keys"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
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
    const token = localStorage.getItem("token");
    if (!token) return;

    setRevokingPrefix(prefix);
    setNotice(null);
    try {
      const response = await fetch(apiUrl(`/api/merchant/api-keys/${prefix}/revoke`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 light-dashboard:border-zinc-200 light-dashboard:bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white light-dashboard:text-zinc-950">
                {t("apiKeys.title")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                {t("apiKeys.description")}
              </p>
            </div>
            <a
              href="/settings/security"
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-80 light-dashboard:bg-zinc-950 light-dashboard:text-white"
            >
              {t("apiKeys.createOrRotate")}
            </a>
          </div>
        </div>

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

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 light-dashboard:border-zinc-200 light-dashboard:bg-white">
          <div className="grid grid-cols-[1.2fr_90px_100px_1.2fr_1fr_1fr_110px] gap-3 border-b border-zinc-800 px-5 py-3 text-xs font-semibold uppercase text-zinc-500 light-dashboard:border-zinc-200">
            <span>{t("apiKeys.prefix")}</span>
            <span>{t("apiKeys.mode")}</span>
            <span>{t("apiKeys.status")}</span>
            <span>{t("apiKeys.scopes")}</span>
            <span>{t("apiKeys.lastUsed")}</span>
            <span>{t("apiKeys.expires")}</span>
            <span className="text-right">{t("apiKeys.actions")}</span>
          </div>

          {loading && <p className="px-5 py-6 text-sm text-zinc-400">{t("apiKeys.loading")}</p>}

          {!loading && apiKeys.length === 0 && (
            <p className="px-5 py-6 text-sm text-zinc-400">{t("apiKeys.empty")}</p>
          )}

          {!loading &&
            apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="grid grid-cols-1 gap-3 border-b border-zinc-800 px-5 py-4 text-sm last:border-b-0 light-dashboard:border-zinc-200 lg:grid-cols-[1.2fr_90px_100px_1.2fr_1fr_1fr_110px] lg:items-center"
              >
                <div>
                  <p className="break-all font-mono text-zinc-100 light-dashboard:text-zinc-950">{apiKey.prefix}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDashboardDateTime(apiKey.createdAt, timeZone)}</p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${modeClassName[apiKey.mode] || modeClassName.LIVE}`}>
                  {apiKey.mode || "LIVE"}
                </span>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[apiKey.status] || "border-zinc-600 bg-zinc-800 text-zinc-200"}`}>
                  {apiKey.status}
                </span>
                <p className="break-words text-zinc-300 light-dashboard:text-zinc-700">
                  {(apiKey.scopes || []).join(", ")}
                </p>
                <p className="text-zinc-400 light-dashboard:text-zinc-600">
                  {apiKey.lastUsedAt ? formatDashboardDateTime(apiKey.lastUsedAt, timeZone) : "-"}
                </p>
                <p className="text-zinc-400 light-dashboard:text-zinc-600">
                  {apiKey.expiresAt ? formatDashboardDateTime(apiKey.expiresAt, timeZone) : t("apiKeys.noExpiry")}
                </p>
                <div className="flex justify-start lg:justify-end">
                  <button
                    onClick={() => revokeApiKey(apiKey.prefix)}
                    disabled={apiKey.status !== "ACTIVE" || revokingPrefix === apiKey.prefix}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {revokingPrefix === apiKey.prefix ? t("apiKeys.revoking") : t("apiKeys.revoke")}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </SettingsShell>
  );
}
