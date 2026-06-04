"use client";

import { Bell, Clock, DollarSign, Globe2, MapPinned, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import SettingsShell from "@/components/settings-shell";
import { apiUrl } from "@/lib/api";
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
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/merchant/preferences"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
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
  }, []);

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
    const token = localStorage.getItem("token");
    if (!token) return;

    setPreferences((current) => ({ ...current, [key]: value }));
    applyPreferenceSideEffects(key, value);
    setSavingKey(key);
    setNotice(null);

    try {
      const response = await fetch(apiUrl("/api/merchant/preferences"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await response.json();

      if (!response.ok) {
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
        <div className="mb-4 max-w-3xl rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 light-dashboard:text-red-700">
          {notice.message}
        </div>
      )}
      <div className="max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 light-dashboard:border-zinc-200 light-dashboard:bg-white">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="flex flex-col items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 last:border-b-0 light-dashboard:border-zinc-200 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t(row.labelKey)}</p>
              </div>
              <select
                value={preferences[row.key]}
                onChange={(event) => updatePreference(row.key, event.target.value)}
                disabled={!ready || savingKey === row.key}
                className="h-9 w-full rounded-xl border border-zinc-700/80 bg-zinc-800/60 px-3 text-sm font-semibold text-white outline-none transition hover:border-zinc-500 hover:bg-zinc-800 focus:border-zinc-400 disabled:opacity-60 light-dashboard:border-zinc-300 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-950 light-dashboard:hover:border-zinc-400 light-dashboard:hover:bg-white light-dashboard:focus:border-zinc-500 sm:w-[168px]"
              >
                {row.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        <div className="flex flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
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
              className={`relative h-7 w-12 rounded-full transition disabled:opacity-60 ${
                darkThemeEnabled ? "bg-zinc-600" : "bg-zinc-300"
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
      </div>
    </SettingsShell>
  );
}
