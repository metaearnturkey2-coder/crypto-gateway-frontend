"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useDashboardLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || t("auth.accountCreated"),
        });
        window.location.href = "/login";
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        const minutes = Math.ceil(Number(data.retryAfterSeconds) / 60);
        setMessage({
          type: "error",
          text: t("auth.tooManyRegister")
            .replace("{minutes}", minutes)
            .replace("{plural}", minutes === 1 ? "" : "s"),
        });
        return;
      }

      setMessage({
        type: "error",
        text: data.message || t("auth.registerFailed"),
      });
    } catch (error) {
      reportClientError("auth.register", error);
      setMessage({
        type: "error",
        text: t("auth.registerError"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <section>
          <p className="text-blue-400 font-semibold mb-4">
            Crypto Gateway
          </p>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            {t("auth.registerHeroTitle")}
          </h1>

          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            {t("auth.registerHeroDescription")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">TRC20</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.usdtNetwork")}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">API</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.merchantReady")}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">QR</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.checkoutFlow")}</p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              {t("auth.createMerchantAccount")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("auth.registerDescription")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                {t("auth.merchantName")}
              </label>
              <input
                type="text"
                name="name"
                placeholder={t("auth.namePlaceholder")}
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                {t("auth.emailAddress")}
              </label>
              <input
                type="email"
                name="email"
                placeholder="merchant@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                {t("auth.password")}
              </label>
              <input
                type="password"
                name="password"
                placeholder={t("auth.passwordMinPlaceholder")}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6 text-center">
            {t("auth.alreadyHaveAccount")}{" "}
            <a href="/login" className="text-white hover:underline">
              {t("auth.login")}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
