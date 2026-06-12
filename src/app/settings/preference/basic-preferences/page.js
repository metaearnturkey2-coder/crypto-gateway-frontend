"use client";

import { Bell, Clock, DollarSign, Globe2, MapPinned, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardPanel, DashboardSelect } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { useDashboardLanguage } from "@/lib/i18n";

const preferenceDefaults = {
  displayCurrency: "USD",
  dashboardLanguage: "English",
  notificationLanguage: "English",
  countryRegion: "Türkiye",
  timeZone: "Europe/Istanbul",
  dashboardTheme: "dark",
};

const preferenceRows = [
  {
    key: "displayCurrency",
    labelKey: "preferences.currency",
    icon: DollarSign,
    options: ["USD", "TRY", "EUR", "GBP"],
  },
  {
    key: "dashboardLanguage",
    labelKey: "preferences.language",
    icon: Globe2,
    options: ["English", "Türkçe"],
  },
  {
    key: "notificationLanguage",
    labelKey: "preferences.notificationLanguage",
    icon: Bell,
    options: ["English", "Türkçe"],
  },
  {
    key: "countryRegion",
    labelKey: "preferences.countryRegion",
    icon: MapPinned,
    options: ["Türkiye", "United States", "United Kingdom", "Germany"],
  },
  {
    key: "timeZone",
    labelKey: "preferences.timeZone",
    icon: Clock,
    options: ["Europe/Istanbul", "Europe/London", "Europe/Berlin", "America/New_York"],
  },
];

export default function BasicPreferencesPage() {
  const [preferences, setPreferences] = useState(preferenceDefaults);
  const [options, setOptions] = useState(null);
  const [ready, setReady] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [notice, setNotice] = useState(null);
  const { t } = useDashboardLanguage();

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { body: data, ok } = await merchantFetch("/api/merchant/preferences");

        if (!ok) {
          setNotice({ type: "error", message: data.message || data.errors?.join(" ") || t("preferences.loadError") });
          return;
        }

        const loadedPreferences = {
          ...preferenceDefaults,
          ...(data.preference || {}),
        };
        setPreferences(loadedPreferences);
        setOptions(data.options || null);

        Object.entries(loadedPreferences).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        window.dispatchEvent(new CustomEvent("dashboardLanguageChange", { detail: loadedPreferences.dashboardLanguage }));
      } catch {
        setNotice({ type: "error", message: t("preferences.loadError") });
      } finally {
        setReady(true);
      }
    };

    loadPreferences();
  }, [t]);

  const applyPreferenceSideEffects = (key, value) => {
    localStorage.setItem(key, value);

    if (key === "displayCurrency") {
      window.dispatchEvent(new CustomEvent("displayCurrencyChange", { detail: value }));
    }

    if (key === "dashboardLanguage") {
      window.dispatchEvent(new CustomEvent("dashboardLanguageChange", { detail: value }));
    }

    if (key === "timeZone") {
      window.dispatchEvent(new CustomEvent("dashboardTimeZoneChange", { detail: value }));
    }

    if (key === "dashboardTheme") {
      if (value === "dark") {
        document.documentElement.classList.add("dark-dashboard");
        document.documentElement.classList.remove("light-dashboard");
      } else {
        document.documentElement.classList.remove("dark-dashboard");
        document.documentElement.classList.add("light-dashboard");
      }
      window.dispatchEvent(new CustomEvent("dashboardThemeChange", { detail: value }));
    }
  };

  const updatePreference = async (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    applyPreferenceSideEffects(key, value);
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
        throw new Error(data.errors?.join(" ") || data.message || t("preferences.saveError"));
      }

      const savedPreferences = {
        ...preferenceDefaults,
        ...(data.preference || {}),
      };
      setPreferences(savedPreferences);
      Object.entries(savedPreferences).forEach(([preferenceKey, preferenceValue]) => {
        localStorage.setItem(preferenceKey, preferenceValue);
      });
    } catch (error) {
      setNotice({ type: "error", message: error.message || t("preferences.saveError") });
    } finally {
      setSavingKey("");
    }
  };

  const darkThemeEnabled = preferences.dashboardTheme !== "light";
  const rows = preferenceRows.map((row) => ({
    ...row,
    options: options?.[row.key] || row.options,
  }));

  return (
    <SettingsShell title={t("settings.preference")} activeSection="preference">
      {notice && (
        <div className="mb-4 max-w-3xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 light-dashboard:text-red-700">
          {notice.message}
        </div>
      )}
      <DashboardPanel as="div" className="max-w-3xl overflow-hidden rounded-lg p-0 sm:p-0">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="settings-preference-row flex flex-col items-start justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="settings-preference-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t(row.labelKey)}</p>
              </div>
              <DashboardSelect
                value={preferences[row.key]}
                onChange={(event) => updatePreference(row.key, event.target.value)}
                disabled={!ready || savingKey === row.key}
                className="h-10 w-full rounded-lg font-semibold transition disabled:opacity-60 sm:w-[190px]"
              >
                {row.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </DashboardSelect>
            </div>
          );
        })}

        <div className="settings-preference-row flex flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="settings-preference-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
              <Moon size={17} strokeWidth={2.2} />
            </span>
            <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("preferences.darkTheme")}</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="min-w-[34px] text-right text-xs font-semibold text-zinc-400 light-dashboard:text-zinc-500">
              {darkThemeEnabled ? t("preferences.themeOn") : t("preferences.themeOff")}
            </span>
            <button
              type="button"
              onClick={() => updatePreference("dashboardTheme", darkThemeEnabled ? "light" : "dark")}
              disabled={!ready || savingKey === "dashboardTheme"}
              className={`settings-theme-toggle relative h-7 w-12 rounded-full transition disabled:opacity-60 ${
                darkThemeEnabled ? "settings-theme-toggle-on" : "settings-theme-toggle-off"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  darkThemeEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </DashboardPanel>
    </SettingsShell>
  );
}
