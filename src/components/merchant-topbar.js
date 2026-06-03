"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export default function MerchantTopbar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(apiUrl("/api/merchant/dashboard"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMerchant(data.merchant || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("dashboardTheme");
    if (stored === "light") setIsDarkTheme(false);
    setThemeReady(true);
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
    <header className="relative z-50 border-b border-black bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Crypto Gateway</h1>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Merchant Panel</p>
          </div>
        </div>

        <div className="relative z-[60]" data-user-menu>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 font-semibold text-zinc-100 transition hover:bg-zinc-800"
          >
            {(merchant?.name?.[0] || merchant?.email?.[0] || "M").toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 z-[100] mt-2 w-72 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="border-b border-zinc-800 px-4 py-3">
                <p className="truncate text-sm font-semibold text-zinc-100">{merchant?.email}</p>
                <p className="text-xs text-zinc-500">Merchant account</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-zinc-500">UID: {merchant?.id || "-"}</p>
                  <button
                    onClick={() => {
                      if (!merchant?.id) return;
                      navigator.clipboard.writeText(merchant.id);
                      setCopiedUid(true);
                      setTimeout(() => setCopiedUid(false), 1200);
                    }}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-800"
                  >
                    {copiedUid ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <a href="/overview" className="block px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-900">
                Genel Bakış
              </a>
              <a href="/settings" className="block px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-900">
                Ayarlar
              </a>

              <button onClick={logout} className="w-full px-4 py-3 text-left text-sm text-red-400 transition hover:bg-zinc-900">
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
