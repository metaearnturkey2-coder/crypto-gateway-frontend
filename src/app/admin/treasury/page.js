"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardButton, DashboardEmptyState, DashboardMetric, DashboardPanel, DashboardPill, DashboardSelect } from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const STATUS_OPTIONS = ["ALL", "PENDING", "BROADCASTED", "CONFIRMED", "FAILED", "CANCELLED"];

const getStatusClassName = (status) => {
  if (status === "CONFIRMED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "BROADCASTED") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
  if (status === "FAILED" || status === "CANCELLED") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
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
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
};

export default function AdminTreasuryPage() {
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sweeps, setSweeps] = useState([]);
  const [stats, setStats] = useState({ byStatus: {}, total: 0 });
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchTreasuryData = useCallback(
    async (accessTokenOverride, nextStatus = statusFilter) => {
      const token = accessTokenOverride || adminAccessToken;
      if (!token) return;

      setLoading(true);
      setNotice(null);

      try {
        const params = new URLSearchParams({
          limit: "50",
          status: nextStatus,
        });
        const [sweepsResponse, policyResponse] = await Promise.all([
          adminFetch(`/api/admin/sweeps?${params.toString()}`, { accessToken: token }),
          adminFetch("/api/admin/sweeps/treasury-policy", { accessToken: token }),
        ]);
        const sweepsData = sweepsResponse.body;
        const policyData = policyResponse.body;

        if (!sweepsResponse.ok) {
          setNotice({ type: "error", message: sweepsData.message || "Sweep listesi yuklenemedi." });
          return;
        }

        if (!policyResponse.ok) {
          setNotice({ type: "error", message: policyData.message || "Treasury policy yuklenemedi." });
          return;
        }

        setSweeps(sweepsData.sweeps || []);
        setStats(sweepsData.stats || { byStatus: {}, total: 0 });
        setPolicy(policyData);
      } catch (error) {
        reportClientError("admin.treasury.load", error);
        setNotice({ type: "error", message: "Treasury verileri yuklenemedi." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, statusFilter]
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
      fetchTreasuryData(savedAccessToken);
    });

    return () => {
      active = false;
    };
  }, [fetchTreasuryData]);

  const statusCards = useMemo(
    () =>
      STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => ({
        status,
        value: stats.byStatus?.[status] || 0,
      })),
    [stats]
  );

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Treasury access required" />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Internal treasury</p>
            <h1 className="mt-1 text-2xl font-bold">Sweep & Treasury</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Payment wallet fon toplama kayitlari, treasury policy ve custody durumunu izleyin.
            </p>
          </div>
          <DashboardButton as="a" href="/admin/settlement-console" variant="adminSecondary" className="px-4 py-3">
            Settlement Console
          </DashboardButton>
        </header>

        <AdminConsoleNav currentPath="/admin/treasury" onRefresh={() => fetchTreasuryData()} loading={loading || !adminAccessToken} />
        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardPanel variant="adminMuted" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Hot wallet</p>
            <p className="mt-3 break-all text-sm">{policy?.treasuryPolicy?.hotWallet?.address || "Not configured"}</p>
            <DashboardPill className={`mt-4 inline-flex ${policy?.treasuryPolicy?.hotWallet?.valid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
              {policy?.treasuryPolicy?.hotWallet?.configured ? "configured" : "missing"}
            </DashboardPill>
          </DashboardPanel>
          <DashboardPanel variant="adminMuted" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cold wallet</p>
            <p className="mt-3 break-all text-sm">{policy?.treasuryPolicy?.coldWallet?.address || "Optional / not configured"}</p>
            <DashboardPill variant="admin" className="mt-4 inline-flex">
              {policy?.treasuryPolicy?.coldWallet?.configured ? "configured" : "optional"}
            </DashboardPill>
          </DashboardPanel>
          <DashboardPanel variant="adminMuted" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custody</p>
            <p className="mt-3 text-lg font-bold">{policy?.custodyPolicy?.provider || "-"}</p>
            <p className="mt-2 text-sm text-zinc-500">Threshold {policy?.thresholdPolicy?.minAmount || "-"} USDT, gas {policy?.gasPolicy?.minTrxGas || "-"} TRX</p>
          </DashboardPanel>
        </section>

        <DashboardPanel variant="adminMuted" className="p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Sweep kayitlari</h2>
              <p className="mt-1 text-sm text-zinc-500">{stats.total || 0} toplam sweep kaydi</p>
            </div>
            <DashboardSelect
              variant="admin"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                fetchTreasuryData(undefined, event.target.value);
              }}
              className="py-3"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </DashboardSelect>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {statusCards.map((item) => (
              <DashboardMetric key={item.status} variant="admin" className="rounded-xl p-4">
                <p className="text-xs font-semibold text-zinc-500">{item.status}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </DashboardMetric>
            ))}
          </div>

          <div className="space-y-3">
            {sweeps.map((sweep) => (
              <DashboardPanel as="div" key={sweep.id} variant="admin" className="grid grid-cols-1 gap-3 rounded-xl bg-black p-4 text-sm sm:p-4 lg:grid-cols-[140px_1fr_1fr_160px]">
                <DashboardPill className={`w-fit ${getStatusClassName(sweep.status)}`}>
                  {sweep.status}
                </DashboardPill>
                <div>
                  <p className="text-zinc-500">Amount</p>
                  <p className="font-semibold">{sweep.amount} {sweep.currency}</p>
                  <p className="text-xs text-zinc-500">Gas {sweep.gasAmount || "-"} {sweep.gasAsset}</p>
                </div>
                <div className="min-w-0">
                  <p className="break-all text-zinc-300">
                    {shortId(sweep.fromAddress)} {"->"} {shortId(sweep.toAddress)}
                  </p>
                  <p className="mt-1 break-all text-xs text-zinc-500">payment {shortId(sweep.paymentId)}</p>
                </div>
                <div className="text-zinc-500 lg:text-right">
                  <p>{formatDate(sweep.createdAt)}</p>
                  <p className="mt-1 break-all text-xs">{sweep.txHash ? shortId(sweep.txHash) : "no tx yet"}</p>
                </div>
              </DashboardPanel>
            ))}
          </div>

          {!loading && sweeps.length === 0 && (
            <DashboardEmptyState variant="admin" className="p-6">Bu filtre icin sweep kaydi yok.</DashboardEmptyState>
          )}
        </DashboardPanel>
      </div>
    </main>
  );
}
