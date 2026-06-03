"use client";

import SettingsEmptyState from "@/components/settings-empty-state";
import SettingsShell from "@/components/settings-shell";

export default function PreferenceAccountPage() {
  return (
    <SettingsShell title="Preference" activeSection="preference">
      <SettingsEmptyState />
    </SettingsShell>
  );
}
