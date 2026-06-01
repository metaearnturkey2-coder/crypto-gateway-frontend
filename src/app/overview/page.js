"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(0);
  const [currency, setCurrency] = useState("USDT");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/merchant/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const summary = data?.settlements?.summary;
        if (summary) {
          setAvailable(Number(summary.available || 0));
          setCurrency(summary.currency || "USDT");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <OverviewShell>
      <div className="rounded-3xl bg-[#e8e8e8] p-8 md:p-10 max-w-3xl">
        <p className="text-3xl font-semibold text-zinc-900 mb-4">Total funds</p>
        {loading ? (
          <p className="text-zinc-500 text-xl">Loading...</p>
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-6xl md:text-7xl font-bold text-zinc-900">
              {available} {currency}
            </p>
          </div>
        )}
      </div>
    </OverviewShell>
  );
}
