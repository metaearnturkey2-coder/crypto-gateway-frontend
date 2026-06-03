"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import OverviewShell from "@/components/overview-shell";

const settingsNavItems = [
  { href: "/settings/preference", label: "Preference" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/business-settings", label: "Business settings" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/api", label: "API" },
];

const sectionTabs = {
  preference: [
    { href: "/settings/preference/basic-preferences", label: "Basic preferences" },
    { href: "/settings/preference/authorization", label: "Authorization" },
    { href: "/settings/preference/active-sessions", label: "Active sessions" },
    { href: "/settings/preference/account", label: "Account" },
  ],
  security: [
    { href: "/settings/security", label: "Webhook" },
    { href: "/settings/security", label: "Credentials" },
    { href: "/settings/security", label: "API access" },
    { href: "/settings/security", label: "Audit" },
  ],
  business: [
    { href: "/settings/business-settings", label: "Profile" },
    { href: "/settings/business-settings", label: "Settlement" },
    { href: "/settings/business-settings", label: "Branding" },
    { href: "/settings/business-settings", label: "Checkout" },
  ],
  notifications: [
    { href: "/settings/notifications", label: "Payment alerts" },
    { href: "/settings/notifications", label: "Webhook alerts" },
    { href: "/settings/notifications", label: "Email" },
    { href: "/settings/notifications", label: "System" },
  ],
  api: [
    { href: "/settings/api", label: "API keys" },
    { href: "/settings/api", label: "Documentation" },
    { href: "/settings/api", label: "Webhooks" },
    { href: "/settings/api", label: "Usage" },
  ],
};

export default function SettingsShell({ title, activeSection, children }) {
  const pathname = usePathname();
  const tabs = sectionTabs[activeSection] || [];

  return (
    <OverviewShell>
      <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {settingsNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-zinc-900 text-white light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white light-dashboard:text-zinc-600 light-dashboard:hover:bg-zinc-100 light-dashboard:hover:text-zinc-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-white light-dashboard:text-zinc-950">{title}</h2>

          {tabs.length > 0 && (
            <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
              {tabs.map((tab, index) => {
                const active = pathname === tab.href || (activeSection === "preference" && pathname.startsWith(`${tab.href}/`));
                return (
                <Link
                  key={tab.href + tab.label}
                  href={tab.href}
                  className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    active || (pathname === "/settings/preference" && index === 0)
                      ? "border-zinc-500 bg-zinc-900 text-white light-dashboard:border-zinc-950 light-dashboard:bg-white light-dashboard:text-zinc-950"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900 light-dashboard:border-zinc-200 light-dashboard:text-zinc-900 light-dashboard:hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                </Link>
                );
              })}
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </OverviewShell>
  );
}
