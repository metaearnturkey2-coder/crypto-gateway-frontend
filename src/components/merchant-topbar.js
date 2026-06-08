"use client";

import { useEffect, useState } from "react";
import { merchantFetch } from "@/lib/api";
import { useDashboardLanguage } from "@/lib/i18n";

export default function MerchantTopbar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [themeReady, setThemeReady] = useState(false);
  const { t } = useDashboardLanguage();

  useEffect(() => {
    const loadMerchant = async () => {
      const { body: data, ok } = await merchantFetch("/api/merchant/dashboard");

      if (!ok) {
        return;
      }

      setMerchant(data.merchant || null);
      const preference = data.merchant?.preference;
      if (preference) {
        Object.entries(preference).forEach(([key, value]) => {
          if (value !== null && value !== undefined) localStorage.setItem(key, value);
        });

        if (preference.dashboardLanguage) {
          window.dispatchEvent(new CustomEvent("dashboardLanguageChange", { detail: preference.dashboardLanguage }));
        }

        if (preference.timeZone) {
          window.dispatchEvent(new CustomEvent("dashboardTimeZoneChange", { detail: preference.timeZone }));
        }

        if (preference.dashboardTheme) {
          window.dispatchEvent(new CustomEvent("dashboardThemeChange", { detail: preference.dashboardTheme }));
        }
      }
    };

    loadMerchant();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("dashboardTheme");
      if (stored === "light") setIsDarkTheme(false);
      setThemeReady(true);
    });
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    if (isDarkTheme) {
      document.documentElement.classList.add("dark-dashboard");
      document.documentElement.classList.remove("light-dashboard");
      localStorage.setItem("dashboardTheme", "dark");
    } else {
      document.documentElement.classList.remove("dark-dashboard");
      document.documentElement.classList.add("light-dashboard");
      localStorage.setItem("dashboardTheme", "light");
    }
  }, [isDarkTheme, themeReady]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!event.target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    const onThemeChange = (event) => setIsDarkTheme(event.detail !== "light");

    window.addEventListener("click", closeOnOutside);
    window.addEventListener("dashboardThemeChange", onThemeChange);
    return () => {
      window.removeEventListener("click", closeOnOutside);
      window.removeEventListener("dashboardThemeChange", onThemeChange);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <header className="merchant-topbar relative z-50 border-b text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Crypto Gateway</h1>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{t("brand.merchantPanel")}</p>
          </div>
        </div>

        <div className="relative z-[60]" data-user-menu>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="merchant-avatar-button h-10 w-10 rounded-full border font-semibold transition"
          >
            {(merchant?.name?.[0] || merchant?.email?.[0] || "M").toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="merchant-user-menu absolute right-0 z-[100] mt-2 w-72 overflow-hidden rounded-xl border shadow-2xl">
              <div className="merchant-user-menu-header border-b px-4 py-3">
                <p className="merchant-user-menu-primary truncate text-sm font-semibold">{merchant?.email}</p>
                <p className="merchant-user-menu-muted text-xs">{t("account.merchantAccount")}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="merchant-user-menu-muted truncate text-xs">UID: {merchant?.id || "-"}</p>
                  <button
                    onClick={() => {
                      if (!merchant?.id) return;
                      navigator.clipboard.writeText(merchant.id);
                      setCopiedUid(true);
                      setTimeout(() => setCopiedUid(false), 1200);
                    }}
                    className="merchant-user-menu-copy rounded-md border px-2 py-1 text-xs transition"
                  >
                    {copiedUid ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
              </div>

              <a href="/overview" className="merchant-user-menu-action block px-4 py-3 text-sm transition">
                {t("account.overview")}
              </a>
              <a href="/settings/preference/basic-preferences" className="merchant-user-menu-action block px-4 py-3 text-sm transition">
                {t("account.settings")}
              </a>

              <button onClick={logout} className="merchant-user-menu-logout w-full px-4 py-3 text-left text-sm transition">
                {t("account.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
