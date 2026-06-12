"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
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

const getPilotCheckMessage = (check) => {
  const status = check?.status;

  if (check?.name === "health_readiness") {
    return status === "PASS" ? "Sistem sağlık kontrolleri temiz." : "Sistem sağlık kontrollerinde sorun var.";
  }

  if (check?.name === "queue_backlog") {
    return status === "PASS" ? "Background kuyrukları boş." : "Background kuyruklarında bitmesi gereken iş var.";
  }

  if (check?.name === "balance_reconciliation") {
    if (check?.details?.lastRunTimestamp === 0) return "Bakiye mutabakatı henüz çalışmamış.";
    return status === "PASS" ? "Bakiye mutabakatı temiz." : "Bakiye mutabakatında uyumsuzluk var.";
  }

  if (check?.name === "payment_backlog") {
    return status === "PASS" ? "Ödeme inceleme kuyruğu temiz." : "Bekleyen, eksik ödenmiş veya manuel incelemedeki ödeme var.";
  }

  if (check?.name === "webhook_backlog") {
    return status === "PASS" ? "Başarısız webhook kuyruğu temiz." : "Başarısız webhook veya dead-letter olayı inceleme gerektiriyor.";
  }

  if (check?.name === "payout_backlog") {
    return status === "PASS" ? "Payout kuyruğu temiz." : "Operasyonel inceleme gerektiren payout isteği var.";
  }

  if (check?.name === "risk_review") {
    return status === "PASS" ? "Açık risk olayı bulunmuyor." : "Pilot limitleri artmadan önce açık risk olayları incelenmeli.";
  }

  if (check?.name === "kyb_review") {
    return status === "PASS" ? "Bekleyen KYB incelemesi yok." : "Bazı KYB profilleri hâlâ inceleme bekliyor.";
  }

  if (check?.name === "security_config") {
    return status === "PASS" ? "Kritik güvenlik konfigürasyonu mevcut." : "Kritik güvenlik konfigürasyonunda eksik var.";
  }

  return check?.message || "Kontrol sonucu incelenmeli.";
};

export default function AdminPilotReadinessPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [readiness, setReadiness] = useState(null);

  const loadReadiness = useCallback(
    async (accessTokenOverride) => {
      const token = accessTokenOverride || adminAccessToken;
      if (!token) return;

      setLoading(true);
      setNotice(null);
      try {
        const response = await adminFetch("/api/admin/pilot/readiness", {
          accessToken: token,
        });
        const data = response.body;

        if (!response.ok) {
          setNotice({ type: "error", message: data.message || "Pilot hazırlık verileri yüklenemedi." });
          return;
        }

        setReadiness(data.readiness || null);
      } catch (error) {
        reportClientError("admin.pilotReadiness.load", error);
        setNotice({ type: "error", message: "Pilot hazırlık isteği başarısız." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken]
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
      loadReadiness(savedAccessToken);
    });

    return () => {
      active = false;
    };
  }, [loadReadiness]);

  const checks = useMemo(
    () => sortPilotItemsByPriority(readiness?.checks || []),
    [readiness]
  );
  const summaryCards = useMemo(
    () => [
      { label: "Geçen", value: readiness?.summary?.pass || 0, className: "text-emerald-300" },
      { label: "Uyarı", value: readiness?.summary?.warn || 0, className: "text-amber-300" },
      { label: "Blokaj", value: readiness?.summary?.fail || 0, className: "text-red-300" },
      { label: "Toplam", value: readiness?.summary?.total || 0, className: "text-zinc-100" },
    ],
    [readiness]
  );
  const decision = getPilotDecision(readiness?.status);
  const firstReadinessAction = checks
    .map((check) => getPilotAction(check.name, check.status))
    .find(Boolean);
  const operatorSummary = getPilotOperatorSummary({
    blocked: readiness?.summary?.fail || 0,
    firstAction: firstReadinessAction,
    ready: readiness?.summary?.pass || 0,
    review: readiness?.summary?.warn || 0,
    total: readiness?.summary?.total || 0,
  });
  const topEvidence = [
    ["Oluşturulma", formatPilotDateTime(readiness?.checkedAt)],
    ["Kontrol", String(readiness?.summary?.total || 0)],
    ["Uyarı", String(readiness?.summary?.warn || 0)],
    ["Blokaj", String(readiness?.summary?.fail || 0)],
  ];

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Pilot hazırlığı için admin girişi gerekli" />;
  }

  return (
    <main className="admin-treasury-page admin-pilot-page min-h-screen text-zinc-100">
      <header className="admin-treasury-header admin-pilot-header border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-1 text-2xl font-bold">Pilot hazırlığı</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Production pilot öncesi sağlık, mutabakat, ödeme, webhook, payout, risk, KYB ve güvenlik kontrollerini tek ekranda izleyin.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <DashboardButton
              as="a"
              href="/admin/merchant-onboarding"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Merchant onboarding
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
        <AdminConsoleNav currentPath="/admin/pilot-readiness" onRefresh={() => loadReadiness()} loading={loading || !adminAccessToken} />

        {notice && (
          <div
            className={`admin-pilot-notice rounded-lg border px-4 py-3 text-sm ${
              notice.type === "error" ? "admin-treasury-notice-error" : "admin-treasury-notice-success"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className={`admin-pilot-decision rounded-lg border p-4 sm:p-5 ${getPilotStatusClassName(readiness?.status || "REVIEW_REQUIRED")}`}>
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

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(360px,1.6fr)_repeat(4,minmax(130px,1fr))]">
          <div className={`col-span-2 rounded-lg border p-4 sm:p-5 xl:col-span-1 ${getPilotStatusClassName(readiness?.status || "REVIEW_REQUIRED")}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{decision.label}</p>
                <p className="mt-2 text-2xl font-bold">{decision.title}</p>
                <p className="mt-2 max-w-xl text-sm opacity-80">{decision.description}</p>
              </div>
              <DashboardPill className="w-fit border-current">
                {formatPilotStatus(readiness?.status || "REVIEW_REQUIRED")}
              </DashboardPill>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              {topEvidence.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-current/20 px-3 py-2">
                  <dt className="opacity-70">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {summaryCards.map((card) => (
            <DashboardMetric key={card.label} variant="admin" className="admin-treasury-metric admin-pilot-metric rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold ${card.className}`}>{card.value}</p>
            </DashboardMetric>
          ))}
        </section>

        <section className="space-y-3">
          {checks.map((check) => {
            const action = getPilotAction(check.name, check.status);
            const evidence = getPilotEvidence(check.details, readiness?.checkedAt);

            return (
              <DashboardPanel
                as="article"
                key={check.name}
                variant="adminMuted"
                className="admin-treasury-panel admin-pilot-check rounded-lg p-4 sm:p-5"
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-semibold">{formatPilotCode(check.name)}</h2>
                      <DashboardPill className={`w-fit shrink-0 ${getPilotStatusClassName(check.status)}`}>
                        {formatPilotStatus(check.status)}
                      </DashboardPill>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{getPilotCheckMessage(check)}</p>
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
                      <div className="admin-pilot-action mt-4 rounded-lg border p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sonraki aksiyon</p>
                        <p className="mt-1 text-sm text-zinc-300">{action.text}</p>
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
                  </div>
                  <div className="admin-pilot-detail rounded-lg border p-3">
                    {summarizePilotDetails(check.details).length > 0 ? (
                      <dl className="space-y-2 text-xs">
                        {summarizePilotDetails(check.details).map(([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-4">
                            <dt className="text-zinc-500">{formatPilotCode(key)}</dt>
                            <dd className="max-w-[58%] break-all text-right font-mono text-zinc-200">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all text-xs text-zinc-500">
                        {JSON.stringify(check.details || {}, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </DashboardPanel>
            );
          })}

          {!loading && checks.length === 0 && (
            <DashboardEmptyState variant="admin" className="admin-treasury-panel rounded-lg p-6">
              Pilot hazırlık sonucu yok.
            </DashboardEmptyState>
          )}
        </section>
      </div>
    </main>
  );
}
