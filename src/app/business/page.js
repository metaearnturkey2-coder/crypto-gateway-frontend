"use client";

import Link from "next/link";
import OverviewShell from "@/components/overview-shell";

export default function BusinessPage() {
  return (
    <OverviewShell>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-zinc-500">Business</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">Business wallet workspace</h1>
          <p className="mt-3 text-zinc-600">
            Manage confirmed balances, payout requests, payment operations, and
            API integration activity from the business wallet area.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/business-wallet" className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-black">
            Wallet overview
          </Link>
          <Link href="/business-wallet/merchants" className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-white">
            Payment operations
          </Link>
          <Link href="/business-wallet/api-docs" className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-white">
            API usage
          </Link>
        </div>
      </section>
    </OverviewShell>
  );
}
