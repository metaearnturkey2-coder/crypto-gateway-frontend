"use client";

import { Clock, LogOut, MonitorCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
      <section className="max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 light-dashboard:border-zinc-200 light-dashboard:bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 light-dashboard:border-zinc-200">
          <h3 className="text-base font-bold text-white light-dashboard:text-zinc-950">{t("sessions.pageTitle")}</h3>
          {sessions.length > 0 ? (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25 light-dashboard:bg-emerald-50 light-dashboard:text-emerald-700">
              {sessions.length} {t("sessions.online")}
            </span>
          ) : null}
        </div>

        {loading || sessions.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-5 text-sm font-semibold text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-700">
              {loading ? t("sessions.loading") : t("sessions.noSession")}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 light-dashboard:divide-zinc-200">
            {sessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
                    <MonitorCheck size={20} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white light-dashboard:text-zinc-950">
                        {session.device || t("sessions.thisBrowser")}
                      </p>
                      {session.isCurrent ? (
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700">
                          {t("sessions.currentSession")}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 light-dashboard:bg-emerald-50 light-dashboard:text-emerald-700">
                        {t("sessions.online")}
                      </span>
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
                <button
                  type="button"
                  onClick={() => terminateSession(session.id, session.isCurrent)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 light-dashboard:border-zinc-200 light-dashboard:bg-white light-dashboard:text-zinc-950 light-dashboard:hover:text-red-700"
                >
                  <LogOut size={16} />
                  {t("sessions.terminate")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </SettingsShell>
  );
}
