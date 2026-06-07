"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useDashboardLanguage();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchApi("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "/overview";
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        const minutes = Math.ceil(Number(data.retryAfterSeconds) / 60);
        setMessage(
          t("auth.tooManyLogin")
            .replace("{minutes}", minutes)
            .replace("{plural}", minutes === 1 ? "" : "s")
        );
        return;
      }

      setMessage(data.message || t("auth.loginFailed"));
    } catch (error) {
      reportClientError("auth.login", error);
      setMessage(t("auth.loginError"));
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
            {t("auth.loginHeroTitle")}
          </h1>

          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            {t("auth.loginHeroDescription")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">{t("auth.live")}</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.paymentStatus")}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">API</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.keyAccess")}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">Webhook</p>
              <p className="text-zinc-500 text-sm mt-1">{t("auth.callbacks")}</p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">{t("auth.merchantLogin")}</h2>

            <p className="text-zinc-400 mt-2">
              {t("auth.loginDescription")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {message}
              </div>
            )}

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
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm text-zinc-400 hover:text-white transition"
              >
                {t("auth.forgotPassword")}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? t("auth.loggingIn") : t("auth.login")}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6 text-center">
            {t("auth.noAccount")}{" "}
            <a href="/register" className="text-white hover:underline">
              {t("auth.createAccount")}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
