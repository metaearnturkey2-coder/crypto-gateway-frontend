"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  Landmark,
  LockKeyhole,
  LogIn,
  LogOut,
  Radar,
  ReceiptText,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardButton, DashboardInput, DashboardPanel } from "@/components/dashboard-ui";
import { apiResponseResult, fetchApi } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { ADMIN_NAV_ITEMS, clearStoredAdminSession, verifyStoredAdminSession } from "@/components/admin-auth";

const adminIconByHref = {
  "/admin/settlement-console": ReceiptText,
  "/admin/treasury": Landmark,
  "/admin/risk-review": Radar,
  "/admin/reconciliation": ClipboardCheck,
  "/admin/pilot-readiness": BadgeCheck,
  "/admin/merchant-onboarding": UserCheck,
};

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

  const login = async (event) => {
    event?.preventDefault();
    const email = credentials.email.trim();
    const password = credentials.password;

    if (!email || !password) {
      setNotice({ type: "error", message: "Admin e-posta ve şifre zorunludur." });
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
        setNotice({ type: "error", message: data.message || "Admin bilgileri geçersiz." });
        return;
      }

      localStorage.setItem("adminAccessToken", data.accessToken);
      localStorage.removeItem("adminToken");
      setAdmin(data.admin || null);
      setSessionState("signed-in");
      setCredentials({ email: "", password: "" });
      setNotice({ type: "success", message: "Admin oturumu açıldı." });
    } catch (error) {
      reportClientError("admin.home.login", error);
      setNotice({ type: "error", message: "Admin giriş hatası." });
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
    <main className="admin-home-page min-h-screen px-4 py-6 text-zinc-100 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="admin-home-header flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-[28px]">Admin Panel</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 light-dashboard:text-zinc-600">
              Tek giriş noktası, operasyon konsolları ve kritik finansal kontroller.
            </p>
          </div>
          <DashboardButton
            as={Link}
            variant="adminSecondary"
            href="/overview"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 sm:w-fit"
          >
            <ArrowLeft size={16} strokeWidth={2.2} />
            Merchant paneli
          </DashboardButton>
        </header>

        {sessionState !== "signed-in" && (
          <DashboardPanel variant="admin" className="admin-login-panel grid grid-cols-1 overflow-hidden rounded-lg p-0 sm:p-0 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="admin-home-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <LockKeyhole size={18} strokeWidth={2.3} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-400 light-dashboard:text-zinc-600">Admin girişi</p>
                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">Güvenli admin oturumu aç</h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500 light-dashboard:text-zinc-600">
                Alt admin sayfaları doğrulanmış oturum olmadan veri yüklemez. Girişten sonra ilgili operasyon ekranına
                admin merkezinden geçebilirsiniz.
              </p>

              <form onSubmit={login} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px]">
                <DashboardInput
                  type="email"
                  variant="admin"
                  value={credentials.email}
                  onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Admin e-posta"
                  className="h-11 rounded-lg"
                  autoComplete="email"
                />
                <DashboardInput
                  type="password"
                  variant="admin"
                  value={credentials.password}
                  onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Admin şifre"
                  className="h-11 rounded-lg"
                  autoComplete="current-password"
                />
                <DashboardButton
                  type="submit"
                  variant="adminPrimary"
                  disabled={loading || sessionState === "checking"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 disabled:opacity-40"
                >
                  <LogIn size={16} strokeWidth={2.2} />
                  {loading ? "Giriş yapılıyor..." : "Giriş yap"}
                </DashboardButton>
              </form>
              {notice && (
                <div className={`admin-home-notice mt-4 rounded-lg border px-4 py-3 text-sm ${notice.type === "error" ? "admin-home-notice-error" : "admin-home-notice-success"}`}>
                  {notice.message}
                </div>
              )}
              {sessionState === "checking" && (
                <p className="mt-4 text-xs font-semibold text-zinc-500 light-dashboard:text-zinc-600">Oturum doğrulanıyor...</p>
              )}
            </div>
            <aside className="admin-locked-panel border-t p-5 sm:p-6 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Oturum sonrası açılır</p>
              <div className="mt-4 grid gap-3">
                {ADMIN_NAV_ITEMS.slice(0, 4).map((item) => (
                  <div key={item.href} className="admin-locked-row rounded-lg border px-3 py-3">
                    <p className="text-sm font-semibold text-zinc-300 light-dashboard:text-zinc-900">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </DashboardPanel>
        )}

        {sessionState === "signed-in" && (
          <>
            <section className="admin-session-banner flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <ShieldCheck size={15} strokeWidth={2.3} />
                  Doğrulanmış admin oturumu
                </p>
                <p className="mt-1 text-sm">
                  {admin?.email ? `${admin.email} ile giriş yapıldı.` : "Admin oturumu aktif."}
                </p>
              </div>
              <DashboardButton
                type="button"
                variant="plain"
                onClick={logout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold"
              >
                <LogOut size={16} strokeWidth={2.2} />
                Oturumu kapat
              </DashboardButton>
            </section>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = adminIconByHref[item.href] || Activity;
                return (
                  <DashboardPanel
                    as={Link}
                    key={item.href}
                    href={item.href}
                    variant="admin"
                    className="admin-console-card rounded-lg p-4 transition"
                  >
                    <span className="admin-home-icon mb-4 flex h-10 w-10 items-center justify-center rounded-lg border">
                      <Icon size={18} strokeWidth={2.3} />
                    </span>
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-base font-bold">{item.label}</span>
                        <span className="mt-2 block text-sm leading-6 text-zinc-500 light-dashboard:text-zinc-600">{item.description}</span>
                      </span>
                      <ArrowUpRight size={17} strokeWidth={2.2} className="mt-0.5 shrink-0 opacity-70" />
                    </span>
                  </DashboardPanel>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
