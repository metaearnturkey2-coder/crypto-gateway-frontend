"use client";

import SettingsEmptyState from "@/components/settings-empty-state";
import SettingsShell from "@/components/settings-shell";

export default function ApiSettingsPage() {
  return (
    <SettingsShell title="API" activeSection="api">
      <SettingsEmptyState />
    </SettingsShell>
  );
}
