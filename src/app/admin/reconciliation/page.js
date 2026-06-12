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

const CHECK_FIELDS = [
  "grossPaid",
  "pendingBalance",
  "reservedForPayouts",
  "totalFees",
  "totalPaidOut",
  "availableBalance",
];

const FIELD_LABELS = {
  grossPaid: "Brüt ödeme",
  pendingBalance: "Bekleyen bakiye",
  reservedForPayouts: "Payout rezervi",
  totalFees: "Toplam komisyon",
  totalPaidOut: "Toplam payout",
  availableBalance: "Kullanılabilir bakiye",
};

const RESULT_STATUS_LABELS = {
  MATCH: "Eşleşti",
  MISMATCH: "Uyumsuz",
};

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
          setNotice({ type: "error", message: data.message || "Mutabakat verileri yüklenemedi." });
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
        setNotice({ type: "error", message: "Mutabakat isteği başarısız." });
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

  const visibleResults = useMemo(() => results.filter(Boolean), [results]);

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Mutabakat için admin girişi gerekli" />;
  }

  return (
    <main className="admin-treasury-page admin-reconciliation-page min-h-screen text-zinc-100">
      <header className="admin-treasury-header admin-reconciliation-header border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-1 text-2xl font-bold">Bakiye mutabakatı</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Merchant balance kayıtlarını ledger toplamlarıyla karşılaştırın ve pilot öncesi finansal tutarlılığı izleyin.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <DashboardButton
              as="a"
              href="/admin/risk-review"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Risk inceleme
            </DashboardButton>
            <DashboardButton
              as="a"
              href="/admin/settlement-console"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Settlement konsolu
            </DashboardButton>
            <DashboardButton
              as="a"
              href="/admin/treasury"
              variant="adminSecondary"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
            >
              Hazine
            </DashboardButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-8 md:py-6">
        <AdminConsoleNav currentPath="/admin/reconciliation" onRefresh={() => loadReconciliation()} loading={loading || !adminAccessToken} />

        {notice && (
          <div
            className={`admin-reconciliation-notice rounded-lg border px-4 py-3 text-sm ${
              notice.type === "error" ? "admin-treasury-notice-error" : "admin-treasury-notice-success"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardMetric variant="admin" className="admin-treasury-metric admin-reconciliation-metric rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Kontrol edilen</p>
            <p className="mt-2 text-2xl font-bold">{summary.checkedMerchants || 0}</p>
          </DashboardMetric>
          <DashboardMetric variant="admin" className="admin-treasury-metric admin-reconciliation-metric rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Uyumsuzluk</p>
            <p className={`mt-2 text-2xl font-bold ${summary.mismatchedMerchants ? "text-red-300" : "text-emerald-300"}`}>
              {summary.mismatchedMerchants || 0}
            </p>
          </DashboardMetric>
          <DashboardMetric variant="admin" className="admin-treasury-metric admin-reconciliation-metric rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dönen merchant</p>
            <p className="mt-2 text-2xl font-bold">{summary.returnedMerchants || 0}</p>
          </DashboardMetric>
          <DashboardMetric variant="admin" className="admin-treasury-metric admin-reconciliation-metric rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Son kontrol</p>
            <p className="mt-3 text-sm text-zinc-300">{formatDate(checkedAt)}</p>
          </DashboardMetric>
        </section>

        <DashboardPanel variant="adminMuted" className="admin-treasury-panel admin-reconciliation-panel rounded-lg p-4 sm:p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mutabakat kontrolü</p>
            <h2 className="mt-1 text-xl font-bold">Ledger ve balance karşılaştırması</h2>
            <p className="mt-1 text-sm text-zinc-500">Tek merchant ID ile derin kontrol yapın veya toplu sonucu operasyonel limit ile tarayın.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_140px_auto_auto]">
            <DashboardInput
              variant="admin"
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              placeholder="Merchant ID ile tekil kontrol"
              className="h-10 rounded-lg"
            />
            <DashboardInput
              variant="admin"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              disabled={Boolean(merchantId.trim())}
              inputMode="numeric"
              placeholder="Kayıt limiti"
              className="h-10 rounded-lg disabled:opacity-40"
            />
            <label className="admin-reconciliation-toggle flex h-10 items-center gap-3 rounded-lg border px-4 text-sm">
              <input
                type="checkbox"
                checked={onlyMismatches}
                onChange={(event) => setOnlyMismatches(event.target.checked)}
                disabled={Boolean(merchantId.trim())}
                className="h-4 w-4"
              />
              Sadece uyumsuzlar
            </label>
            <DashboardButton
              type="button"
              variant="adminPrimary"
              onClick={() => loadReconciliation()}
              disabled={loading || !adminAccessToken}
              className="h-10 rounded-lg px-5 disabled:opacity-40"
            >
              Kontrol et
            </DashboardButton>
          </div>

          {singleResult && (
            <p className="mt-3 text-xs text-zinc-500">
              Tekil merchant sonucu gösteriliyor: {singleResult.merchant?.email || singleResult.merchant?.id}
            </p>
          )}
        </DashboardPanel>

        <section className="space-y-4">
          {visibleResults.map((result) => (
            <DashboardPanel
              as="div"
              key={result.merchant.id}
              variant="adminMuted"
              className="admin-treasury-panel admin-reconciliation-result rounded-lg p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DashboardPill className={getStatusClassName(result.status)}>
                      {RESULT_STATUS_LABELS[result.status] || result.status}
                    </DashboardPill>
                    <span className="font-semibold">{result.merchant.name}</span>
                    <span className="break-all text-sm text-zinc-500">{result.merchant.email}</span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-zinc-500">{shortId(result.merchant.id)}</p>
                </div>
                <div className="text-sm text-zinc-400 lg:text-right">
                  <p>{result.summary?.mismatchCount || 0} uyumsuzluk / {result.summary?.totalChecks || 0} kontrol</p>
                  <p>{formatDate(result.checkedAt)}</p>
                </div>
              </div>

              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Alan</th>
                      <th className="px-3 py-2">Gerçek</th>
                      <th className="px-3 py-2">Beklenen</th>
                      <th className="px-3 py-2">Fark</th>
                      <th className="px-3 py-2">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHECK_FIELDS.map((field) => {
                      const check = getCheck(result, field);
                      return (
                        <tr key={field} className="admin-reconciliation-check-row">
                          <td className="rounded-l-lg px-3 py-3 font-medium">{FIELD_LABELS[field] || field}</td>
                          <td className="px-3 py-3 font-mono text-zinc-300">{check.actual}</td>
                          <td className="px-3 py-3 font-mono text-zinc-300">{check.expected}</td>
                          <td className={`px-3 py-3 font-mono ${check.status === "MISMATCH" ? "text-red-300" : "text-zinc-500"}`}>
                            {check.difference}
                          </td>
                          <td className="rounded-r-lg px-3 py-3">
                            <DashboardPill className={getStatusClassName(check.status)}>
                              {RESULT_STATUS_LABELS[check.status] || check.status}
                            </DashboardPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
                {CHECK_FIELDS.map((field) => {
                  const check = getCheck(result, field);
                  return (
                    <div key={field} className="admin-reconciliation-check-card rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{FIELD_LABELS[field] || field}</p>
                          <p className="mt-2 font-mono text-sm">{check.actual}</p>
                        </div>
                        <DashboardPill className={getStatusClassName(check.status)}>
                          {RESULT_STATUS_LABELS[check.status] || check.status}
                        </DashboardPill>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-zinc-500">Beklenen</p>
                          <p className="mt-1 font-mono">{check.expected}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Fark</p>
                          <p className={`mt-1 font-mono ${check.status === "MISMATCH" ? "text-red-300" : "text-zinc-500"}`}>
                            {check.difference}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>
          ))}

          {!loading && visibleResults.length === 0 && (
            <DashboardEmptyState variant="admin" className="admin-treasury-panel rounded-lg p-6">
              Mutabakat sonucu yok.
            </DashboardEmptyState>
          )}
        </section>
      </div>
    </main>
  );
}
