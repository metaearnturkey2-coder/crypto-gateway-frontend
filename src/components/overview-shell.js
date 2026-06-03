"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MerchantTopbar from "@/components/merchant-topbar";
import { useDashboardLanguage } from "@/lib/i18n";

const navItems = [
  { href: "/overview", labelKey: "nav.overview" },
  { href: "/business", labelKey: "nav.business" },
  { href: "/trade", labelKey: "nav.trade" },
  { href: "/history", labelKey: "nav.history" },
  { href: "/settings/security", labelKey: "nav.settings" },
];

export default function OverviewShell({ children }) {
  const pathname = usePathname();
  const [businessOpen, setBusinessOpen] = useState(false);
  const { t } = useDashboardLanguage();

  useEffect(() => {
    const close = () => setBusinessOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark-dashboard");
      document.documentElement.classList.remove("light-dashboard");
    };
  }, []);

  return (
    <main className="dashboard-shell min-h-screen bg-zinc-100 text-zinc-900">
      <MerchantTopbar />

      <nav className="relative z-40 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 md:gap-4 lg:overflow-visible">
            {navItems.map((item) => {
              if (item.href === "/business") {
                const active = pathname.startsWith("/business");
                return (
                  <div key={item.href} className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBusinessOpen((v) => !v);
                      }}
                      className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition md:px-4 md:text-base ${
                        active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      {t(item.labelKey)}
                    </button>

                    {businessOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 z-[100] mt-2 w-[280px] rounded-xl border border-zinc-200 bg-white shadow-xl p-2 space-y-1"
                      >
                        <Link href="/business-wallet" className="block rounded-lg px-4 py-3 hover:bg-zinc-100">
                          <p className="text-sm font-semibold">{t("nav.businessOverview")}</p>
                        </Link>
                        <Link href="/business-wallet/merchants" className="block rounded-lg px-4 py-3 hover:bg-zinc-100">
                          <p className="text-sm font-semibold">{t("nav.merchantPayments")}</p>
                        </Link>
                        <Link href="/business-wallet/api-docs" className="block rounded-lg px-4 py-3 hover:bg-zinc-100">
                          <p className="text-sm font-semibold">{t("nav.apiDocs")}</p>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }
              const active =
                item.href === "/settings/security"
                  ? pathname.startsWith("/settings")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition md:px-4 md:text-base ${
                    active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</section>
    </main>
  );
}
