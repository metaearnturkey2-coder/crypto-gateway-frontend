"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function RegisterPage() {
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
          text: data.message || "Account created. Redirecting to login...",
        });
        window.location.href = "/login";
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        const minutes = Math.ceil(Number(data.retryAfterSeconds) / 60);
        setMessage({
          type: "error",
          text: `Too many registration attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        });
        return;
      }

      setMessage({
        type: "error",
        text: data.message || "Register failed",
      });
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Register error. Please try again.",
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
            Start accepting USDT TRC20 payments today.
          </h1>

          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            Create your merchant account, generate payment links, track
            incoming payments, and manage webhook callbacks from one dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">TRC20</p>
              <p className="text-zinc-500 text-sm mt-1">USDT Network</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">API</p>
              <p className="text-zinc-500 text-sm mt-1">Merchant Ready</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">QR</p>
              <p className="text-zinc-500 text-sm mt-1">Checkout Flow</p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              Create Merchant Account
            </h2>

            <p className="text-zinc-400 mt-2">
              Register your gateway dashboard in seconds.
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
                Merchant Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Acme Store"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Email Address
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
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6 text-center">
            Already have an account?{" "}
            <a href="/login" className="text-white hover:underline">
              Login
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
