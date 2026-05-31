"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function DashboardPage() {
  const [merchant, setMerchant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const fetchDashboard = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }

    try {
      const dashboardResponse = await fetch(
        "http://localhost:5000/api/merchant/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const dashboardData = await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        alert(dashboardData.message || "Dashboard auth error");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setMerchant(dashboardData.merchant);

      setCallbackUrl(dashboardData.merchant?.callbackUrl || "");

      const paymentsResponse = await fetch(
        "http://localhost:5000/api/payments",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const paymentsData = await paymentsResponse.json();

      setPayments(paymentsData.payments || []);
    } catch (error) {
      console.error(error);
      alert("Dashboard error");
    } finally {
      setLoading(false);
    }
  };

  const saveCallbackUrl = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/callback-url",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            callbackUrl,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Callback URL update error");
    }
  };

  const createPayment = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/payments/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Number(amount),
          }),
        }
      );

      const data = await response.json();

      alert(data.message);

      setAmount("");

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Create payment error");
    }
  };

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crypto Gateway</h1>

            <p className="text-zinc-500 text-sm">Merchant Panel</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-zinc-400 hidden md:block">
              {merchant?.email}
            </p>

            <button
              onClick={logout}
              className="bg-red-500 text-black px-5 py-2 rounded-xl font-semibold hover:opacity-80 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="px-8 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-2">
              Merchant Dashboard
            </h1>

            <p className="text-zinc-400">
              Welcome {merchant?.name || "Merchant"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Total Payments</p>
              <h2 className="text-3xl font-bold">{payments.length}</h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Paid Payments</p>
              <h2 className="text-3xl font-bold">
                {payments.filter((p) => p.status === "PAID").length}
              </h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Pending Payments</p>
              <h2 className="text-3xl font-bold">
                {payments.filter((p) => p.status === "PENDING").length}
              </h2>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4">API Key</h2>

            <p className="text-zinc-400 text-sm mb-3">
              Use this key to create payments from external merchant websites.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={merchant?.apiKey || ""}
                readOnly
                className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
              />

              <button
                onClick={() => {
                  navigator.clipboard.writeText(merchant?.apiKey || "");
                  alert("API key copied");
                }}
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
              >
                Copy API Key
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4">
              Webhook Settings
            </h2>

            <form
              onSubmit={saveCallbackUrl}
              className="flex flex-col md:flex-row gap-4"
            >
              <input
                type="text"
                placeholder="https://your-site.com/webhook"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <button
                type="submit"
                className="bg-blue-500 text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
              >
                Save URL
              </button>
            </form>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4">
              Create Payment
            </h2>

            <form
              onSubmit={createPayment}
              className="flex flex-col md:flex-row gap-4"
            >
              <input
                type="number"
                placeholder="Amount USDT"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <button
                type="submit"
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
              >
                Create Payment
              </button>
            </form>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Payments</h2>

            <div className="space-y-4">
              {payments.length === 0 && (
                <p className="text-zinc-400">No payments yet.</p>
              )}

              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-zinc-800 rounded-xl p-6"
                >
                  <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <p className="font-semibold text-2xl">
                        {payment.amount} {payment.currency}
                      </p>

                      <div className="text-sm text-zinc-400 space-y-1">
                        <p className="break-all">
                          <span className="text-zinc-500">Payment ID:</span>{" "}
                          {payment.id}
                        </p>

                        <p>
                          <span className="text-zinc-500">Network:</span>{" "}
                          {payment.network}
                        </p>

                        <p className="break-all">
                          <span className="text-zinc-500">Wallet:</span>{" "}
                          {payment.walletAddress}
                        </p>

                        <p>
                          <span className="text-zinc-500">Created:</span>{" "}
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>

                        <p className="break-all">
                          <span className="text-zinc-500">Tx Hash:</span>{" "}
                          {payment.txHash || "Not confirmed yet"}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            payment.walletAddress
                          );

                          alert("Wallet address copied");
                        }}
                        className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
                      >
                        Copy Address
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl">
                        <QRCodeSVG
                          value={payment.walletAddress}
                          size={180}
                        />
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          payment.status === "PAID"
                            ? "bg-green-500 text-black"
                            : "bg-yellow-500 text-black"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-zinc-500 text-xs mt-4">
              Auto refresh active: payments update every 10 seconds.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}