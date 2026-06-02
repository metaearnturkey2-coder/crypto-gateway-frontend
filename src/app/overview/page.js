"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    expired: 0,
  });
  const [apiUsage, setApiUsage] = useState({
    total: 0,
    createCalls: 0,
    statusCalls: 0,
  });
  const [webhookTestCompleted, setWebhookTestCompleted] = useState(false);
  const [available, setAvailable] = useState(0);
  const [grossPaid, setGrossPaid] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [network, setNetwork] = useState("TRC20");
  const [currency, setCurrency] = useState("USDT");
  const [activeAssetsTab, setActiveAssetsTab] = useState("personal");
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState("");
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState("");
  const [balances, setBalances] = useState({
    BTC: 0,
    ETH: 0,
    BNB: 0,
    SOL: 0,
    TRX: 0,
    USDT: 0,
    XRP: 0,
    XLM: 0,
    XMR: 0,
  });

  const assetRows = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "BNB", name: "BNB" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "TRX", name: "Tron" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "XRP", name: "XRP" },
    { symbol: "XLM", name: "Stellar" },
    { symbol: "XMR", name: "Monero" },
  ];

  const formatUsdAmount = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "$0.00";
    return `$${numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatUsdPrice = (symbol, value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "$0.00";

    const stableSymbols = new Set(["USDT", "USDC", "BUSD", "DAI"]);
    if (stableSymbols.has(symbol)) {
      return `$${numeric.toFixed(4)}`;
    }

    if (numeric >= 1000) {
      return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (numeric >= 1) {
      return `$${numeric.toFixed(2)}`;
    }

    if (numeric >= 0.01) {
      return `$${numeric.toFixed(4)}`;
    }

    return `$${numeric.toFixed(6)}`;
  };

  const formatChange = (value) => {
    const numeric = Number(value || 0);
    const sign = numeric > 0 ? "+" : "";
    return `${sign}${numeric.toFixed(2)}%`;
  };

  const formatTokenBalance = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    });

  const totalUsdBalance = assetRows.reduce((sum, asset) => {
    const balance = Number(balances?.[asset.symbol] || 0);
    const priceUsd = Number(prices?.[asset.symbol]?.usd || 0);
    return sum + balance * priceUsd;
  }, 0);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const [dashboardRes, settlementsRes, paymentsRes, apiUsageRes, webhookTestRes] = await Promise.all([
          fetch(apiUrl("/api/merchant/dashboard"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(apiUrl("/api/merchant/settlements"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(apiUrl("/api/payments?limit=1"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(apiUrl("/api/merchant/api-usage"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(apiUrl("/api/merchant/audit-logs?action=webhook.test&limit=1"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);

        if ([dashboardRes, settlementsRes, paymentsRes, apiUsageRes, webhookTestRes].some((response) => response.status === 401)) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        const dashboardData = dashboardRes.ok ? await dashboardRes.json() : {};
        const settlementsData = settlementsRes.ok ? await settlementsRes.json() : {};
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : {};
        const apiUsageData = apiUsageRes.ok ? await apiUsageRes.json() : {};
        const webhookTestData = webhookTestRes.ok ? await webhookTestRes.json() : {};

        setMerchant(dashboardData?.merchant || null);
        setPaymentStats(paymentsData?.stats || { total: 0, paid: 0, pending: 0, expired: 0 });
        setApiUsage(apiUsageData?.summary || { total: 0, createCalls: 0, statusCalls: 0 });
        setWebhookTestCompleted(Number(webhookTestData?.totalCount || webhookTestData?.count || 0) > 0);

        const summary = settlementsData?.summary;
        if (summary) {
          setAvailable(Number(summary.available || 0));
          setGrossPaid(Number(summary.grossPaid || 0));
          setReserved(Number(summary.reservedForPayouts || 0));
          setNetwork(summary.network || "TRC20");
          setCurrency(summary.currency || "USDT");
          setBalances((prev) => ({
            ...prev,
            USDT: Number(summary.available || 0),
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onboardingSteps = [
    {
      title: "Create business account",
      description: "Merchant profile and authenticated dashboard access are ready.",
      done: Boolean(merchant?.id),
      href: "/overview",
      action: "Dashboard",
    },
    {
      title: "Add webhook URL",
      description: "Send payment status updates to your own system automatically.",
      done: Boolean(merchant?.callbackUrl),
      href: "/settings/security",
      action: merchant?.callbackUrl ? "Webhook settings" : "Add URL",
    },
    {
      title: "Prepare API access",
      description: "Review the public payment API access used to create checkouts.",
      done: Boolean(merchant?.apiKey),
      href: "/business-wallet/api-docs",
      action: "API docs",
    },
    {
      title: "Create first payment",
      description: "Use a test order to verify checkout and customer payment flow.",
      done: Number(paymentStats.total || 0) > 0,
      href: "/business-wallet/merchants",
      action: "Create payment",
    },
    {
      title: "Run integration test",
      description: "Confirm that API traffic or a webhook test can be completed.",
      done: Number(apiUsage.total || 0) > 0 || webhookTestCompleted,
      href: "/business-wallet/api-docs",
      action: "Test now",
    },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.done).length;
  const onboardingProgress = Math.round((completedOnboardingSteps / onboardingSteps.length) * 100);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        setPricesLoading(true);
        setPricesError("");
        const response = await fetch("/api/market/prices", { cache: "no-store" });
        const data = await response.json();
        if (data?.prices) {
          setPrices(data.prices);
          setPricesUpdatedAt(data.updatedAt || "");
          setPricesError(data?.source === "fallback" ? "Live price provider unavailable, showing backup prices." : "");
        } else {
          setPricesError(data?.message || "Price service unavailable");
        }
      } catch {
        setPricesError("Price service unavailable");
      } finally {
        setPricesLoading(false);
      }
    };

    loadPrices();
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <OverviewShell>
      <div className="max-w-[1108px]">
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-base font-semibold text-white">Total funds</p>
              {loading ? (
                <p className="text-zinc-500 text-xl">Loading...</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-3xl font-bold leading-none tracking-tight text-white">
                    {formatUsdAmount(available)}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                    {currency}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[390px]">
              <Link href="/business-wallet/merchants" className="flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-950 transition">
                Create payment
              </Link>
              <Link href="/business-wallet" className="flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 shadow-sm hover:bg-zinc-800 transition">
                Request payout
              </Link>
              <Link href="/business-wallet/api-docs" className="flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 shadow-sm hover:bg-zinc-800 transition">
                API docs
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-zinc-300">Available</p>
              <p className="text-2xl font-bold leading-none text-white">
                {loading ? "..." : `${Number(available || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-500">{network}</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-zinc-300">Gross Paid</p>
              <p className="text-2xl font-bold leading-none text-white">
                {loading ? "..." : `${Number(grossPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-500">Settled volume</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-zinc-300">Reserved</p>
              <p className="text-2xl font-bold leading-none text-white">
                {loading ? "..." : `${Number(reserved || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-500">Payout hold</p>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Onboarding Checklist</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Go-live readiness</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Complete the core integration steps before accepting production payments.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 lg:min-w-[190px]">
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-400">Progress</p>
                <p className="text-2xl font-bold text-white">{onboardingProgress}%</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${onboardingProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-500">
                {completedOnboardingSteps}/{onboardingSteps.length} completed
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
            {onboardingSteps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className="group flex min-h-[170px] flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-600 hover:bg-black"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${
                        step.done
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {step.done ? "OK" : index + 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        step.done ? "bg-emerald-400/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {step.done ? "Done" : "Next"}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-zinc-500">{step.description}</p>
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-300 group-hover:text-white">{step.action}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-2xl font-semibold text-zinc-900 mb-4">Assets</h3>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 shadow-[0_8px_24px_rgba(0,0,0,0.16)] overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-4 border-b border-zinc-800 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div className="flex items-center gap-5 text-base font-semibold">
                <button
                  onClick={() => setActiveAssetsTab("personal")}
                  className={`pb-2 border-b-4 transition ${
                    activeAssetsTab === "personal" ? "border-white text-white" : "border-transparent text-zinc-500"
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setActiveAssetsTab("business")}
                  className={`pb-2 border-b-4 transition ${
                    activeAssetsTab === "business" ? "border-white text-white" : "border-transparent text-zinc-500"
                  }`}
                >
                  Business
                </button>
              </div>
              <Link href="/business-wallet" className="text-sm font-semibold text-zinc-400 hover:text-white transition">
                Wallet details
              </Link>
            </div>
            <div className="px-6 py-2 text-sm text-zinc-500 border-b border-zinc-800">
              {pricesLoading
                ? "Updating prices..."
                : pricesError
                ? pricesError
                : pricesUpdatedAt
                ? `Updated ${new Date(pricesUpdatedAt).toLocaleTimeString()}`
                : "Live prices"}
            </div>

            <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_1fr] gap-3 px-6 py-3 text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800 bg-zinc-950 md:grid">
              <span>Name</span>
              <span>Balance</span>
              <span>Price</span>
              <span>Allocation</span>
            </div>

            <div>
              {assetRows.map((asset) => (
                (() => {
                  const balance = Number(balances?.[asset.symbol] || 0);
                  const priceUsd = Number(prices?.[asset.symbol]?.usd || 0);
                  const usdValue = balance * priceUsd;
                  const allocation = totalUsdBalance > 0 ? (usdValue / totalUsdBalance) * 100 : 0;
                  return (
                <div
                  key={asset.symbol}
                  className="grid grid-cols-1 gap-4 px-5 py-4 border-b last:border-b-0 border-zinc-800 hover:bg-zinc-950/60 transition md:grid-cols-[1.5fr_1.2fr_1fr_1fr] md:items-center md:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[11px] font-bold shadow-sm">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white truncate tracking-tight">{asset.symbol}</p>
                      <p className="text-sm text-zinc-500 truncate">{asset.name}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Balance</p>
                    <p className="text-lg font-semibold text-white break-words">{formatTokenBalance(balance)}</p>
                    <p className="text-sm text-zinc-500">{formatUsdAmount(usdValue)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Price</p>
                    <p className="text-lg font-semibold text-white">
                      {pricesLoading ? "..." : formatUsdPrice(asset.symbol, prices?.[asset.symbol]?.usd)}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        Number(prices?.[asset.symbol]?.change24h || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {pricesLoading ? "--" : formatChange(prices?.[asset.symbol]?.change24h)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 rounded-full border-4 border-zinc-700" />
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Allocation</p>
                    <p className="text-base font-semibold text-white">{allocation.toFixed(1)}%</p>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>
        </section>
      </div>
    </OverviewShell>
  );
}
