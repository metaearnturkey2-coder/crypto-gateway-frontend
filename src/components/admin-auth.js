"use client";

import Link from "next/link";
import { adminFetch, clearAdminSession, getAdminAccessToken } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";

export const ADMIN_NAV_ITEMS = [
  {
    href: "/admin/settlement-console",
    label: "Settlement konsolu",
    description: "Payout inceleme, audit kayıtları ve güvenlik olayları.",
  },
  {
    href: "/admin/treasury",
    label: "Hazine",
    description: "Sweep işlemleri ve hot wallet politikası.",
  },
  {
    href: "/admin/risk-review",
    label: "Risk inceleme",
    description: "Şüpheli aktivite ve risk olayı iş akışı.",
  },
  {
    href: "/admin/reconciliation",
    label: "Mutabakat",
    description: "Ledger ve bakiye tutarlılık kontrolleri.",
  },
  {
    href: "/admin/pilot-readiness",
    label: "Pilot hazırlığı",
    description: "Production hazırlığı ve operasyonel engeller.",
  },
  {
    href: "/admin/merchant-onboarding",
    label: "Merchant onboarding",
    description: "Merchant açılış checklist'i ve compliance durumu.",
  },
];

export const clearStoredAdminSession = () => {
  clearAdminSession();
};

export const verifyStoredAdminSession = async () => {
  const token = getAdminAccessToken();

  if (!token) {
    clearStoredAdminSession();
    return "";
  }

  try {
    const { ok } = await adminFetch("/api/admin/me", { accessToken: token });

    if (!ok) {
      clearStoredAdminSession();
      return "";
    }

    return token;
  } catch (error) {
    reportClientError("admin.session.verify", error);
    clearStoredAdminSession();
    return "";
  }
};

export function AdminAccessRequired({ title = "Admin girişi gerekli" }) {
  return (
    <main className="admin-access-page min-h-screen px-4 py-8 text-zinc-100">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <section className="admin-access-card w-full rounded-lg border p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Admin sayfaları doğrulanmış oturum aktif olana kadar kilitlidir. Merkezi admin girişinden oturum açıp
            ardından gerekli operasyon konsolunu seçin.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Admin girişine git
          </Link>
        </section>
      </div>
    </main>
  );
}

export function AdminConsoleNav({ currentPath, onRefresh, loading = false }) {
  return (
    <section className="admin-console-nav rounded-lg border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin konsolu</p>
          <p className="mt-1 text-sm text-zinc-400">Doğrulanmış oturum aktif</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
          >
            Admin ana sayfa
          </Link>
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                currentPath === item.href
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
            >
              Yenile
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
