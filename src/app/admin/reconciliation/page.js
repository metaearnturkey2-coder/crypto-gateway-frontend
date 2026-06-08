"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const CHECK_FIELDS = [
  "grossPaid",
  "pendingBalance",
  "reservedForPayouts",
  "totalFees",
  "totalPaidOut",
  "availableBalance",
];

const getStatusClassName = (status) => {
  if (status === "MATCH") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  return "border-red-400/40 bg-red-500/10 text-red-200";
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const shortId = (value) => {
  if (!value) return "-";
  const text = String(value);
  return text.length > 22 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text;
};

const getCheck = (result, field) =>
  result.checks?.find((check) => check.field === field) || {
    actual: "0",
    difference: "0",
    expected: "0",
    field,
    status: "MATCH",
  };

export default function AdminReconciliationPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [merchantId, setMerchantId] = useState("");
  const [onlyMismatches, setOnlyMismatches] = useState(false);
  const [limit, setLimit] = useState("50");
  const [results, setResults] = useState([]);
  const [singleResult, setSingleResult] = useState(null);
  const [summary, setSummary] = useState({
    checkedMerchants: 0,
    mismatchedMerchants: 0,
    returnedMerchants: 0,
  });
  const [checkedAt, setCheckedAt] = useState(null);

  const loadReconciliation = useCallback(
    async (accessTokenOverride) => {
      const token = accessTokenOverride || adminAccessToken;
      if (!token) return;

      setLoading(true);
      setNotice(null);
      try {
        const params = new URLSearchParams();
        if (merchantId.trim()) {
          params.set("merchantId", merchantId.trim());
        } else {
          params.set("limit", String(limit || "50"));
          if (onlyMismatches) params.set("onlyMismatches", "true");
        }

        const response = await adminFetch(`/api/admin/reconciliation/balances?${params.toString()}`, {
          accessToken: token,
        });
        const data = response.body;

        if (!response.ok) {
          setNotice({ type: "error", message: data.message || "Reconciliation data could not be loaded." });
          return;
        }

        if (data.result) {
          setSingleResult(data.result);
          setResults([data.result]);
          setSummary({
            checkedMerchants: 1,
            mismatchedMerchants: data.result.status === "MISMATCH" ? 1 : 0,
            returnedMerchants: 1,
          });
          setCheckedAt(data.result.checkedAt);
        } else {
          setSingleResult(null);
          setResults(data.results || []);
          setSummary(data.summary || {
            checkedMerchants: 0,
            mismatchedMerchants: 0,
            returnedMerchants: 0,
          });
          setCheckedAt(data.checkedAt);
        }
      } catch (error) {
        reportClientError("admin.reconciliation.load", error);
        setNotice({ type: "error", message: "Reconciliation request failed." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, limit, merchantId, onlyMismatches]
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
      loadReconciliation(savedAccessToken);
    });

    return () => {
      active = false;
    };
  }, [loadReconciliation]);

  const visibleResults = useMemo(
    () => results.filter(Boolean),
    [results]
  );

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Reconciliation access required" />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pilot Operations</p>
            <h1 className="mt-1 text-2xl font-bold">Balance Reconciliation</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Merchant balance tablosunu immutable ledger toplamlarıyla karşılaştırın ve pilot öncesi finansal tutarlılığı izleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/merchant-onboarding" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Merchant Onboarding
            </a>
            <a href="/admin/pilot-readiness" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Pilot Readiness
            </a>
            <a href="/admin/risk-review" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Risk Review
            </a>
            <a href="/admin/settlement-console" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Settlement
            </a>
            <a href="/admin/treasury" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Treasury
            </a>
          </div>
        </header>

        <AdminConsoleNav currentPath="/admin/reconciliation" onRefresh={() => loadReconciliation()} loading={loading || !adminAccessToken} />
        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Checked</p>
            <p className="mt-2 text-3xl font-bold">{summary.checkedMerchants || 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mismatches</p>
            <p className={`mt-2 text-3xl font-bold ${summary.mismatchedMerchants ? "text-red-300" : "text-emerald-300"}`}>
              {summary.mismatchedMerchants || 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Returned</p>
            <p className="mt-2 text-3xl font-bold">{summary.returnedMerchants || 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Checked At</p>
            <p className="mt-3 text-sm text-zinc-300">{formatDate(checkedAt)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_auto_auto]">
            <input
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              placeholder="Merchant ID ile tekil kontrol"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
            />
            <input
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              disabled={Boolean(merchantId.trim())}
              inputMode="numeric"
              placeholder="Limit"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none disabled:opacity-40"
            />
            <label className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={onlyMismatches}
                onChange={(event) => setOnlyMismatches(event.target.checked)}
                disabled={Boolean(merchantId.trim())}
                className="h-4 w-4"
              />
              Only mismatches
            </label>
            <button onClick={() => loadReconciliation()} disabled={loading || !adminAccessToken} className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-40">
              Kontrol et
            </button>
          </div>
          {singleResult && (
            <p className="mt-3 text-xs text-zinc-500">
              Tekil merchant sonucu gösteriliyor: {singleResult.merchant?.email || singleResult.merchant?.id}
            </p>
          )}
        </section>

        <section className="space-y-4">
          {visibleResults.map((result) => (
            <div key={result.merchant.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(result.status)}`}>
                      {result.status}
                    </span>
                    <span className="font-semibold">{result.merchant.name}</span>
                    <span className="text-sm text-zinc-500">{result.merchant.email}</span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-zinc-500">{shortId(result.merchant.id)}</p>
                </div>
                <div className="text-sm text-zinc-400 lg:text-right">
                  <p>{result.summary?.mismatchCount || 0} mismatch / {result.summary?.totalChecks || 0} checks</p>
                  <p>{formatDate(result.checkedAt)}</p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Actual</th>
                      <th className="px-3 py-2">Expected</th>
                      <th className="px-3 py-2">Difference</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHECK_FIELDS.map((field) => {
                      const check = getCheck(result, field);
                      return (
                        <tr key={field} className="bg-black">
                          <td className="rounded-l-xl px-3 py-3 font-medium">{field}</td>
                          <td className="px-3 py-3 font-mono text-zinc-300">{check.actual}</td>
                          <td className="px-3 py-3 font-mono text-zinc-300">{check.expected}</td>
                          <td className={`px-3 py-3 font-mono ${check.status === "MISMATCH" ? "text-red-300" : "text-zinc-500"}`}>
                            {check.difference}
                          </td>
                          <td className="rounded-r-xl px-3 py-3">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(check.status)}`}>
                              {check.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {!loading && visibleResults.length === 0 && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-500">
              Reconciliation sonucu yok.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
