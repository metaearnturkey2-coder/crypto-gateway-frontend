"use client";

import { useState } from "react";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
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

      alert(data.message || "Login failed");
    } catch (error) {
      console.error(error);
      alert("Login error");
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
            Manage your crypto payments from one dashboard.
          </h1>

          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            Login to your merchant panel to create payment requests, monitor
            TRC20 USDT transactions, manage webhook URLs, and track payment
            status in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">Live</p>
              <p className="text-zinc-500 text-sm mt-1">Payment Status</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">API</p>
              <p className="text-zinc-500 text-sm mt-1">Key Access</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl font-bold">Webhook</p>
              <p className="text-zinc-500 text-sm mt-1">Callbacks</p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Merchant Login</h2>

            <p className="text-zinc-400 mt-2">
              Access your crypto payment dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Enter your password"
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
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-zinc-500 text-sm mt-6 text-center">
            Do not have an account?{" "}
            <a href="/register" className="text-white hover:underline">
              Create account
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
