"use client";

import SettingsEmptyState from "@/components/settings-empty-state";
import SettingsShell from "@/components/settings-shell";

export default function NotificationsSettingsPage() {
  return (
    <SettingsShell title="Notifications" activeSection="notifications">
      <SettingsEmptyState />
    </SettingsShell>
  );
}
