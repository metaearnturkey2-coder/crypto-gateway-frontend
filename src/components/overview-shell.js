"use client";

import Link from "next/link";
import { BadgeCheck, BarChart3, ChevronDown, Code2, CreditCard, ListChecks } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MerchantTopbar from "@/components/merchant-topbar";
import { useDashboardLanguage } from "@/lib/i18n";

const navItems = [
  { href: "/overview", labelKey: "nav.overview" },
  { href: "/business", labelKey: "nav.business" },
  { href: "/trade", labelKey: "nav.trade" },
  { href: "/history", labelKey: "nav.history" },
  { href: "/settings/preference/basic-preferences", labelKey: "nav.settings" },
];

const businessMenuItems = [
  {
    href: "/business-wallet",
    labelKey: "nav.businessOverview",
    descriptionKey: "nav.businessOverviewDescription",
    icon: BarChart3,
  },
  {
    href: "/business-wallet/merchants",
    labelKey: "nav.merchantPayments",
    descriptionKey: "nav.merchantPaymentsDescription",
    icon: CreditCard,
  },
  {
    href: "/business-wallet/onboarding",
    labelKey: "nav.merchantOnboarding",
    descriptionKey: "nav.merchantOnboardingDescription",
    icon: BadgeCheck,
  },
  {
    href: "/business-wallet/ledger",
    labelKey: "nav.ledger",
    descriptionKey: "nav.ledgerDescription",
    icon: ListChecks,
  },
  {
    href: "/business-wallet/api-docs",
    labelKey: "nav.apiDocs",
    descriptionKey: "nav.apiDocsDescription",
    icon: Code2,
  },
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

      <nav className="dashboard-main-nav relative z-40 border-b">
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
                      className={`dashboard-main-nav-link relative rounded-lg px-3 py-2 text-sm font-semibold transition md:px-4 md:text-base ${
                        active ? "dashboard-main-nav-link-active" : "dashboard-main-nav-link-idle"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {t(item.labelKey)}
                        <ChevronDown
                          size={15}
                          strokeWidth={2.4}
                          className={`transition-transform ${businessOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>

                    {businessOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="business-dropdown-menu absolute left-0 top-full z-[100] mt-2 w-[330px] overflow-hidden rounded-xl border p-2 shadow-xl"
                      >
                        {businessMenuItems.map((menuItem) => {
                          const Icon = menuItem.icon;
                          return (
                            <Link
                              key={menuItem.href}
                              href={menuItem.href}
                              className="business-dropdown-item flex gap-3 rounded-lg px-3 py-3 transition"
                            >
                              <span className="business-dropdown-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                                <Icon size={18} strokeWidth={2.2} />
                              </span>
                              <span className="min-w-0">
                                <span className="business-dropdown-title block text-sm font-bold">
                                  {t(menuItem.labelKey)}
                                </span>
                                <span className="business-dropdown-description mt-0.5 block text-xs leading-5">
                                  {t(menuItem.descriptionKey)}
                                </span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const active =
                item.href.startsWith("/settings")
                  ? pathname.startsWith("/settings")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dashboard-main-nav-link relative shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition md:px-4 md:text-base ${
                    active ? "dashboard-main-nav-link-active" : "dashboard-main-nav-link-idle"
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
