"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export default function MerchantTopbar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

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
  }, []);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add("dark-dashboard");
      document.documentElement.classList.remove("light-dashboard");
      localStorage.setItem("dashboardTheme", "dark");
    } else {
      document.documentElement.classList.remove("dark-dashboard");
      document.documentElement.classList.add("light-dashboard");
      localStorage.setItem("dashboardTheme", "light");
    }
  }, [isDarkTheme]);

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

  return (
    <header className="relative z-50 border-b border-black bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Crypto Gateway</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-wide">Merchant Panel</p>
          </div>
        </div>

        <div className="relative z-[60]" data-user-menu>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 font-semibold hover:bg-zinc-800 transition"
          >
            {(merchant?.name?.[0] || merchant?.email?.[0] || "M").toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden z-[100]">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-semibold text-zinc-100 truncate">{merchant?.email}</p>
                <p className="text-xs text-zinc-500">Merchant account</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500 truncate">UID: {merchant?.id || "-"}</p>
                  <button
                    onClick={() => {
                      if (!merchant?.id) return;
                      navigator.clipboard.writeText(merchant.id);
                      setCopiedUid(true);
                      setTimeout(() => setCopiedUid(false), 1200);
                    }}
                    className="text-xs px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition"
                  >
                    {copiedUid ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <a href="/overview" className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900 transition">Genel Bakış</a>
              <a href="/settings/security" className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900 transition">Ayarlar</a>
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <span className="text-sm text-zinc-200">Koyu tema</span>
                <button
                  onClick={() => setIsDarkTheme((v) => !v)}
                  className={`w-12 h-7 rounded-full transition relative ${isDarkTheme ? "bg-zinc-600" : "bg-zinc-400"}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${isDarkTheme ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-900 transition">Çıkış Yap</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
