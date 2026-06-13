"use client";

import { useCallback, useEffect, useState } from "react";
import { englishTranslations } from "./i18n/translations-en";
import { turkishTranslations } from "./i18n/translations-tr";

export const languageStorageKey = "dashboardLanguage";
export const timeZoneStorageKey = "timeZone";
export const turkishLanguageLabel = "Türkçe";

export const translations = {
  English: englishTranslations,
  [turkishLanguageLabel]: turkishTranslations,
};

const legacyLanguageAliases = {
  "TÃ¼rkÃ§e": turkishLanguageLabel,
  Turkish: turkishLanguageLabel,
};

export const normalizeDashboardLanguage = (language) => {
  const value = String(language || "").trim();
  const normalized = legacyLanguageAliases[value] || value;

  return translations[normalized] ? normalized : "English";
};

export const getTranslation = (language, key) =>
  translations[normalizeDashboardLanguage(language)]?.[key] || translations.English[key] || key;

export const formatDashboardDateTime = (value, timeZone = "Europe/Istanbul") => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export const formatDashboardTime = (value, timeZone = "Europe/Istanbul") => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
};

export function useDashboardTimeZone() {
  const [timeZone, setTimeZone] = useState("Europe/Istanbul");

  useEffect(() => {
    const updateTimeZone = (value) => {
      if (value) setTimeZone(value);
    };

    updateTimeZone(localStorage.getItem(timeZoneStorageKey) || "Europe/Istanbul");

    const onTimeZoneChange = (event) => updateTimeZone(event.detail);
    const onStorage = (event) => {
      if (event.key === timeZoneStorageKey) updateTimeZone(event.newValue || "Europe/Istanbul");
    };

    window.addEventListener("dashboardTimeZoneChange", onTimeZoneChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("dashboardTimeZoneChange", onTimeZoneChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return timeZone;
}

export function useDashboardLanguage() {
  const [language, setLanguage] = useState("English");
  const t = useCallback((key) => getTranslation(language, key), [language]);

  useEffect(() => {
    const updateLanguage = (value) => {
      const normalizedLanguage = normalizeDashboardLanguage(value);
      setLanguage(normalizedLanguage);

      if (value && value !== normalizedLanguage) {
        localStorage.setItem(languageStorageKey, normalizedLanguage);
      }
    };

    updateLanguage(localStorage.getItem(languageStorageKey) || "English");

    const onLanguageChange = (event) => updateLanguage(event.detail);
    const onStorage = (event) => {
      if (event.key === languageStorageKey) updateLanguage(event.newValue || "English");
    };

    window.addEventListener("dashboardLanguageChange", onLanguageChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("dashboardLanguageChange", onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return {
    language,
    t,
  };
}
