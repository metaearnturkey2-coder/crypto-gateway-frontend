"use client";

import SettingsEmptyState from "@/components/settings-empty-state";
import SettingsShell from "@/components/settings-shell";

export default function BusinessSettingsPage() {
  return (
    <SettingsShell title="Business settings" activeSection="business">
      <SettingsEmptyState />
    </SettingsShell>
  );
}
