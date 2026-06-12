"use client";

import { Clock, LogOut, MonitorCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { clearMerchantSession, merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

export default function PreferenceActiveSessionsPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { body: data, ok } = await merchantFetch("/api/merchant/sessions");

      if (!ok) {
        setSessions([]);
        return;
      }

      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadSessions);
  }, [loadSessions]);

  const terminateSession = async (sessionId, isCurrent) => {
    const { ok } = await merchantFetch(`/api/merchant/sessions/${sessionId}/revoke`, {
      method: "POST",
    });

    if (!ok) return;

    if (isCurrent) {
      clearMerchantSession();
      window.location.assign("/login");
      return;
    }

    loadSessions();
  };

  const getSessionDetails = (session) => {
    const platform = [session.os, session.browser].filter(Boolean).join(" ");
    const location = [session.country, session.city].filter(Boolean).join(", ");
    const network = [session.ipAddress, location].filter(Boolean).join(", ");

    return [
      platform || session.device || t("sessions.unknownDevice"),
      network || t("sessions.unknownLocation"),
    ].join(" - ");
  };

  return (
    <SettingsShell title={t("settings.preference")} activeSection="preference">
      <DashboardPanel className="max-w-3xl overflow-hidden rounded-lg p-0 sm:p-0">
        <div className="settings-panel-header flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
          <h3 className="text-base font-bold text-white light-dashboard:text-zinc-950">{t("sessions.pageTitle")}</h3>
          {sessions.length > 0 ? (
            <DashboardPill className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300 light-dashboard:bg-emerald-50 light-dashboard:text-emerald-700">
              {sessions.length} {t("sessions.online")}
            </DashboardPill>
          ) : null}
        </div>

        {loading || sessions.length === 0 ? (
          <div className="p-4 sm:p-5">
            <DashboardEmptyState className="rounded-lg px-4 py-5 font-semibold">
              {loading ? t("sessions.loading") : t("sessions.noSession")}
            </DashboardEmptyState>
          </div>
        ) : (
          <div className="settings-row-list divide-y divide-zinc-800">
            {sessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="settings-preference-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border">
                    <MonitorCheck size={20} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white light-dashboard:text-zinc-950">
                        {session.device || t("sessions.thisBrowser")}
                      </p>
                      {session.isCurrent ? (
                        <DashboardPill className="border-zinc-800 bg-zinc-800 px-2.5 text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700">
                          {t("sessions.currentSession")}
                        </DashboardPill>
                      ) : null}
                      <DashboardPill className="border-emerald-500/25 bg-emerald-500/10 px-2.5 text-emerald-300 light-dashboard:bg-emerald-50 light-dashboard:text-emerald-700">
                        {t("sessions.online")}
                      </DashboardPill>
                    </div>
                    <p className="mt-1 break-words text-sm text-zinc-400 light-dashboard:text-zinc-500">
                      {getSessionDetails(session)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-zinc-400 light-dashboard:text-zinc-600">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 px-3 py-1.5 light-dashboard:border-zinc-200">
                        <Clock size={14} />
                        {t("sessions.issuedAt")}: {formatDashboardDateTime(session.createdAt, timeZone)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 px-3 py-1.5 light-dashboard:border-zinc-200">
                        <Clock size={14} />
                        {t("sessions.expiresAt")}: {formatDashboardDateTime(session.expiresAt, timeZone)}
                      </span>
                    </div>
                  </div>
                </div>
                <DashboardButton
                  type="button"
                  variant="danger"
                  onClick={() => terminateSession(session.id, session.isCurrent)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 light-dashboard:text-red-700"
                >
                  <LogOut size={16} />
                  {t("sessions.terminate")}
                </DashboardButton>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </SettingsShell>
  );
}
