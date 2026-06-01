"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MerchantTopbar from "@/components/merchant-topbar";

const navItems = [
  { href: "/overview", label: "overview" },
  { href: "/business", label: "business" },
  { href: "/trade", label: "Trade" },
  { href: "/history", label: "History" },
  { href: "/settings/security", label: "Settings" },
];

export default function OverviewShell({ children }) {
  const pathname = usePathname();
  const [businessOpen, setBusinessOpen] = useState(false);

  useEffect(() => {
    const close = () => setBusinessOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900">
      <MerchantTopbar />

      <nav className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap items-center gap-8 h-20">
            {navItems.map((item) => {
              if (item.href === "/business") {
                const active = pathname === item.href;
                return (
                  <div key={item.href} className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBusinessOpen((v) => !v);
                      }}
                      className="relative py-6 text-3xl font-semibold capitalize"
                    >
                      {item.label}
                      {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] bg-black rounded-full" />}
                    </button>

                    {businessOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 z-50 w-[360px] rounded-2xl border border-zinc-200 bg-white shadow-xl p-3 space-y-1"
                      >
                        <Link href="/business-wallet" className="block rounded-xl px-4 py-3 hover:bg-zinc-100">
                          <p className="text-lg font-semibold">Business overview</p>
                        </Link>
                        <Link href="/business-wallet/merchants" className="block rounded-xl px-4 py-3 hover:bg-zinc-100">
                          <p className="text-lg font-semibold">Merchants</p>
                        </Link>
                        <button className="w-full text-left rounded-xl px-4 py-3 hover:bg-zinc-100">
                          <p className="text-lg font-semibold">Transfer</p>
                        </button>
                        <Link href="/business-wallet/api-docs" className="block rounded-xl px-4 py-3 hover:bg-zinc-100">
                          <p className="text-lg font-semibold">Api docs</p>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }
              const active =
                item.href === "/settings/security"
                  ? pathname.startsWith("/settings")
                  : pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className="relative py-6 text-3xl font-semibold capitalize">
                  {item.label}
                  {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] bg-black rounded-full" />}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">{children}</section>
    </main>
  );
}
