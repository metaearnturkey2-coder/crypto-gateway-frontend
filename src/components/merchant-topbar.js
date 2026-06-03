"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

const currencyOptions = [
  { code: "USD", label: "US Dollar" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
];

export default function MerchantTopbar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [themeReady, setThemeReady] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("USD");

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
    setDisplayCurrency(localStorage.getItem("displayCurrency") || "USD");
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
    window.addEventListener("click", closeOnOutside);
    return () => window.removeEventListener("click", closeOnOutside);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const selectCurrency = (code) => {
    setDisplayCurrency(code);
    localStorage.setItem("displayCurrency", code);
    window.dispatchEvent(new CustomEvent("displayCurrencyChange", { detail: code }));
    setCurrencyMenuOpen(false);
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

              <div className="border-t border-zinc-800 px-4 py-3">
                <button
                  onClick={() => setCurrencyMenuOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 text-left text-sm text-zinc-200 transition hover:text-white"
                >
                  <span>
                    <span className="block font-medium">Para birimi</span>
                    <span className="block text-xs text-zinc-500">{displayCurrency}</span>
                  </span>
                  <span className="text-lg leading-none text-zinc-500">{currencyMenuOpen ? "‹" : "›"}</span>
                </button>

                {currencyMenuOpen && (
                  <div className="mt-3 grid gap-1">
                    {currencyOptions.map((option) => (
                      <button
                        key={option.code}
                        onClick={() => selectCurrency(option.code)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          displayCurrency === option.code
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="font-semibold">{option.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
                <span className="text-sm text-zinc-200">Koyu tema</span>
                <button
                  onClick={() => setIsDarkTheme((v) => !v)}
                  className={`relative h-7 w-12 rounded-full transition ${isDarkTheme ? "bg-zinc-600" : "bg-zinc-400"}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${isDarkTheme ? "left-6" : "left-1"}`} />
                </button>
              </div>

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
