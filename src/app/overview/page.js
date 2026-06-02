"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OverviewShell from "@/components/overview-shell";
import { apiUrl } from "@/lib/api";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
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
        const res = await fetch(apiUrl("/api/merchant/dashboard"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const summary = data?.settlements?.summary;
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
      <div className="max-w-6xl">
        <div className="rounded-2xl border border-zinc-300 bg-[#e8e8ea] px-5 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-2xl font-semibold text-zinc-900 mb-4 md:text-4xl">Total funds</p>
              {loading ? (
                <p className="text-zinc-500 text-xl">Loading...</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-4xl font-bold text-zinc-900 leading-none tracking-tight md:text-6xl">
                    {formatUsdAmount(available)}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-4 py-2 text-base font-semibold text-zinc-800 border border-zinc-200">
                    {currency}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[480px]">
              <Link href="/business-wallet/merchants" className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-black transition">
                Create payment
              </Link>
              <Link href="/business-wallet" className="flex h-12 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 border border-zinc-300 shadow-sm hover:bg-white transition">
                Request payout
              </Link>
              <Link href="/business-wallet/api-docs" className="flex h-12 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 border border-zinc-300 shadow-sm hover:bg-white transition">
                API docs
              </Link>
            </div>
          </div>

        </div>

        <div className="mt-6 rounded-2xl border border-zinc-300 bg-[#ececef] px-5 py-5 md:px-8 md:py-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-2xl font-semibold text-zinc-900">Business Wallet</h3>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              {network} {currency}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-300 bg-white/70 px-5 py-5">
              <p className="text-sm font-medium text-zinc-600 mb-2">Available</p>
              <p className="text-3xl font-bold text-zinc-900 leading-none md:text-4xl">
                {loading ? "..." : `${Number(available || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-300 bg-white/70 px-5 py-5">
              <p className="text-sm font-medium text-zinc-600 mb-2">Gross Paid</p>
              <p className="text-3xl font-bold text-zinc-900 leading-none md:text-4xl">
                {loading ? "..." : `${Number(grossPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-300 bg-white/70 px-5 py-5">
              <p className="text-sm font-medium text-zinc-600 mb-2">Reserved</p>
              <p className="text-3xl font-bold text-zinc-900 leading-none md:text-4xl">
                {loading ? "..." : `${Number(reserved || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-9">
          <h3 className="text-3xl font-semibold text-zinc-900 mb-4">Assets</h3>
          <div className="rounded-2xl border border-zinc-300 bg-[#efeff1] shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-4 border-b border-zinc-300 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div className="flex items-center gap-5 text-lg font-semibold md:text-xl">
                <button
                  onClick={() => setActiveAssetsTab("personal")}
                  className={`pb-2 border-b-4 transition ${
                    activeAssetsTab === "personal" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500"
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setActiveAssetsTab("business")}
                  className={`pb-2 border-b-4 transition ${
                    activeAssetsTab === "business" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500"
                  }`}
                >
                  Business
                </button>
              </div>
              <Link href="/business-wallet" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition">
                Wallet details
              </Link>
            </div>
            <div className="px-6 py-2 text-sm text-zinc-500 border-b border-zinc-300">
              {pricesLoading
                ? "Updating prices..."
                : pricesError
                ? pricesError
                : pricesUpdatedAt
                ? `Updated ${new Date(pricesUpdatedAt).toLocaleTimeString()}`
                : "Live prices"}
            </div>

            <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_1fr] gap-3 px-6 py-3 text-sm uppercase tracking-wide text-zinc-500 border-b border-zinc-300 bg-zinc-100/60 md:grid">
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
                  className="grid grid-cols-1 gap-4 px-5 py-4 border-b last:border-b-0 border-zinc-300 hover:bg-white/50 transition md:grid-cols-[1.5fr_1.2fr_1fr_1fr] md:items-center md:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-zinc-300 text-zinc-700 flex items-center justify-center text-xs font-bold shadow-sm">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-semibold text-zinc-900 truncate tracking-tight md:text-2xl">{asset.symbol}</p>
                      <p className="text-sm text-zinc-500 truncate">{asset.name}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Balance</p>
                    <p className="text-xl font-semibold text-zinc-900 break-words md:text-2xl">{formatTokenBalance(balance)}</p>
                    <p className="text-sm text-zinc-500">{formatUsdAmount(usdValue)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Price</p>
                    <p className="text-xl font-semibold text-zinc-900 md:text-2xl">
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
                    <span className="inline-flex h-7 w-7 rounded-full border-4 border-zinc-300" />
                    <p className="text-xs font-semibold uppercase text-zinc-500 md:hidden">Allocation</p>
                    <p className="text-lg font-semibold text-zinc-800 md:text-xl">{allocation.toFixed(1)}%</p>
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
