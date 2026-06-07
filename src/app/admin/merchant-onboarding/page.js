"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const readJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const body = await response.text();
  return {
    message: `Expected JSON but received ${contentType || "unknown content"}.`,
    responsePreview: body.replace(/\s+/g, " ").slice(0, 180),
  };
};

const getStatusClassName = (status) => {
  if (status === "READY" || status === "PASS") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (status === "BLOCKED" || status === "FAIL") return "border-red-400/40 bg-red-500/10 text-red-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
};

const formatCode = (value) =>
  String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const summarizeDetails = (details = {}) => {
  if (!details || Object.keys(details).length === 0) return [];

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => [
      key,
      Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : String(value),
    ]);
};

export default function AdminMerchantOnboardingPage() {
  const [adminToken, setAdminToken] = useState("");
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [tokenState, setTokenState] = useState("unknown");
  const [merchantId, setMerchantId] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [summary, setSummary] = useState({ blocked: 0, ready: 0, review_required: 0, total: 0 });

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
        const data = await readJsonResponse(response);

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
        console.error(error);
        setNotice({ type: "error", message: "Merchant onboarding request failed." });
      } finally {
        setLoading(false);
      }
    },
    [adminAccessToken, adminFetch, limit, merchantId, onlyBlocked]
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
        headers: { "Content-Type": "application/json" },
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
      await loadChecklists(data.accessToken);
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
        loadChecklists(savedAccessToken);
      }
    });
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
            <a href="/admin/pilot-readiness" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Pilot Readiness
            </a>
            <a href="/admin/reconciliation" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Reconciliation
            </a>
            <a href="/admin/risk-review" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-800">
              Risk Review
            </a>
          </div>
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
            <button onClick={() => loadChecklists()} disabled={loading || !adminAccessToken} className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 font-semibold disabled:opacity-40">
              Yenile
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto]">
            <input
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              placeholder="Merchant ID ile tek kontrol"
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
            />
            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none"
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
          </div>
          <p className="mt-3 text-xs text-zinc-500">Oturum: {tokenState}</p>
          {notice && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
              {notice.message}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.className}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          {checklists.map((checklist) => (
            <article key={checklist.merchant.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{checklist.merchant.name}</h2>
                  <p className="text-sm text-zinc-500">{checklist.merchant.email}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-600">{checklist.merchant.id}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(checklist.overallStatus)}`}>
                  {checklist.overallStatus}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {(checklist.checks || []).map((check) => (
                  <div key={check.code} className="rounded-xl border border-zinc-800 bg-black p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{formatCode(check.code)}</p>
                        <p className="mt-1 text-sm text-zinc-500">{check.message}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2">
                      {summarizeDetails(check.details).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <p className="font-semibold text-zinc-400">{key}</p>
                          <p className="mt-1 break-words font-mono">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
