"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const STATUS_OPTIONS = ["ALL", "PENDING", "BROADCASTED", "CONFIRMED", "FAILED", "CANCELLED"];

const readJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const body = await response.text();

  return {
    message: `Expected JSON but received ${contentType || "unknown content"}.`,
    responsePreview: body.replace(/\s+/g, " ").slice(0, 140),
  };
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

const shortId = (value) => {
  if (!value) return "-";
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
};

export default function AdminTreasuryPage() {
  const [adminToken, setAdminToken] = useState("");
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sweeps, setSweeps] = useState([]);
  const [stats, setStats] = useState({ byStatus: {}, total: 0 });
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

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
        const sweepsData = await readJsonResponse(sweepsResponse);
        const policyData = await readJsonResponse(policyResponse);

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
        console.error(error);
        setNotice({ type: "error", message: "Treasury verileri yuklenemedi." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, adminFetch, statusFilter]
  );

  const login = async () => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      setNotice({ type: "error", message: "Internal admin token girin." });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token: trimmedToken }),
      });
      const data = await readJsonResponse(response);

      if (!response.ok || !data.accessToken) {
        setTokenState("invalid");
        setNotice({ type: "error", message: data.message || "Admin token gecersiz." });
        return;
      }

      localStorage.setItem("adminAccessToken", data.accessToken);
      localStorage.setItem("adminToken", trimmedToken);
      setAdminAccessToken(data.accessToken);
      setTokenState("valid");
      await fetchTreasuryData(data.accessToken);
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", message: "Admin login hatasi." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      const savedToken = localStorage.getItem("adminToken") || "";
      const savedAccessToken = localStorage.getItem("adminAccessToken") || "";
      setAdminToken(savedToken);

      if (savedAccessToken) {
        setAdminAccessToken(savedAccessToken);
        setTokenState("valid");
        fetchTreasuryData(savedAccessToken);
      }
    });
  }, [fetchTreasuryData]);

  const statusCards = useMemo(
    () =>
      STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => ({
        status,
        value: stats.byStatus?.[status] || 0,
      })),
    [stats]
  );

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
          <a href="/admin/settlement-console" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
            Settlement Console
          </a>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Internal admin token"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
            />
            <button onClick={login} disabled={loading} className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-40">
              Token dogrula
            </button>
            <button onClick={() => fetchTreasuryData()} disabled={loading || !adminAccessToken} className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 font-semibold disabled:opacity-40">
              Yenile
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Oturum: {tokenState}</p>
          {notice && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
              {notice.message}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Hot wallet</p>
            <p className="mt-3 break-all text-sm">{policy?.treasuryPolicy?.hotWallet?.address || "Not configured"}</p>
            <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${policy?.treasuryPolicy?.hotWallet?.valid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
              {policy?.treasuryPolicy?.hotWallet?.configured ? "configured" : "missing"}
            </span>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cold wallet</p>
            <p className="mt-3 break-all text-sm">{policy?.treasuryPolicy?.coldWallet?.address || "Optional / not configured"}</p>
            <span className="mt-4 inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
              {policy?.treasuryPolicy?.coldWallet?.configured ? "configured" : "optional"}
            </span>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custody</p>
            <p className="mt-3 text-lg font-bold">{policy?.custodyPolicy?.provider || "-"}</p>
            <p className="mt-2 text-sm text-zinc-500">Threshold {policy?.thresholdPolicy?.minAmount || "-"} USDT, gas {policy?.gasPolicy?.minTrxGas || "-"} TRX</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Sweep kayitlari</h2>
              <p className="mt-1 text-sm text-zinc-500">{stats.total || 0} toplam sweep kaydi</p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                fetchTreasuryData(undefined, event.target.value);
              }}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {statusCards.map((item) => (
              <div key={item.status} className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold text-zinc-500">{item.status}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {sweeps.map((sweep) => (
              <div key={sweep.id} className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-black p-4 text-sm lg:grid-cols-[140px_1fr_1fr_160px]">
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(sweep.status)}`}>
                  {sweep.status}
                </span>
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
              </div>
            ))}
          </div>

          {!loading && sweeps.length === 0 && (
            <p className="rounded-xl border border-zinc-800 bg-black p-6 text-zinc-500">Bu filtre icin sweep kaydi yok.</p>
          )}
        </section>
      </div>
    </main>
  );
}
