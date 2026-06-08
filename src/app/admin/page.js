"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiResponseResult, fetchApi } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { ADMIN_NAV_ITEMS, clearStoredAdminSession, verifyStoredAdminSession } from "@/components/admin-auth";

export default function AdminHomePage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [sessionState, setSessionState] = useState("checking");
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;

    queueMicrotask(async () => {
      const token = await verifyStoredAdminSession();
      if (!active) return;

      if (!token) {
        setSessionState("signed-out");
        return;
      }

      setSessionState("signed-in");
    });

    return () => {
      active = false;
    };
  }, []);

  const login = async () => {
    const email = credentials.email.trim();
    const password = credentials.password;

    if (!email || !password) {
      setNotice({ type: "error", message: "Admin e-posta ve sifre zorunludur." });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const response = await fetchApi("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const { body: data, ok } = await apiResponseResult(response);

      if (!ok || !data.accessToken) {
        clearStoredAdminSession();
        setSessionState("signed-out");
        setNotice({ type: "error", message: data.message || "Admin bilgileri gecersiz." });
        return;
      }

      localStorage.setItem("adminAccessToken", data.accessToken);
      localStorage.removeItem("adminToken");
      setAdmin(data.admin || null);
      setSessionState("signed-in");
      setCredentials({ email: "", password: "" });
      setNotice({ type: "success", message: "Admin oturumu acildi." });
    } catch (error) {
      reportClientError("admin.home.login", error);
      setNotice({ type: "error", message: "Admin login hatasi." });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      reportClientError("admin.home.logout", error);
    } finally {
      clearStoredAdminSession();
      setAdmin(null);
      setSessionState("signed-out");
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-zinc-900 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Internal console</p>
            <h1 className="mt-2 text-3xl font-bold">Admin Panel</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Tek giris noktasi, operasyon konsollari ve kritik finansal kontroller.
            </p>
          </div>
          <Link
            href="/overview"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800"
          >
            Merchant Dashboard
          </Link>
        </header>

        {sessionState !== "signed-in" && (
          <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6">
              <p className="text-sm font-semibold text-zinc-400">Admin Sign In</p>
              <h2 className="mt-2 text-2xl font-bold">Guvenli admin oturumu ac</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Alt admin sayfalari dogrulanmis oturum olmadan veri yuklemez. Giris yaptiktan sonra admin merkezinden
                ilgili operasyon ekranina gecebilirsin.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Admin e-posta"
                  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white"
                />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Admin sifre"
                  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={login}
                  disabled={loading || sessionState === "checking"}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
                >
                  {loading ? "Giris yapiliyor..." : "Giris yap"}
                </button>
              </div>
              {notice && (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
                  {notice.message}
                </div>
              )}
            </div>
            <aside className="border-t border-zinc-800 bg-black p-6 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Locked until sign in</p>
              <div className="mt-4 grid gap-3">
                {ADMIN_NAV_ITEMS.slice(0, 4).map((item) => (
                  <div key={item.href} className="rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3">
                    <p className="font-semibold text-zinc-300">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        )}

        {sessionState === "signed-in" && (
          <>
            <section className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Verified admin session</p>
                <p className="mt-1 text-sm text-emerald-100">
                  {admin?.email ? `${admin.email} ile giris yapildi.` : "Admin oturumu aktif."}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-emerald-400/30 bg-black/30 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-black/50"
              >
                Oturumu kapat
              </button>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <p className="text-lg font-bold">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{item.description}</p>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
