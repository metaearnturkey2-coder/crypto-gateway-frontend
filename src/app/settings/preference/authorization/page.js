"use client";

import { AlertTriangle, KeyRound, LockKeyhole, MonitorCheck, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

const apiKeyStatusClassName = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700",
  EXPIRED: "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700",
  REVOKED: "border-zinc-700 bg-zinc-800 text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700",
};

function Notice({ notice }) {
  if (!notice) return null;

  return (
    <div className="max-w-4xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 light-dashboard:text-red-700">
      {notice}
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value }) {
  return (
    <div className="settings-preference-row rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="settings-preference-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-zinc-500 light-dashboard:text-zinc-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-white light-dashboard:text-zinc-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function PreferenceAuthorizationPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();
  const [apiKeys, setApiKeys] = useState([]);
  const [merchant, setMerchant] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const loadAuthorization = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [dashboardResponse, sessionsResponse, apiKeysResponse] = await Promise.all([
        merchantFetch("/api/merchant/dashboard"),
        merchantFetch("/api/merchant/sessions"),
        merchantFetch("/api/merchant/api-keys"),
      ]);

      if (!dashboardResponse.ok || !sessionsResponse.ok || !apiKeysResponse.ok) {
        setNotice(t("authorization.loadError"));
        return;
      }

      setMerchant(dashboardResponse.body.merchant || null);
      setSessions(Array.isArray(sessionsResponse.body.sessions) ? sessionsResponse.body.sessions : []);
      setApiKeys(Array.isArray(apiKeysResponse.body.apiKeys) ? apiKeysResponse.body.apiKeys : []);
    } catch (error) {
      reportClientError("settings.authorization.load", error);
      setNotice(t("authorization.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(loadAuthorization);
  }, [loadAuthorization]);

  const activeApiKeys = useMemo(
    () => apiKeys.filter((apiKey) => (apiKey.effectiveStatus || apiKey.status) === "ACTIVE"),
    [apiKeys]
  );
  const liveApiKeys = activeApiKeys.filter((apiKey) => apiKey.mode === "LIVE").length;
  const testApiKeys = activeApiKeys.filter((apiKey) => apiKey.mode === "TEST").length;
  const currentSession = sessions.find((session) => session.isCurrent) || sessions[0] || null;

  const checklist = [
    {
      complete: Boolean(merchant?.callbackUrl || merchant?.webhookUrl),
      label: t("authorization.checkWebhook"),
      description: t("authorization.checkWebhookDescription"),
      href: "/settings/security",
    },
    {
      complete: activeApiKeys.length > 0,
      label: t("authorization.checkApiKeys"),
      description: t("authorization.checkApiKeysDescription"),
      href: "/settings/api",
    },
    {
      complete: sessions.length > 0,
      label: t("authorization.checkSessions"),
      description: t("authorization.checkSessionsDescription"),
      href: "/settings/preference/active-sessions",
    },
  ];

  return (
    <SettingsShell title={t("settings.preference")} activeSection="preference">
      <div className="max-w-5xl space-y-5">
        <Notice notice={notice} />

        <DashboardPanel className="rounded-lg p-0 sm:p-0">
          <div className="settings-panel-header flex flex-col gap-4 border-b px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                <LockKeyhole size={19} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white light-dashboard:text-zinc-950">
                  {t("authorization.title")}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                  {t("authorization.description")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DashboardButton
                as={Link}
                href="/settings/preference/active-sessions"
                variant="secondary"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4"
              >
                <MonitorCheck size={16} />
                {t("authorization.manageSessions")}
              </DashboardButton>
              <DashboardButton
                as={Link}
                href="/settings/api"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4"
              >
                <KeyRound size={16} />
                {t("authorization.manageKeys")}
              </DashboardButton>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <SummaryMetric icon={MonitorCheck} label={t("authorization.activeSessions")} value={loading ? "-" : sessions.length} />
            <SummaryMetric icon={KeyRound} label={t("authorization.activeApiKeys")} value={loading ? "-" : activeApiKeys.length} />
            <SummaryMetric icon={ShieldCheck} label={t("authorization.liveKeys")} value={loading ? "-" : liveApiKeys} />
            <SummaryMetric icon={UserCheck} label={t("authorization.testKeys")} value={loading ? "-" : testApiKeys} />
          </div>
        </DashboardPanel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <DashboardPanel className="overflow-hidden rounded-lg p-0 sm:p-0">
            <div className="settings-panel-header border-b px-4 py-4 sm:px-5">
              <h3 className="text-base font-bold text-white light-dashboard:text-zinc-950">
                {t("authorization.apiKeyAccess")}
              </h3>
              <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                {t("authorization.apiKeyAccessDescription")}
              </p>
            </div>

            {loading ? (
              <DashboardEmptyState className="rounded-none border-0 px-5 py-6">
                {t("authorization.loading")}
              </DashboardEmptyState>
            ) : activeApiKeys.length === 0 ? (
              <DashboardEmptyState className="rounded-none border-0 px-5 py-6">
                {t("authorization.noApiKeys")}
              </DashboardEmptyState>
            ) : (
              <div className="settings-row-list divide-y divide-zinc-800">
                {activeApiKeys.slice(0, 5).map((apiKey) => {
                  const effectiveStatus = apiKey.effectiveStatus || apiKey.status;
                  return (
                    <div key={apiKey.id || apiKey.prefix} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_120px_1.2fr] lg:items-center">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-sm font-semibold text-white light-dashboard:text-zinc-950">
                          {apiKey.prefix}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {t("authorization.created")}: {formatDashboardDateTime(apiKey.createdAt, timeZone)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <DashboardPill className={apiKeyStatusClassName[effectiveStatus] || apiKeyStatusClassName.ACTIVE}>
                          {effectiveStatus}
                        </DashboardPill>
                        <DashboardPill className="border-zinc-700 bg-zinc-900 text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700">
                          {apiKey.mode || "LIVE"}
                        </DashboardPill>
                      </div>
                      <p className="break-words text-sm font-semibold text-zinc-300 light-dashboard:text-zinc-700">
                        {(apiKey.scopes || []).join(", ") || t("authorization.noScopes")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardPanel>

          <div className="space-y-5">
            <DashboardPanel className="rounded-lg">
              <div className="flex items-start gap-3">
                <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <MonitorCheck size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white light-dashboard:text-zinc-950">
                    {t("authorization.currentSession")}
                  </h3>
                  {currentSession ? (
                    <div className="mt-2 space-y-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                      <p className="font-semibold text-zinc-200 light-dashboard:text-zinc-800">
                        {[currentSession.device, currentSession.browser, currentSession.os].filter(Boolean).join(" - ")}
                      </p>
                      <p>{[currentSession.ipAddress, currentSession.country, currentSession.city].filter(Boolean).join(", ")}</p>
                      <p>
                        {t("authorization.expires")}: {formatDashboardDateTime(currentSession.expiresAt, timeZone)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                      {loading ? t("authorization.loading") : t("authorization.noSessions")}
                    </p>
                  )}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel className="rounded-lg p-0 sm:p-0">
              <div className="settings-panel-header border-b px-4 py-4 sm:px-5">
                <h3 className="text-base font-bold text-white light-dashboard:text-zinc-950">
                  {t("authorization.readiness")}
                </h3>
              </div>
              <div className="settings-row-list divide-y divide-zinc-800">
                {checklist.map((item) => (
                  <Link key={item.label} href={item.href} className="flex gap-3 px-4 py-4 transition hover:bg-white/5 sm:px-5">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        item.complete
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700"
                      }`}
                    >
                      {item.complete ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white light-dashboard:text-zinc-950">{item.label}</span>
                      <span className="mt-1 block text-sm text-zinc-400 light-dashboard:text-zinc-600">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
