"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardInput,
  DashboardMetric,
  DashboardPanel,
  DashboardPill,
} from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";
import {
  formatPilotCode,
  formatPilotDateTime,
  formatPilotStatus,
  getPilotAction,
  getPilotDecision,
  getPilotEvidence,
  getPilotOperatorSummary,
  getPilotStatusClassName,
  sortPilotItemsByPriority,
  summarizePilotDetails,
} from "@/features/admin-pilot/ui";

const getMerchantCheckMessage = (check) => {
  const status = check?.status;

  if (check?.code === "KYB_APPROVED") {
    return status === "PASS" ? "Merchant KYB onayı tamam." : "Pilot go-live öncesi merchant KYB onayı tamamlanmalı.";
  }

  if (check?.code === "LEGAL_DOCUMENTS_ACCEPTED") {
    return status === "PASS" ? "Güncel legal dokümanlar kabul edilmiş." : "Merchant güncel legal dokümanları kabul etmeli.";
  }

  if (check?.code === "ACTIVE_API_KEY") {
    return status === "PASS" ? "Merchant için aktif API anahtarı mevcut." : "Merchant için aktif API anahtarı gerekli.";
  }

  if (check?.code === "WEBHOOK_CONFIGURED") {
    return status === "PASS" ? "Webhook URL tanımlı ve başarılı teslimat var." : "Webhook URL tanımlanıp başarılı teslimatla test edilmeli.";
  }

  if (check?.code === "PAYOUT_ADDRESS_READY") {
    return status === "PASS" ? "Aktif payout whitelist adresi mevcut." : "Payout öncesi aktif whitelist adresi önerilir.";
  }

  if (check?.code === "RISK_EVENTS_REVIEWED") {
    return status === "PASS" ? "Açık risk olayı yok." : "Pilot go-live öncesi açık risk olayları incelenmeli.";
  }

  if (check?.code === "BALANCE_RECONCILED") {
    return status === "PASS" ? "Merchant bakiyesi ledger ile eşleşiyor." : "Merchant bakiyesi ledger ile eşleşmiyor; finans incelemesi gerekli.";
  }

  if (check?.code === "SANDBOX_PAYMENT_TESTED") {
    return status === "PASS" ? "En az bir sandbox ödeme akışı tamamlanmış." : "Live trafik öncesi sandbox ödeme testi önerilir.";
  }

  return check?.message || "Kontrol sonucu incelenmeli.";
};

export default function AdminMerchantOnboardingPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [merchantId, setMerchantId] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [summary, setSummary] = useState({ blocked: 0, ready: 0, review_required: 0, total: 0 });

  const loadChecklists = useCallback(
    async (accessTokenOverride) => {
      const token = accessTokenOverride || adminAccessToken;
      if (!token) return;

      const params = new URLSearchParams();
      if (merchantId.trim()) params.set("merchantId", merchantId.trim());
      if (!merchantId.trim()) {
        params.set("limit", String(limit));
        params.set("onlyBlocked", String(onlyBlocked));
      }

      setLoading(true);
      setNotice(null);
      try {
        const response = await adminFetch(`/api/admin/pilot/merchant-onboarding?${params.toString()}`, {
          accessToken: token,
        });
        const data = response.body;

        if (!response.ok) {
          setNotice({ type: "error", message: data.message || "Merchant onboarding checklist'i yüklenemedi." });
          return;
        }

        const nextChecklists = data.checklist ? [data.checklist] : data.checklists || [];
        setChecklists(nextChecklists);
        setSummary(data.summary || {
          blocked: nextChecklists.filter((item) => item.overallStatus === "BLOCKED").length,
          ready: nextChecklists.filter((item) => item.overallStatus === "READY").length,
          review_required: nextChecklists.filter((item) => item.overallStatus === "REVIEW_REQUIRED").length,
          total: nextChecklists.length,
        });
      } catch (error) {
        reportClientError("admin.merchantOnboarding.load", error);
        setNotice({ type: "error", message: "Merchant onboarding isteği başarısız." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, limit, merchantId, onlyBlocked]
  );

  useEffect(() => {
    let active = true;

    queueMicrotask(async () => {
      const savedAccessToken = await verifyStoredAdminSession();

      if (!active) return;

      if (!savedAccessToken) {
        setTokenState("invalid");
        return;
      }

      setAdminAccessToken(savedAccessToken);
      setTokenState("valid");
      loadChecklists(savedAccessToken);
    });

    return () => {
      active = false;
    };
  }, [loadChecklists]);

  const summaryCards = useMemo(
    () => [
      { label: "Hazır", value: summary.ready || 0, className: "text-emerald-300" },
      { label: "İnceleme", value: summary.review_required || 0, className: "text-amber-300" },
      { label: "Blokaj", value: summary.blocked || 0, className: "text-red-300" },
      { label: "Toplam", value: summary.total || 0, className: "text-zinc-100" },
    ],
    [summary]
  );
  const prioritizedChecklists = useMemo(
    () => sortPilotItemsByPriority(checklists, (checklist) => checklist.overallStatus),
    [checklists]
  );
  const firstOnboardingAction = prioritizedChecklists
    .flatMap((checklist) => sortPilotItemsByPriority(checklist.checks || []))
    .map((check) => getPilotAction(check.code, check.status))
    .find(Boolean);
  const operatorSummary = getPilotOperatorSummary({
    blocked: summary.blocked || 0,
    firstAction: firstOnboardingAction,
    ready: summary.ready || 0,
    review: summary.review_required || 0,
    total: summary.total || 0,
  });
  const operatorStatus = summary.total === 0
    ? "WAITING"
    : summary.blocked > 0
    ? "BLOCKED"
    : summary.review_required > 0
      ? "REVIEW_REQUIRED"
      : "READY";

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Merchant onboarding için admin girişi gerekli" />;
  }

  return (
    <main className="admin-treasury-page admin-onboarding-page min-h-screen text-zinc-100">
      <header className="admin-treasury-header admin-onboarding-header border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-1 text-2xl font-bold">Merchant onboarding</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Pilot go-live öncesi merchant bazında KYB, legal, API key, webhook, payout, risk ve balance kontrollerini izleyin.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <DashboardButton
              as="a"
              href="/admin/pilot-readiness"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Pilot hazırlığı
            </DashboardButton>
            <DashboardButton
              as="a"
              href="/admin/reconciliation"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Mutabakat
            </DashboardButton>
            <DashboardButton
              as="a"
              href="/admin/risk-review"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Risk inceleme
            </DashboardButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-8 md:py-6">
        <AdminConsoleNav currentPath="/admin/merchant-onboarding" onRefresh={() => loadChecklists()} loading={loading || !adminAccessToken} />

        <DashboardPanel variant="adminMuted" className="admin-treasury-panel admin-onboarding-filter rounded-lg p-4 sm:p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Checklist filtresi</p>
            <h2 className="mt-1 text-xl font-bold">Merchant pilot kontrolleri</h2>
            <p className="mt-1 text-sm text-zinc-500">Tek merchant ID ile detaylı kontrol yapın veya son kayıtları limit ve blokaj filtresiyle tarayın.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
            <DashboardInput
              variant="admin"
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              placeholder="Merchant ID ile tek kontrol"
              className="h-10 rounded-lg"
            />
            <DashboardInput
              variant="admin"
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              disabled={Boolean(merchantId.trim())}
              className="h-10 rounded-lg disabled:opacity-40"
            />
            <label className="admin-pilot-evidence flex h-10 items-center gap-3 rounded-lg border px-4 text-sm">
              <input
                type="checkbox"
                checked={onlyBlocked}
                onChange={(event) => setOnlyBlocked(event.target.checked)}
                disabled={Boolean(merchantId.trim())}
                className="h-4 w-4"
              />
              Sadece blokajlı
            </label>
            <DashboardButton
              type="button"
              variant="adminPrimary"
              onClick={() => loadChecklists()}
              disabled={loading || !adminAccessToken}
              className="h-10 rounded-lg px-5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Filtrele
            </DashboardButton>
          </div>
          {notice && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                notice.type === "error" ? "admin-treasury-notice-error" : "admin-treasury-notice-success"
              }`}
            >
              {notice.message}
            </div>
          )}
        </DashboardPanel>

        <section className={`admin-onboarding-summary rounded-lg border p-4 sm:p-5 ${getPilotStatusClassName(operatorStatus)}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Operatör özeti</p>
              <h2 className="mt-2 text-xl font-bold">{operatorSummary.title}</h2>
              <p className="mt-2 max-w-3xl text-sm opacity-80">{operatorSummary.description}</p>
            </div>
            <DashboardPill className="w-fit border-current">
              {operatorSummary.status}
            </DashboardPill>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <DashboardMetric key={card.label} variant="admin" className="admin-treasury-metric admin-onboarding-metric rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold ${card.className}`}>{card.value}</p>
            </DashboardMetric>
          ))}
        </section>

        <section className="space-y-4">
          {prioritizedChecklists.map((checklist) => (
            <DashboardPanel
              as="article"
              key={checklist.merchant.id}
              variant="adminMuted"
              className="admin-treasury-panel admin-onboarding-checklist rounded-lg p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{checklist.merchant.name}</h2>
                  <p className="break-all text-sm text-zinc-500">{checklist.merchant.email}</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-600">{checklist.merchant.id}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Checklist oluşturulma: <span className="font-mono text-zinc-300">{formatPilotDateTime(checklist.generatedAt)}</span>
                  </p>
                </div>
                <div className="flex max-w-sm flex-col items-start gap-2 md:items-end">
                  <DashboardPill className={getPilotStatusClassName(checklist.overallStatus)}>
                    {formatPilotStatus(checklist.overallStatus)}
                  </DashboardPill>
                  <p className="text-left text-xs text-zinc-500 md:text-right">
                    {getPilotDecision(checklist.overallStatus).description}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {sortPilotItemsByPriority(checklist.checks || []).map((check) => {
                  const action = getPilotAction(check.code, check.status);
                  const evidence = getPilotEvidence(check.details, checklist.generatedAt);

                  return (
                    <DashboardPanel
                      as="div"
                      key={check.code}
                      variant="admin"
                      className="admin-onboarding-check rounded-lg p-4 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{formatPilotCode(check.code)}</p>
                          <p className="mt-1 text-sm text-zinc-500">{getMerchantCheckMessage(check)}</p>
                        </div>
                        <DashboardPill className={`shrink-0 ${getPilotStatusClassName(check.status)}`}>
                          {formatPilotStatus(check.status)}
                        </DashboardPill>
                      </div>
                      {evidence.length > 0 && (
                        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                          {evidence.map(([label, value]) => (
                            <div key={label} className="admin-pilot-evidence rounded-lg border px-3 py-2">
                              <dt className="text-zinc-500">{label}</dt>
                              <dd className="mt-1 break-all font-mono text-zinc-300">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {action && (
                        <div className="admin-pilot-action mt-4 rounded-lg border p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sonraki aksiyon</p>
                          <p className="mt-1 text-sm text-zinc-400">{action.text}</p>
                          <DashboardButton
                            as="a"
                            href={action.href}
                            variant="plain"
                            className="mt-3 inline-flex rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                          >
                            {action.label}
                          </DashboardButton>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2">
                        {summarizePilotDetails(check.details, Object.keys(check.details || {})).map(([key, value]) => (
                          <div key={key} className="admin-pilot-detail rounded-lg border px-3 py-2">
                            <p className="font-semibold text-zinc-400">{formatPilotCode(key)}</p>
                            <p className="mt-1 break-words font-mono">{value}</p>
                          </div>
                        ))}
                      </div>
                    </DashboardPanel>
                  );
                })}
              </div>
            </DashboardPanel>
          ))}

          {!loading && checklists.length === 0 && (
            <DashboardEmptyState variant="admin" className="admin-treasury-panel rounded-lg p-6">
              <p className="font-semibold text-zinc-200">Merchant checklist bulunamadı</p>
              <p className="mt-1 text-sm text-zinc-500">
                Merchant ID, limit veya blokaj filtresini düzenleyip checklisti tekrar çalıştırın.
              </p>
            </DashboardEmptyState>
          )}
        </section>
      </div>
    </main>
  );
}
