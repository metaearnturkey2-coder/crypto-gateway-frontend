"use client";

import { CheckCircle2, Copy, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardButton, DashboardPanel } from "@/components/dashboard-ui";
import SettingsShell from "@/components/settings-shell";
import { merchantFetch } from "@/lib/api";
import { formatDashboardDateTime, useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";

export default function PreferenceAccountPage() {
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const { body: data, ok } = await merchantFetch("/api/merchant/dashboard");

        if (!ok) {
          setNotice({ type: "error", message: data.message || t("account.loadError") });
          return;
        }

        setMerchant(data.merchant || null);
      } catch {
        setNotice({ type: "error", message: t("account.loadError") });
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [t]);

  const copyUid = async () => {
    if (!merchant?.id) return;
    await navigator.clipboard.writeText(merchant.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 1200);
  };

  const getInitial = () => (merchant?.email || merchant?.name || "M").slice(0, 1).toUpperCase();

  const shortenUid = (value = "") => {
    if (!value) return "-";
    if (value.length <= 16) return value;
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  };

  const profileItems = [
    {
      label: t("account.merchantName"),
      value: merchant?.name || "-",
      icon: UserRound,
    },
    {
      label: t("account.dashboardAccess"),
      value: t("account.enabled"),
      icon: KeyRound,
    },
    {
      label: t("account.accountType"),
      value: t("account.authenticatedDashboard"),
      icon: ShieldCheck,
    },
    {
      label: t("account.webhookStatus"),
      value: merchant?.callbackUrl ? t("account.configured") : t("account.notConfigured"),
      icon: CheckCircle2,
    },
  ];

  return (
    <SettingsShell title={t("settings.preference")} activeSection="preference">
      {notice && (
        <div className="mb-4 max-w-3xl rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 light-dashboard:text-red-700">
          {notice.message}
        </div>
      )}

      <DashboardPanel className="max-w-3xl overflow-hidden p-0 sm:p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <div className="h-14 animate-pulse rounded-xl bg-zinc-800/70 light-dashboard:bg-zinc-100" />
            <div className="h-14 animate-pulse rounded-xl bg-zinc-800/50 light-dashboard:bg-zinc-100" />
            <div className="h-14 animate-pulse rounded-xl bg-zinc-800/40 light-dashboard:bg-zinc-100" />
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-5 light-dashboard:border-zinc-200 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-white light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
                  {getInitial()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-white light-dashboard:text-zinc-950">
                    {merchant?.email || "-"}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400 light-dashboard:text-zinc-500">
                    <span>{t("account.uid")} · {shortenUid(merchant?.id)}</span>
                    <DashboardButton
                      type="button"
                      variant="secondary"
                      onClick={copyUid}
                      disabled={!merchant?.id}
                      className="inline-flex h-6 items-center justify-center rounded-md px-2 text-xs disabled:opacity-50"
                    >
                      <Copy size={13} />
                    </DashboardButton>
                    {copiedUid ? (
                      <span className="text-xs font-semibold text-emerald-300 light-dashboard:text-emerald-700">
                        {t("account.uidCopied")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <DashboardButton
                type="button"
                variant="secondary"
                onClick={copyUid}
                disabled={!merchant?.id}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-50"
              >
                <Copy size={16} />
                {copiedUid ? t("account.uidCopied") : t("account.copyUid")}
              </DashboardButton>
            </div>

            <div className="grid gap-0 divide-y divide-zinc-800 light-dashboard:divide-zinc-200 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y divide-zinc-800 light-dashboard:divide-zinc-200">
                {profileItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
                          <Icon size={18} strokeWidth={2.2} />
                        </span>
                        <p className="font-semibold text-white light-dashboard:text-zinc-950">{item.label}</p>
                      </div>
                      <p className="min-w-0 break-words text-right text-sm font-semibold text-zinc-300 light-dashboard:text-zinc-700">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="divide-y divide-zinc-800 light-dashboard:divide-zinc-200">
                {profileItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-950">
                          <Icon size={18} strokeWidth={2.2} />
                        </span>
                        <p className="font-semibold text-white light-dashboard:text-zinc-950">{item.label}</p>
                      </div>
                      <p className="min-w-0 break-words text-right text-sm font-semibold text-zinc-300 light-dashboard:text-zinc-700">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-800 px-5 py-4 light-dashboard:border-zinc-200">
              <p className="text-sm font-semibold text-zinc-400 light-dashboard:text-zinc-500">{t("account.createdAt")}</p>
              <p className="text-right text-sm font-semibold text-zinc-200 light-dashboard:text-zinc-700">
                {formatDashboardDateTime(merchant?.createdAt, timeZone)}
              </p>
            </div>
          </div>
        )}
      </DashboardPanel>
    </SettingsShell>
  );
}
