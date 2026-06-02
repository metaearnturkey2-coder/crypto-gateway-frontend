"use client";

import Link from "next/link";
import OverviewShell from "@/components/overview-shell";

export default function HistoryPage() {
  return (
    <OverviewShell>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-zinc-500">History</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">Activity lives in merchant payments</h1>
          <p className="mt-3 text-zinc-600">
            Payment history, webhook attempts, and audit events are available in
            the merchant payments workspace with filters and pagination.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/business-wallet/merchants" className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-black">
            Open payment history
          </Link>
          <Link href="/business-wallet/api-docs" className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-white">
            Review API usage
          </Link>
        </div>
      </section>
    </OverviewShell>
  );
}
