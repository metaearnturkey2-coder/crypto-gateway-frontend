"use client";

import SettingsEmptyState from "@/components/settings-empty-state";
import SettingsShell from "@/components/settings-shell";
import { useDashboardLanguage } from "@/lib/i18n";

export default function BusinessSettingsPage() {
  const { t } = useDashboardLanguage();

  return (
    <SettingsShell title={t("settings.businessSettings")} activeSection="business">
      <SettingsEmptyState />
    </SettingsShell>
  );
}
