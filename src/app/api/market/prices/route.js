import { NextResponse } from "next/server";

const COINS = [
  { symbol: "BTC", id: "bitcoin" },
  { symbol: "ETH", id: "ethereum" },
  { symbol: "BNB", id: "binancecoin" },
  { symbol: "SOL", id: "solana" },
  { symbol: "TRX", id: "tron" },
  { symbol: "USDT", id: "tether" },
  { symbol: "XRP", id: "ripple" },
  { symbol: "XLM", id: "stellar" },
  { symbol: "XMR", id: "monero" },
];

const FALLBACK_PRICES = {
  BTC: { usd: 70000, change24h: 0 },
  ETH: { usd: 3500, change24h: 0 },
  BNB: { usd: 600, change24h: 0 },
  SOL: { usd: 150, change24h: 0 },
  TRX: { usd: 0.12, change24h: 0 },
  USDT: { usd: 1, change24h: 0 },
  XRP: { usd: 0.6, change24h: 0 },
  XLM: { usd: 0.12, change24h: 0 },
  XMR: { usd: 140, change24h: 0 },
};

export async function GET() {
  try {
    const ids = COINS.map((coin) => coin.id).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json({
        prices: FALLBACK_PRICES,
        updatedAt: new Date().toISOString(),
        source: "fallback",
        message: "Price provider error",
      });
    }

    const data = await response.json();
    const prices = COINS.reduce((acc, coin) => {
      acc[coin.symbol] = {
        usd: Number(data?.[coin.id]?.usd || 0),
        change24h: Number(data?.[coin.id]?.usd_24h_change || 0),
      };
      return acc;
    }, {});

    return NextResponse.json({
      prices,
      updatedAt: new Date().toISOString(),
      source: "live",
    });
  } catch {
    return NextResponse.json({
      prices: FALLBACK_PRICES,
      updatedAt: new Date().toISOString(),
      source: "fallback",
      message: "Price fetch error",
    });
  }
}
