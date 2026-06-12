import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  KeyRound,
  RadioTower,
  ShieldCheck,
  WalletCards,
  Webhook,
} from "lucide-react";

const metrics = [
  { label: "Ödeme sayfası", value: "TRC20 USDT" },
  { label: "Merchant API", value: "Canlı/Test key" },
  { label: "Operasyon", value: "Webhook + ledger" },
];

const workflow = [
  {
    icon: Code2,
    title: "Ödeme oluştur",
    text: "Sunucunuzdan idempotency ve API key kapsamlarıyla checkout oturumu başlatın.",
  },
  {
    icon: WalletCards,
    title: "USDT tahsil edin",
    text: "Tutar, cüzdan, süre ve ödeme durumunu gösteren hosted TRC20 ödeme sayfası sunun.",
  },
  {
    icon: Webhook,
    title: "Mutabakat yapın",
    text: "İmzalı webhook gönderimlerini, tekrar denemeleri ve bakiyeleri ledger üzerinden izleyin.",
  },
];

const readiness = [
  "API key mod ayrımı",
  "Webhook teslimat kanıtı",
  "Ledger ve payout izi",
  "Admin settlement kontrolleri",
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:mx-0">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between border-b border-zinc-800 px-1 pb-3">
          <div>
            <p className="text-xs font-semibold text-emerald-300">Crypto Gateway</p>
            <p className="mt-1 text-sm font-bold text-white">Merchant operasyonları</p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Canlı mod
          </span>
        </div>

        <div className="grid gap-3 py-3 sm:grid-cols-3">
          {[
            ["Tahsilat hacmi", "12,480 USDT"],
            ["Bekleyen", "320 USDT"],
            ["Webhook başarı", "99.8%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black/35 p-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Checkout oturumu</p>
                <p className="mt-1 text-xs text-zinc-500">Sipariş CG-1048 / 14:22 içinde sona erer</p>
              </div>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                Bekliyor
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500">Ödenecek tutar</p>
                  <p className="mt-1 text-2xl font-bold text-white">148.00 USDT</p>
                </div>
                <div className="grid h-16 w-16 grid-cols-4 gap-1 rounded-md border border-zinc-700 bg-white p-2">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <span
                      key={index}
                      className={`rounded-sm ${index % 3 === 0 || index === 10 ? "bg-black" : "bg-zinc-300"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-md border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-400">
                TQx7...9mP2 / TRC20
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-sm font-bold text-white">Webhook akışı</p>
            <div className="mt-3 space-y-3">
              {[
                ["payment.created", "teslim edildi"],
                ["payment.pending", "teslim edildi"],
                ["ledger.hold", "kuyrukta"],
              ].map(([event, state]) => (
                <div key={event} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-emerald-300">
                    {state === "kuyrukta" ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">{event}</p>
                    <p className="text-xs text-zinc-500">{state}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <nav className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-bold text-white">
            Crypto Gateway
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:text-white"
            >
              Giriş
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-white bg-white px-3 py-2 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              Hesap oluştur
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(440px,1fr)] lg:px-8 lg:py-14">
        <div>
          <p className="text-sm font-semibold text-emerald-300">USDT TRC20 ödeme altyapısı</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[44px]">
            Crypto Gateway ile hosted checkout, webhook, ledger ve payout akışlarını yönetin.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
            USDT TRC20 ödemeleri; ödeme durumu, callback teslimatı, bakiye mutabakatı
            ve pilot operasyonları için hazırlanmış merchant paneliyle alın.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white bg-white px-5 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              Hesap oluştur
              <ArrowRight className="ml-2" size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:border-zinc-500"
            >
              Giriş
            </Link>
            <Link
              href="/business-wallet/api-docs"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-zinc-400 transition hover:text-white"
            >
              API dokümanları
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 sm:py-3">
                <p className="text-xs text-zinc-500">{metric.label}</p>
                <p className="mt-1 text-xs font-bold text-white sm:text-sm">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="border-t border-zinc-900 bg-zinc-950/35">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
                  <Icon size={18} />
                </span>
                <h2 className="mt-4 text-base font-bold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[0.8fr_1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Pilot hazırlığı</p>
          <h2 className="mt-3 text-2xl font-bold text-white">İlk günden operasyon kanıtı.</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Canlıya çıkmadan önce tahsilat, webhook sağlığı, ledger hareketi ve payout
            incelemesini merchant ve admin akışında birlikte takip edin.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {readiness.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                {item.includes("Webhook") ? (
                  <RadioTower size={16} />
                ) : item.includes("API") ? (
                  <KeyRound size={16} />
                ) : item.includes("payout") ? (
                  <ShieldCheck size={16} />
                ) : (
                  <Activity size={16} />
                )}
              </span>
              <p className="text-sm font-semibold text-zinc-200">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
