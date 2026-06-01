"use client";

import { useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";

export default function SecuritySettingsPage() {
  const [merchant, setMerchant] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/merchant/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Merchant data error");
        return;
      }
      setMerchant(data.merchant || null);
      setWebhookUrl(data.merchant?.webhookUrl || "");
    } catch {
      alert("Merchant data error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const saveWebhookUrl = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch("http://localhost:5000/api/merchant/webhook-url", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Webhook URL save error");
        return;
      }
      alert("Webhook URL updated");
      setMerchant((prev) => ({ ...prev, webhookUrl: data.webhookUrl || webhookUrl }));
    } catch {
      alert("Webhook URL save error");
    } finally {
      setSaving(false);
    }
  };

  const regenerateWebhookSecret = async () => {
    if (!confirm("Webhook secret regenerate edilsin mi?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setRegenerating(true);
    try {
      const response = await fetch("http://localhost:5000/api/merchant/webhook-secret/regenerate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Webhook secret regenerate error");
        return;
      }
      setMerchant((prev) => ({ ...prev, webhookSecret: data.webhookSecret }));
      alert("Webhook secret regenerated");
    } catch {
      alert("Webhook secret regenerate error");
    } finally {
      setRegenerating(false);
    }
  };

  const copyApiKey = async () => {
    if (!merchant?.apiKey) return;
    try {
      await navigator.clipboard.writeText(merchant.apiKey);
      alert("API key copied");
    } catch {
      alert("Copy failed");
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm("API key regenerate edilsin mi?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch("http://localhost:5000/api/merchant/api-key/regenerate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "API key regenerate error");
        return;
      }
      setMerchant((prev) => ({ ...prev, apiKey: data.apiKey }));
      alert("API key regenerated");
    } catch {
      alert("API key regenerate error");
    }
  };

  return (
    <OverviewShell>
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Security</h2>
          <p className="text-zinc-400 mt-2">Configure your receiver URL and manage webhook credentials.</p>

          <div className="mt-6 flex gap-3 flex-col md:flex-row">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-site.com/webhook"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-zinc-500"
            />
            <button
              onClick={saveWebhookUrl}
              disabled={loading || saving}
              className="rounded-xl bg-zinc-100 text-zinc-900 px-6 py-3 font-semibold hover:bg-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save URL"}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs uppercase tracking-wide">Webhook Secret</p>
              <p className="text-zinc-500 text-sm">Sensitive</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={merchant?.webhookSecret || ""}
                readOnly
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100"
              />
              <button
                onClick={async () => {
                  if (!merchant?.webhookSecret) return;
                  await navigator.clipboard.writeText(merchant.webhookSecret);
                  alert("Webhook secret copied");
                }}
                className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800"
              >
                Copy Secret
              </button>
              <button
                onClick={regenerateWebhookSecret}
                disabled={regenerating}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">API Access</h2>
          <p className="text-zinc-400 mb-4">Use this key to create payments from external merchant websites.</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={merchant?.apiKey || ""}
              readOnly
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100"
            />
            <button
              onClick={copyApiKey}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Copy API Key
            </button>
            <button
              onClick={regenerateApiKey}
              className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </OverviewShell>
  );
}
