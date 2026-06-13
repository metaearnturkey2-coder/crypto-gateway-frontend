"use client";

import { Bell, Clock3, Languages, ShieldCheck, WalletCards, Webhook } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardPanel, DashboardSelect } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { normalizeDashboardLanguage, turkishLanguageLabel, useDashboardLanguage } from "@/lib/i18n";

const defaultPreferences = {
  notificationLanguage: "English",
  paymentEmailAlerts: true,
  webhookEmailAlerts: true,
  payoutEmailAlerts: true,
  securityEmailAlerts: true,
  weeklySummaryEmail: false,
};

const languageOptions = ["English", turkishLanguageLabel];

const notificationControls = [
  {
    key: "paymentEmailAlerts",
    icon: Bell,
    titleKey: "notifications.paymentEmailAlerts",
    descriptionKey: "notifications.paymentEmailAlertsDescription",
  },
  {
    key: "webhookEmailAlerts",
    icon: Webhook,
    titleKey: "notifications.webhookEmailAlerts",
    descriptionKey: "notifications.webhookEmailAlertsDescription",
  },
  {
    key: "payoutEmailAlerts",
    icon: WalletCards,
    titleKey: "notifications.payoutEmailAlerts",
    descriptionKey: "notifications.payoutEmailAlertsDescription",
  },
  {
    key: "securityEmailAlerts",
    icon: ShieldCheck,
    titleKey: "notifications.securityEmailAlerts",
    descriptionKey: "notifications.securityEmailAlertsDescription",
  },
  {
    key: "weeklySummaryEmail",
    icon: Clock3,
    titleKey: "notifications.weeklySummaryEmail",
    descriptionKey: "notifications.weeklySummaryEmailDescription",
  },
];

function Notice({ notice }) {
  if (!notice) return null;

  const className =
    notice.type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 light-dashboard:text-emerald-700"
      : "border-red-500/40 bg-red-500/10 text-red-200 light-dashboard:text-red-700";

  return <div className={`max-w-4xl rounded-lg border px-4 py-3 text-sm ${className}`}>{notice.message}</div>;
}

function NotificationToggle({ checked, disabled, label, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
        checked ? "settings-theme-toggle-on" : "settings-theme-toggle-off"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { t } = useDashboardLanguage();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [notice, setNotice] = useState(null);

  const normalizePreferences = useCallback((preference = {}) => ({
    ...defaultPreferences,
    ...preference,
    notificationLanguage: normalizeDashboardLanguage(
      preference.notificationLanguage || defaultPreferences.notificationLanguage
    ),
  }), []);

  const loadPreferences = useCallback(async () => {
    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/preferences");

      if (!ok) {
        setNotice({ type: "error", message: data.message || data.errors?.join(" ") || t("notifications.loadError") });
        return;
      }

      setPreferences(normalizePreferences(data.preference));
    } catch (error) {
      reportClientError("settings.notifications.load", error);
      setNotice({ type: "error", message: t("notifications.loadError") });
    } finally {
      setReady(true);
    }
  }, [normalizePreferences, t]);

  useEffect(() => {
    queueMicrotask(loadPreferences);
  }, [loadPreferences]);

  const updatePreference = async (key, value) => {
    const previousPreferences = preferences;
    const nextPreferences = { ...preferences, [key]: value };

    setPreferences(nextPreferences);
    setSavingKey(key);
    setNotice(null);

    try {
      const { body: data, ok } = await merchantFetch("/api/merchant/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!ok) {
        throw new Error(data.errors?.join(" ") || data.message || t("notifications.saveError"));
      }

      setPreferences(normalizePreferences(data.preference));
      setNotice({ type: "success", message: t("notifications.saved") });
    } catch (error) {
      setPreferences(previousPreferences);
      reportClientError("settings.notifications.save", error);
      setNotice({ type: "error", message: error.message || t("notifications.saveError") });
    } finally {
      setSavingKey("");
    }
  };

  const enabledCount = notificationControls.filter((control) => preferences[control.key]).length;

  return (
    <SettingsShell title={t("settings.notifications")} activeSection="notifications">
      <div className="max-w-5xl space-y-5">
        <Notice notice={notice} />

        <DashboardPanel className="rounded-lg p-0 sm:p-0">
          <div className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-bold text-white light-dashboard:text-zinc-950">
                {t("notifications.emailControls")}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                {t("notifications.emailControlsDescription")}
              </p>
            </div>
            <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 light-dashboard:text-emerald-700">
              {enabledCount}/{notificationControls.length} {t("notifications.enabled")}
            </span>
          </div>

          <div className="grid gap-0">
            {notificationControls.map((control) => {
              const Icon = control.icon;
              const checked = Boolean(preferences[control.key]);
              const disabled = !ready || savingKey === control.key;

              return (
                <div
                  key={control.key}
                  className="settings-preference-row flex flex-col gap-3 border-b px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">
                        {t(control.titleKey)}
                      </p>
                      <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                        {t(control.descriptionKey)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="min-w-[70px] text-right text-xs font-semibold text-zinc-400 light-dashboard:text-zinc-500">
                      {savingKey === control.key
                        ? t("notifications.saving")
                        : checked
                          ? t("notifications.enabled")
                          : t("notifications.disabled")}
                    </span>
                    <NotificationToggle
                      checked={checked}
                      disabled={disabled}
                      label={t(control.titleKey)}
                      onChange={(value) => updatePreference(control.key, value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>

        <DashboardPanel className="rounded-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                <Languages size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">
                  {t("notifications.deliveryLanguage")}
                </p>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
                  {t("notifications.deliveryLanguageDescription")}
                </p>
              </div>
            </div>

            <DashboardSelect
              value={preferences.notificationLanguage}
              onChange={(event) => updatePreference("notificationLanguage", event.target.value)}
              disabled={!ready || savingKey === "notificationLanguage"}
              className="h-10 w-full rounded-lg font-semibold transition disabled:opacity-60 sm:w-[190px]"
            >
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </DashboardSelect>
          </div>
        </DashboardPanel>
      </div>
    </SettingsShell>
  );
}
