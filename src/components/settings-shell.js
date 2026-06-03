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
  preference: ["Basic preferences", "Authorization", "Active sessions", "Account"],
  security: ["Webhook", "Credentials", "API access", "Audit"],
  business: ["Profile", "Settlement", "Branding", "Checkout"],
  notifications: ["Payment alerts", "Webhook alerts", "Email", "System"],
  api: ["API keys", "Documentation", "Webhooks", "Usage"],
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
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    index === 0
                      ? "border-zinc-100 bg-zinc-100 text-zinc-950 light-dashboard:border-zinc-950 light-dashboard:bg-white"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900 light-dashboard:border-zinc-200 light-dashboard:text-zinc-900 light-dashboard:hover:bg-zinc-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </OverviewShell>
  );
}
