"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const readJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const body = await response.text();
  return {
    message: `Expected JSON but received ${contentType || "unknown content"}.`,
    responsePreview: body.replace(/\s+/g, " ").slice(0, 180),
  };
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getOverallClassName = (status) => {
  if (status === "READY") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (status === "NOT_READY") return "border-red-400/40 bg-red-500/10 text-red-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
};

const getCheckClassName = (status) => {
  if (status === "PASS") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (status === "FAIL") return "border-red-400/40 bg-red-500/10 text-red-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
};

const formatCheckName = (value) =>
  String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const summarizeDetails = (details = {}) => {
  if (!details || Object.keys(details).length === 0) return [];

  const preferredKeys = [
    "checkedMerchants",
    "mismatchedMerchants",
    "lastRunTimestamp",
    "pendingOrReviewPayments",
    "failedWebhooks",
    "deadLetterWebhooks",
    "pendingOrFailedPayouts",
    "openRiskEvents",
    "pendingKyb",
  ];

  return preferredKeys
    .filter((key) => details[key] !== undefined && details[key] !== null)
    .map((key) => [key, details[key]]);
};

export default function AdminPilotReadinessPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [readiness, setReadiness] = useState(null);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const token = options.accessToken || adminAccessToken;
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
    },
    [adminAccessToken]
  );

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
        const data = await readJsonResponse(response);

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
    [adminAccessToken, adminFetch]
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

  const checks = readiness?.checks || [];
  const summaryCards = useMemo(
    () => [
      { label: "Pass", value: readiness?.summary?.pass || 0, className: "text-emerald-300" },
      { label: "Warn", value: readiness?.summary?.warn || 0, className: "text-amber-300" },
      { label: "Fail", value: readiness?.summary?.fail || 0, className: "text-red-300" },
      { label: "Total", value: readiness?.summary?.total || 0, className: "text-zinc-100" },
    ],
    [readiness]
  );

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
              Production pilot öncesi health, reconciliation, payment, webhook, payout, risk, KYB ve security config kontrollerini tek ekranda izleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/merchant-onboarding" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Merchant Onboarding
            </a>
            <a href="/admin/reconciliation" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Reconciliation
            </a>
            <a href="/admin/risk-review" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Risk Review
            </a>
            <a href="/admin/settlement-console" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Settlement
            </a>
          </div>
        </header>

        <AdminConsoleNav currentPath="/admin/pilot-readiness" onRefresh={() => loadReadiness()} loading={loading || !adminAccessToken} />
        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className={`rounded-2xl border p-5 ${getOverallClassName(readiness?.status || "REVIEW_REQUIRED")}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Overall</p>
            <p className="mt-2 text-3xl font-bold">{readiness?.status || "UNKNOWN"}</p>
            <p className="mt-2 text-xs opacity-80">{formatDate(readiness?.checkedAt)}</p>
          </div>
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.className}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr_320px]">
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCheckClassName(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold">{formatCheckName(check.name)}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{check.message}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black p-3">
                  {summarizeDetails(check.details).length > 0 ? (
                    <dl className="space-y-2 text-xs">
                      {summarizeDetails(check.details).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                          <dt className="text-zinc-500">{formatCheckName(key)}</dt>
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
            </div>
          ))}

          {!loading && checks.length === 0 && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-500">
              Pilot readiness sonucu yok.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
