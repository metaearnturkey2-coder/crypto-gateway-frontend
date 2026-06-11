"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardButton, DashboardInput, DashboardPanel } from "@/components/dashboard-ui";
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
          <DashboardButton
            as={Link}
            variant="adminSecondary"
            href="/overview"
            className="px-4 py-3"
          >
            Merchant Dashboard
          </DashboardButton>
        </header>

        {sessionState !== "signed-in" && (
          <DashboardPanel variant="admin" className="grid grid-cols-1 overflow-hidden p-0 sm:p-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6">
              <p className="text-sm font-semibold text-zinc-400">Admin Sign In</p>
              <h2 className="mt-2 text-2xl font-bold">Guvenli admin oturumu ac</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Alt admin sayfalari dogrulanmis oturum olmadan veri yuklemez. Giris yaptiktan sonra admin merkezinden
                ilgili operasyon ekranina gecebilirsin.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                <DashboardInput
                  type="email"
                  variant="admin"
                  value={credentials.email}
                  onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Admin e-posta"
                  className="py-3"
                />
                <DashboardInput
                  type="password"
                  variant="admin"
                  value={credentials.password}
                  onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Admin sifre"
                  className="py-3"
                />
                <DashboardButton
                  type="button"
                  variant="adminPrimary"
                  onClick={login}
                  disabled={loading || sessionState === "checking"}
                  className="px-5 py-3 disabled:opacity-40"
                >
                  {loading ? "Giris yapiliyor..." : "Giris yap"}
                </DashboardButton>
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
                  <DashboardPanel as="div" key={item.href} variant="admin" className="rounded-xl border-zinc-900 px-4 py-3 sm:p-4">
                    <p className="font-semibold text-zinc-300">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
                  </DashboardPanel>
                ))}
              </div>
            </aside>
          </DashboardPanel>
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
              <DashboardButton
                type="button"
                variant="plain"
                onClick={logout}
                className="rounded-xl border border-emerald-400/30 bg-black/30 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-black/50"
              >
                Oturumu kapat
              </DashboardButton>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ADMIN_NAV_ITEMS.map((item) => (
                <DashboardPanel
                  as={Link}
                  key={item.href}
                  href={item.href}
                  variant="admin"
                  className="p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <p className="text-lg font-bold">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{item.description}</p>
                </DashboardPanel>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
