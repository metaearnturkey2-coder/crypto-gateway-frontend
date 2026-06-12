"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardButton,
  DashboardEmptyState,
  DashboardMetric,
  DashboardPanel,
  DashboardPill,
  DashboardSelect,
} from "@/components/dashboard-ui";
import { adminFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { AdminAccessRequired, AdminConsoleNav, verifyStoredAdminSession } from "@/components/admin-auth";

const STATUS_OPTIONS = ["ALL", "PENDING", "BROADCASTED", "CONFIRMED", "FAILED", "CANCELLED"];

const STATUS_LABELS = {
  ALL: "Tüm durumlar",
  PENDING: "Bekliyor",
  BROADCASTED: "Yayınlandı",
  CONFIRMED: "Onaylandı",
  FAILED: "Başarısız",
  CANCELLED: "İptal edildi",
};

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

const formatPolicyAmount = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}${suffix ? ` ${suffix}` : ""}`;
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
          setNotice({ type: "error", message: sweepsData.message || "Sweep listesi yüklenemedi." });
          return;
        }

        if (!policyResponse.ok) {
          setNotice({ type: "error", message: policyData.message || "Treasury policy yüklenemedi." });
          return;
        }

        setSweeps(sweepsData.sweeps || []);
        setStats(sweepsData.stats || { byStatus: {}, total: 0 });
        setPolicy(policyData);
      } catch (error) {
        reportClientError("admin.treasury.load", error);
        setNotice({ type: "error", message: "Treasury verileri yüklenemedi." });
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
        label: STATUS_LABELS[status] || status,
        status,
        value: stats.byStatus?.[status] || 0,
      })),
    [stats]
  );

  if (tokenState !== "valid") {
    return <AdminAccessRequired title="Hazine konsolu için admin girişi gerekli" />;
  }

  const treasuryPolicy = policy?.treasuryPolicy;
  const hotWallet = treasuryPolicy?.hotWallet;
  const coldWallet = treasuryPolicy?.coldWallet;

  return (
    <main className="admin-treasury-page min-h-screen text-zinc-100">
      <header className="admin-treasury-header border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operasyon konsolu</p>
            <h1 className="mt-1 text-2xl font-bold">Hazine ve Sweep</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Ödeme cüzdanı fon toplama kayıtları, treasury politikası ve custody durumunu izleyin.
            </p>
          </div>
          <DashboardButton
            as="a"
            href="/admin/settlement-console"
            variant="adminSecondary"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg px-4 sm:w-fit"
          >
            Settlement konsolu
          </DashboardButton>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-8 md:py-6">
        <AdminConsoleNav currentPath="/admin/treasury" onRefresh={() => fetchTreasuryData()} loading={loading || !adminAccessToken} />

        {notice && (
          <div
            className={`admin-treasury-notice rounded-lg border px-4 py-3 text-sm ${
              notice.type === "error"
                ? "admin-treasury-notice-error"
                : "admin-treasury-notice-success"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DashboardPanel variant="adminMuted" className="admin-treasury-panel rounded-lg p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sıcak cüzdan</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Operasyonel sweep toplama adresi.</p>
              </div>
              <DashboardPill
                className={`shrink-0 ${
                  hotWallet?.valid && hotWallet?.configured
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200"
                }`}
              >
                {hotWallet?.configured ? "Tanımlı" : "Eksik"}
              </DashboardPill>
            </div>
            <p className="mt-4 break-all text-sm font-semibold">{hotWallet?.address || "Henüz tanımlanmadı"}</p>
          </DashboardPanel>

          <DashboardPanel variant="adminMuted" className="admin-treasury-panel rounded-lg p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Soğuk cüzdan</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Uzun vadeli treasury saklama adresi.</p>
              </div>
              <DashboardPill
                className={`shrink-0 ${
                  coldWallet?.configured
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300"
                }`}
              >
                {coldWallet?.configured ? "Tanımlı" : "Opsiyonel"}
              </DashboardPill>
            </div>
            <p className="mt-4 break-all text-sm font-semibold">{coldWallet?.address || "Opsiyonel / tanımlı değil"}</p>
          </DashboardPanel>

          <DashboardPanel variant="adminMuted" className="admin-treasury-panel rounded-lg p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custody ve limit</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Sweep eşiği ve gas rezerv politikası.</p>
              </div>
              <DashboardPill
                className={`shrink-0 ${
                  treasuryPolicy?.ready
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                {treasuryPolicy?.ready ? "Hazır" : "Kontrol"}
              </DashboardPill>
            </div>
            <p className="mt-4 text-lg font-bold">{policy?.custodyPolicy?.provider || "-"}</p>
            <p className="mt-2 text-sm text-zinc-500">
              Eşik {formatPolicyAmount(policy?.thresholdPolicy?.minAmount, "USDT")} / gas{" "}
              {formatPolicyAmount(policy?.gasPolicy?.minTrxGas, policy?.gasPolicy?.gasAsset || "TRX")}
            </p>
          </DashboardPanel>
        </section>

        <DashboardPanel variant="adminMuted" className="admin-treasury-panel rounded-lg p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sweep kayıtları</p>
              <h2 className="mt-1 text-xl font-bold">Fon toplama hareketleri</h2>
              <p className="mt-1 text-sm text-zinc-500">{stats.total || 0} toplam sweep kaydı</p>
            </div>
            <DashboardSelect
              variant="admin"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                fetchTreasuryData(undefined, event.target.value);
              }}
              className="h-10 w-full rounded-lg md:w-56"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] || status}
                </option>
              ))}
            </DashboardSelect>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {statusCards.map((item) => (
              <DashboardMetric key={item.status} variant="admin" className="admin-treasury-metric rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </DashboardMetric>
            ))}
          </div>

          <div className="space-y-3">
            {sweeps.map((sweep) => (
              <DashboardPanel
                as="div"
                key={sweep.id}
                variant="admin"
                className="admin-treasury-sweep-card grid grid-cols-1 gap-4 rounded-lg p-4 text-sm sm:p-4 lg:grid-cols-[132px_180px_1fr_170px]"
              >
                <div>
                  <DashboardPill className={`w-fit ${getStatusClassName(sweep.status)}`}>
                    {STATUS_LABELS[sweep.status] || sweep.status}
                  </DashboardPill>
                  <p className="mt-3 text-xs text-zinc-500">Sweep ID</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-400">{shortId(sweep.id)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tutar</p>
                  <p className="mt-2 text-xl font-bold">{sweep.amount} {sweep.currency}</p>
                  <p className="mt-1 text-xs text-zinc-500">Gas {sweep.gasAmount || "-"} {sweep.gasAsset}</p>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Adres akışı</p>
                  <p className="mt-2 break-all text-zinc-300">
                    {shortId(sweep.fromAddress)} {"->"} {shortId(sweep.toAddress)}
                  </p>
                  <p className="mt-2 break-all text-xs text-zinc-500">Payment {shortId(sweep.paymentId)}</p>
                </div>

                <div className="text-left text-zinc-500 lg:text-right">
                  <p>{formatDate(sweep.createdAt)}</p>
                  <p className="mt-2 break-all text-xs">{sweep.txHash ? shortId(sweep.txHash) : "Tx bekleniyor"}</p>
                </div>
              </DashboardPanel>
            ))}
          </div>

          {!loading && sweeps.length === 0 && (
            <DashboardEmptyState variant="admin" className="rounded-lg p-6">
              Bu filtre için sweep kaydı yok.
            </DashboardEmptyState>
          )}
        </DashboardPanel>
      </div>
    </main>
  );
}
