"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import OverviewShell from "@/components/overview-shell";
import { useDashboardLanguage } from "@/lib/i18n";

const settingsNavItems = [
  { href: "/settings/preference", labelKey: "settings.preference" },
  { href: "/settings/security", labelKey: "settings.security" },
  { href: "/settings/business-settings", labelKey: "settings.businessSettings" },
  { href: "/settings/notifications", labelKey: "settings.notifications" },
  { href: "/settings/api", labelKey: "settings.api" },
];

const sectionTabs = {
  preference: [
    { href: "/settings/preference/basic-preferences", labelKey: "settings.tabs.basicPreferences" },
    { href: "/settings/preference/authorization", labelKey: "settings.tabs.authorization" },
    { href: "/settings/preference/active-sessions", labelKey: "settings.tabs.activeSessions" },
    { href: "/settings/preference/account", labelKey: "settings.tabs.account" },
  ],
  security: [
    { href: "/settings/security", labelKey: "settings.tabs.webhook" },
    { href: "/settings/security", labelKey: "settings.tabs.credentials" },
    { href: "/settings/security", labelKey: "settings.tabs.apiAccess" },
    { href: "/settings/security", labelKey: "settings.tabs.audit" },
  ],
  business: [
    { href: "/settings/business-settings", labelKey: "settings.tabs.profile" },
    { href: "/settings/business-settings", labelKey: "settings.tabs.settlement" },
    { href: "/settings/business-settings", labelKey: "settings.tabs.branding" },
    { href: "/settings/business-settings", labelKey: "settings.tabs.checkout" },
  ],
  notifications: [
    { href: "/settings/notifications", labelKey: "settings.tabs.paymentAlerts" },
    { href: "/settings/notifications", labelKey: "settings.tabs.webhookAlerts" },
    { href: "/settings/notifications", labelKey: "settings.tabs.email" },
    { href: "/settings/notifications", labelKey: "settings.tabs.system" },
  ],
  api: [
    { href: "/settings/api", labelKey: "settings.tabs.apiKeys" },
    { href: "/settings/api", labelKey: "settings.tabs.documentation" },
    { href: "/settings/api", labelKey: "settings.tabs.webhooks" },
    { href: "/settings/api", labelKey: "settings.tabs.usage" },
  ],
};

export default function SettingsShell({ title, activeSection, children }) {
  const pathname = usePathname();
  const tabs = sectionTabs[activeSection] || [];
  const { t } = useDashboardLanguage();

  return (
    <OverviewShell>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav className="flex min-w-0 max-w-full flex-wrap gap-2 pb-1 lg:block lg:space-y-2 lg:pb-0">
            {settingsNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`settings-sidebar-link block shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "settings-sidebar-link-active"
                      : "settings-sidebar-link-idle"
                  }`}
                >
                  {item.labelKey ? t(item.labelKey) : item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 max-w-full">
          <h2 className="text-2xl font-bold text-white light-dashboard:text-zinc-950">{title}</h2>

          {tabs.length > 0 && (
            <div className="mt-4 flex min-w-0 max-w-full flex-wrap gap-2 pb-1">
              {tabs.map((tab, index) => {
                const active = pathname === tab.href || (activeSection === "preference" && pathname.startsWith(`${tab.href}/`));
                return (
                <Link
                  key={tab.href + (tab.labelKey || tab.label)}
                  href={tab.href}
                  className={`settings-section-tab shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    active || (pathname === "/settings/preference" && index === 0)
                      ? "settings-section-tab-active"
                      : "settings-section-tab-idle"
                  }`}
                >
                  {tab.labelKey ? t(tab.labelKey) : tab.label}
                </Link>
                );
              })}
            </div>
          )}

          <div className="mt-5">{children}</div>
        </div>
      </div>
    </OverviewShell>
  );
}
