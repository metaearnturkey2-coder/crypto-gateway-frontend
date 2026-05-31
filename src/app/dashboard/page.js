"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const formatTimeLeft = (expiresAt, now) => {
  if (!expiresAt) {
    return "No expiration";
  }

  if (!now) {
    return "Calculating...";
  }

  const diff = new Date(expiresAt).getTime() - now;

  if (diff <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const getWebhookStatusClassName = (status) => {
  if (status === "SUCCESS") {
    return "bg-green-500 text-black";
  }

  if (status === "FAILED") {
    return "bg-red-500 text-black";
  }

  return "bg-zinc-700 text-white";
};

export default function DashboardPage() {
  const [merchant, setMerchant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [webhookHistory, setWebhookHistory] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const fetchDashboard = useCallback(async () => {
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
  }, []);

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

  const regenerateApiKey = async () => {
    const confirmed = window.confirm(
      "Regenerating your API key will immediately invalidate the current key. Continue?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5000/api/merchant/api-key/regenerate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "API key regenerate error");
        return;
      }

      setMerchant(data.merchant);
      setCallbackUrl(data.merchant?.callbackUrl || "");
      alert(data.message);
    } catch (error) {
      console.error(error);
      alert("API key regenerate error");
    }
  };

  const verifyPayment = async (paymentId) => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${paymentId}/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      alert(data.message);

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Verify payment error");
    }
  };

  const openPaymentDetails = async (payment) => {
    const token = localStorage.getItem("token");

    setSelectedPayment(payment);
    setWebhookHistory([]);
    setDetailsLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${payment.id}/webhooks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Webhook history error");
        return;
      }

      setWebhookHistory(data.webhooks || []);
    } catch (error) {
      console.error(error);
      alert("Webhook history error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const retryWebhook = async (webhookId) => {
    const token = localStorage.getItem("token");

    if (!selectedPayment) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${selectedPayment.id}/webhooks/${webhookId}/retry`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      alert(data.message);

      await openPaymentDetails(selectedPayment);
      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Webhook retry error");
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
            orderId: orderId || undefined,
            customerEmail: customerEmail || undefined,
          }),
        }
      );

      const data = await response.json();

      alert(data.message);

      setAmount("");
      setOrderId("");
      setCustomerEmail("");

      fetchDashboard();
    } catch (error) {
      console.error(error);
      alert("Create payment error");
    }
  };

  useEffect(() => {
    const refreshDashboard = () => {
      fetchDashboard();
    };

    refreshDashboard();

    const interval = setInterval(() => {
      refreshDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
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

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 mb-2">Expired Payments</p>
              <h2 className="text-3xl font-bold">
                {payments.filter((p) => p.status === "EXPIRED").length}
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

              <button
                onClick={regenerateApiKey}
                className="bg-red-500 text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
              >
                Regenerate
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-zinc-400 text-sm mb-2">
                  Create Payment Endpoint
                </p>

                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value="POST http://localhost:5000/api/public/payments/create"
                    readOnly
                    className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
                  />

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "http://localhost:5000/api/public/payments/create"
                      );
                      alert("Endpoint copied");
                    }}
                    className="bg-zinc-800 px-5 py-3 rounded-xl hover:bg-zinc-700 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-zinc-400 text-sm mb-2">
                  Required Header
                </p>

                <input
                  type="text"
                  value="x-api-key: YOUR_API_KEY"
                  readOnly
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
                />
              </div>

              <div>
                <p className="text-zinc-400 text-sm mb-2">
                  Example Body
                </p>

                <input
                  type="text"
                  value='{ "amount": 25, "orderId": "ORDER-1001", "customerEmail": "customer@example.com" }'
                  readOnly
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
                />
              </div>
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
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              <input
                type="number"
                placeholder="Amount USDT"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="text"
                placeholder="Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
              />

              <input
                type="email"
                placeholder="Customer email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none"
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
                  {(() => {
                    const latestWebhook = payment.webhookEvents?.[0];

                    return (
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

                        {payment.orderId && (
                          <p className="break-all">
                            <span className="text-zinc-500">Order ID:</span>{" "}
                            {payment.orderId}
                          </p>
                        )}

                        {payment.customerEmail && (
                          <p className="break-all">
                            <span className="text-zinc-500">Customer:</span>{" "}
                            {payment.customerEmail}
                          </p>
                        )}

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

                        <p>
                          <span className="text-zinc-500">Expires:</span>{" "}
                          {new Date(payment.expiresAt).toLocaleString()}
                        </p>

                        <p>
                          <span className="text-zinc-500">Time Left:</span>{" "}
                          {formatTimeLeft(payment.expiresAt, now)}
                        </p>

                        <p className="break-all">
                          <span className="text-zinc-500">Tx Hash:</span>{" "}
                          {payment.txHash || "Not confirmed yet"}
                        </p>

                        {latestWebhook && (
                          <div className="pt-2">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(
                                latestWebhook.status
                              )}`}
                            >
                              Webhook: {latestWebhook.status}
                            </span>

                            <p className="mt-2">
                              <span className="text-zinc-500">
                                Attempts:
                              </span>{" "}
                              {latestWebhook.attempts}/
                              {latestWebhook.maxAttempts}
                            </p>

                            {(latestWebhook.lastStatusCode ||
                              latestWebhook.lastError) && (
                              <p className="break-all">
                                <span className="text-zinc-500">
                                  Last result:
                                </span>{" "}
                                {latestWebhook.lastStatusCode ||
                                  latestWebhook.lastError}
                              </p>
                            )}
                          </div>
                        )}
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
                      <button
                        onClick={() => verifyPayment(payment.id)}
                        disabled={payment.status !== "PENDING"}
                        className="bg-blue-500 text-black px-4 py-2 rounded-xl hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Verify Now
                      </button>

                      <a
                        href={`/pay/${payment.id}`}
                        target="_blank"
                        className="bg-white text-black px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition text-center"
                      >
                        Open Checkout
                      </a>

                      <button
                        onClick={() => openPaymentDetails(payment)}
                        className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
                      >
                        Details
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
                            : payment.status === "EXPIRED"
                            ? "bg-red-500 text-black"
                            : "bg-yellow-500 text-black"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            <p className="text-zinc-500 text-xs mt-4">
              Auto refresh active: payments update every 10 seconds.
            </p>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 py-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Payment Details</h2>
                <p className="text-zinc-400 text-sm break-all">
                  {selectedPayment.id}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setWebhookHistory([]);
                }}
                className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 transition"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Amount</p>
                <p className="text-xl font-bold">
                  {selectedPayment.amount} {selectedPayment.currency}
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Status</p>
                <p className="font-semibold">{selectedPayment.status}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Order ID</p>
                <p className="break-all">
                  {selectedPayment.orderId || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Customer</p>
                <p className="break-all">
                  {selectedPayment.customerEmail || "Not provided"}
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                <p className="text-zinc-500">Checkout URL</p>
                <div className="flex flex-col md:flex-row gap-3 mt-2">
                  <input
                    type="text"
                    readOnly
                    value={`http://localhost:3000/pay/${selectedPayment.id}`}
                    className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `http://localhost:3000/pay/${selectedPayment.id}`
                      );
                      alert("Checkout URL copied");
                    }}
                    className="bg-white text-black px-5 py-3 rounded-xl font-semibold hover:opacity-80 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
                <p className="text-zinc-500">Wallet Address</p>
                <p className="break-all">{selectedPayment.walletAddress}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Tx Hash</p>
                <p className="break-all">
                  {selectedPayment.txHash || "Not confirmed yet"}
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500">Time Left</p>
                <p>{formatTimeLeft(selectedPayment.expiresAt, now)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">Webhook History</h3>

              {detailsLoading && (
                <p className="text-zinc-400">Loading webhook history...</p>
              )}

              {!detailsLoading && webhookHistory.length === 0 && (
                <p className="text-zinc-400">No webhook events yet.</p>
              )}

              <div className="space-y-3">
                {webhookHistory.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
                      <div className="text-sm text-zinc-400 space-y-1">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getWebhookStatusClassName(
                            webhook.status
                          )}`}
                        >
                          {webhook.status}
                        </span>

                        <p className="break-all">
                          <span className="text-zinc-500">URL:</span>{" "}
                          {webhook.url}
                        </p>
                        <p>
                          <span className="text-zinc-500">Event:</span>{" "}
                          {webhook.event}
                        </p>
                        <p>
                          <span className="text-zinc-500">Attempts:</span>{" "}
                          {webhook.attempts}/{webhook.maxAttempts}
                        </p>
                        <p>
                          <span className="text-zinc-500">Created:</span>{" "}
                          {new Date(webhook.createdAt).toLocaleString()}
                        </p>
                        {webhook.nextRetryAt && (
                          <p>
                            <span className="text-zinc-500">Next retry:</span>{" "}
                            {new Date(webhook.nextRetryAt).toLocaleString()}
                          </p>
                        )}
                        {(webhook.lastStatusCode || webhook.lastError) && (
                          <p className="break-all">
                            <span className="text-zinc-500">Last result:</span>{" "}
                            {webhook.lastStatusCode || webhook.lastError}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => retryWebhook(webhook.id)}
                        disabled={
                          webhook.status === "SUCCESS" ||
                          webhook.attempts >= webhook.maxAttempts
                        }
                        className="bg-blue-500 text-black px-4 py-2 rounded-xl hover:opacity-80 transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
