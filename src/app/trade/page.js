"use client";

import Link from "next/link";
import { DashboardButton, DashboardPanel } from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import { useDashboardLanguage } from "@/lib/i18n";

export default function TradePage() {
  const { t } = useDashboardLanguage();

  return (
    <OverviewShell>
      <DashboardPanel className="p-6 text-white md:p-8 light-dashboard:text-zinc-900">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-zinc-500">{t("trade.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("trade.title")}</h1>
          <p className="mt-3 text-zinc-400 light-dashboard:text-zinc-600">{t("trade.description")}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DashboardButton as={Link} variant="plain" href="/business-wallet/merchants" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800 light-dashboard:border-zinc-950 light-dashboard:bg-zinc-950 light-dashboard:text-white light-dashboard:hover:bg-black">
            {t("trade.createPayment")}
          </DashboardButton>
          <DashboardButton as={Link} variant="plain" href="/business-wallet" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800 light-dashboard:border-zinc-300 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-900 light-dashboard:hover:bg-white">
            {t("trade.viewWallet")}
          </DashboardButton>
          <DashboardButton as={Link} variant="plain" href="/business-wallet/api-docs" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800 light-dashboard:border-zinc-300 light-dashboard:bg-zinc-50 light-dashboard:text-zinc-900 light-dashboard:hover:bg-white">
            {t("trade.apiDocs")}
          </DashboardButton>
        </div>
      </DashboardPanel>
    </OverviewShell>
  );
}
