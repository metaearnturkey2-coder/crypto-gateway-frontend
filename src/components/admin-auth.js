"use client";

import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";

export const ADMIN_NAV_ITEMS = [
  {
    href: "/admin/settlement-console",
    label: "Settlement Console",
    description: "Payout review, audit trail, and security events.",
  },
  {
    href: "/admin/treasury",
    label: "Treasury",
    description: "Sweep transactions and hot wallet policy.",
  },
  {
    href: "/admin/risk-review",
    label: "Risk Review",
    description: "Suspicious activity and risk event workflow.",
  },
  {
    href: "/admin/reconciliation",
    label: "Reconciliation",
    description: "Ledger and balance consistency checks.",
  },
  {
    href: "/admin/pilot-readiness",
    label: "Pilot Readiness",
    description: "Production readiness and operational blockers.",
  },
  {
    href: "/admin/merchant-onboarding",
    label: "Merchant Onboarding",
    description: "Merchant launch checklist and compliance status.",
  },
];

export const clearStoredAdminSession = () => {
  localStorage.removeItem("adminAccessToken");
  localStorage.removeItem("adminToken");
};

export const verifyStoredAdminSession = async () => {
  const token = localStorage.getItem("adminAccessToken") || "";

  if (!token) {
    clearStoredAdminSession();
    return "";
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
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

export function AdminAccessRequired({ title = "Admin access required" }) {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Internal console</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Admin pages are locked until a verified admin session is active. Sign in from the central admin entry point,
            then choose the operational console you need.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Go to Admin Sign In
          </Link>
        </section>
      </div>
    </main>
  );
}

export function AdminConsoleNav({ currentPath, onRefresh, loading = false }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin console</p>
          <p className="mt-1 text-sm text-zinc-400">Verified session active</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
          >
            Admin Home
          </Link>
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
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
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
