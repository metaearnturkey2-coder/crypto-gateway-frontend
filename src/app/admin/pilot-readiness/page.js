"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardMetric, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";
import { formatPilotCode, formatPilotDateTime, getPilotAction, getPilotDecision, getPilotEvidence, getPilotOperatorSummary, getPilotStatusClassName, sortPilotItemsByPriority, summarizePilotDetails } from "@/features/admin-pilot/ui";

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
          setNotice({ type: "error", message: data.message || "Pilot readiness could not be loaded." });
          return;
        }

        setReadiness(data.readiness || null);
      } catch (error) {
        reportClientError("admin.pilotReadiness.load", error);
        setNotice({ type: "error", message: "Pilot readiness request failed." });
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
      { label: "Pass", value: readiness?.summary?.pass || 0, className: "text-emerald-300" },
      { label: "Warn", value: readiness?.summary?.warn || 0, className: "text-amber-300" },
      { label: "Fail", value: readiness?.summary?.fail || 0, className: "text-red-300" },
      { label: "Total", value: readiness?.summary?.total || 0, className: "text-zinc-100" },
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
    ["Generated", formatPilotDateTime(readiness?.checkedAt)],
    ["Controls", String(readiness?.summary?.total || 0)],
    ["Warnings", String(readiness?.summary?.warn || 0)],
    ["Failures", String(readiness?.summary?.fail || 0)],
  ];

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Pilot readiness access required" />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pilot Operations</p>
            <h1 className="mt-1 text-2xl font-bold">Pilot Readiness</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Production pilot oncesi health, reconciliation, payment, webhook, payout, risk, KYB ve security config kontrollerini tek ekranda izleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DashboardButton as="a" href="/admin/merchant-onboarding" variant="adminSecondary" className="px-4 py-3">
              Merchant Onboarding
            </DashboardButton>
            <DashboardButton as="a" href="/admin/reconciliation" variant="adminSecondary" className="px-4 py-3">
              Reconciliation
            </DashboardButton>
            <DashboardButton as="a" href="/admin/risk-review" variant="adminSecondary" className="px-4 py-3">
              Risk Review
            </DashboardButton>
            <DashboardButton as="a" href="/admin/settlement-console" variant="adminSecondary" className="px-4 py-3">
              Settlement
            </DashboardButton>
          </div>
        </header>

        <AdminConsoleNav currentPath="/admin/pilot-readiness" onRefresh={() => loadReadiness()} loading={loading || !adminAccessToken} />
        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.message}
          </div>
        )}

        <section className={`rounded-2xl border p-5 ${getPilotStatusClassName(readiness?.status || "REVIEW_REQUIRED")}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Operator summary</p>
              <h2 className="mt-2 text-xl font-bold">{operatorSummary.title}</h2>
              <p className="mt-2 max-w-3xl text-sm opacity-80">{operatorSummary.description}</p>
            </div>
            <DashboardPill className="w-fit border-current">
              {operatorSummary.status}
            </DashboardPill>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className={`rounded-2xl border p-5 ${getPilotStatusClassName(readiness?.status || "REVIEW_REQUIRED")}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{decision.label}</p>
                <p className="mt-2 text-2xl font-bold">{decision.title}</p>
                <p className="mt-2 max-w-xl text-sm opacity-80">{decision.description}</p>
              </div>
              <DashboardPill className="w-fit border-current">
                {readiness?.status || "UNKNOWN"}
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
            <DashboardMetric key={card.label} variant="admin" className="rounded-2xl bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.className}`}>{card.value}</p>
            </DashboardMetric>
          ))}
        </section>

        <section className="space-y-3">
          {checks.map((check) => {
            const action = getPilotAction(check.name, check.status);
            const evidence = getPilotEvidence(check.details, readiness?.checkedAt);

            return (
              <DashboardPanel as="div" key={check.name} variant="adminMuted" className="p-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr_320px]">
                  <div>
                    <DashboardPill className={`inline-flex ${getPilotStatusClassName(check.status)}`}>
                      {check.status}
                    </DashboardPill>
                  </div>
                  <div>
                    <h2 className="font-semibold">{formatPilotCode(check.name)}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{check.message}</p>
                    {evidence.length > 0 && (
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                        {evidence.map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-zinc-800 bg-black px-3 py-2">
                            <dt className="text-zinc-500">{label}</dt>
                            <dd className="mt-1 font-mono text-zinc-300">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {action && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next action</p>
                        <p className="mt-1 text-sm text-zinc-300">{action.text}</p>
                        <DashboardButton as="a" href={action.href} variant="plain" className="mt-3 inline-flex rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20">
                          {action.label}
                        </DashboardButton>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black p-3">
                    {summarizePilotDetails(check.details).length > 0 ? (
                      <dl className="space-y-2 text-xs">
                        {summarizePilotDetails(check.details).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">{formatPilotCode(key)}</dt>
                            <dd className="font-mono text-zinc-200">{String(value)}</dd>
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
            <DashboardEmptyState variant="admin" className="rounded-2xl bg-zinc-900 p-6">
              Pilot readiness sonucu yok.
            </DashboardEmptyState>
          )}
        </section>
      </div>
    </main>
  );
}
