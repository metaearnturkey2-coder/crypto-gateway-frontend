"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardInput, DashboardMetric, DashboardPanel, DashboardPill } from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";
import { formatPilotCode, formatPilotDateTime, getPilotAction, getPilotDecision, getPilotEvidence, getPilotOperatorSummary, getPilotStatusClassName, sortPilotItemsByPriority, summarizePilotDetails } from "@/features/admin-pilot/ui";

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
          setNotice({ type: "error", message: data.message || "Merchant onboarding checklist could not be loaded." });
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
        setNotice({ type: "error", message: "Merchant onboarding request failed." });
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
      { label: "Ready", value: summary.ready || 0, className: "text-emerald-300" },
      { label: "Review", value: summary.review_required || 0, className: "text-amber-300" },
      { label: "Blocked", value: summary.blocked || 0, className: "text-red-300" },
      { label: "Total", value: summary.total || 0, className: "text-zinc-100" },
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
    return <AdminAccessRequired title="Merchant onboarding access required" />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pilot Operations</p>
            <h1 className="mt-1 text-2xl font-bold">Merchant Onboarding</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Pilot canliya alma oncesi merchant bazinda KYB, legal, API key, webhook, payout, risk ve balance kontrollerini izleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DashboardButton as="a" href="/admin/pilot-readiness" variant="adminSecondary" className="px-4 py-3">
              Pilot Readiness
            </DashboardButton>
            <DashboardButton as="a" href="/admin/reconciliation" variant="adminSecondary" className="px-4 py-3">
              Reconciliation
            </DashboardButton>
            <DashboardButton as="a" href="/admin/risk-review" variant="adminSecondary" className="px-4 py-3">
              Risk Review
            </DashboardButton>
          </div>
        </header>

        <AdminConsoleNav currentPath="/admin/merchant-onboarding" onRefresh={() => loadChecklists()} loading={loading || !adminAccessToken} />

        <DashboardPanel variant="adminMuted" className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto_auto]">
            <DashboardInput
              variant="admin"
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              placeholder="Merchant ID ile tek kontrol"
              className="py-3"
            />
            <DashboardInput
              variant="admin"
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="py-3"
            />
            <label className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={onlyBlocked}
                onChange={(event) => setOnlyBlocked(event.target.checked)}
                disabled={Boolean(merchantId.trim())}
              />
              Only blocked
            </label>
            <DashboardButton
              type="button"
              variant="plain"
              onClick={() => loadChecklists()}
              disabled={loading || !adminAccessToken}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply filters
            </DashboardButton>
          </div>
          {notice && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
              {notice.message}
            </div>
          )}
        </DashboardPanel>

        <section className={`rounded-2xl border p-5 ${getPilotStatusClassName(operatorStatus)}`}>
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

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <DashboardMetric key={card.label} variant="admin" className="rounded-2xl bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.className}`}>{card.value}</p>
            </DashboardMetric>
          ))}
        </section>

        <section className="space-y-4">
          {prioritizedChecklists.map((checklist) => (
            <DashboardPanel as="article" key={checklist.merchant.id} variant="adminMuted" className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{checklist.merchant.name}</h2>
                  <p className="text-sm text-zinc-500">{checklist.merchant.email}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-600">{checklist.merchant.id}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Checklist generated: <span className="font-mono text-zinc-300">{formatPilotDateTime(checklist.generatedAt)}</span>
                  </p>
                </div>
                <div className="flex max-w-sm flex-col items-start gap-2 md:items-end">
                  <DashboardPill className={getPilotStatusClassName(checklist.overallStatus)}>
                    {checklist.overallStatus}
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
                    <DashboardPanel as="div" key={check.code} variant="admin" className="rounded-xl bg-black p-4 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{formatPilotCode(check.code)}</p>
                          <p className="mt-1 text-sm text-zinc-500">{check.message}</p>
                        </div>
                        <DashboardPill className={`shrink-0 ${getPilotStatusClassName(check.status)}`}>
                          {check.status}
                        </DashboardPill>
                      </div>
                      {evidence.length > 0 && (
                        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                          {evidence.map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                              <dt className="text-zinc-500">{label}</dt>
                              <dd className="mt-1 font-mono text-zinc-300">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {action && (
                        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next action</p>
                          <p className="mt-1 text-sm text-zinc-400">{action.text}</p>
                          <DashboardButton as="a" href={action.href} variant="plain" className="mt-3 inline-flex rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20">
                            {action.label}
                          </DashboardButton>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2">
                        {summarizePilotDetails(check.details, Object.keys(check.details || {})).map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
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
            <DashboardEmptyState variant="admin" className="rounded-2xl bg-zinc-900 p-6">
              <p className="font-semibold text-zinc-200">No merchant checklist found</p>
              <p className="mt-1 text-sm text-zinc-500">
                Adjust the merchant ID, limit, or blocked-only filter and run the checklist again.
              </p>
            </DashboardEmptyState>
          )}
        </section>
      </div>
    </main>
  );
}
