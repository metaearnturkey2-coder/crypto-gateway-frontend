export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-6">
        Crypto Gateway
      </h1>

      <p className="text-zinc-400 text-lg mb-10 text-center max-w-2xl">
        Accept USDT TRC20 payments with your own crypto payment infrastructure.
      </p>

      <div className="flex gap-4">
        <a
          href="/register"
          className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition"
        >
          Get Started
        </a>

        <a
          href="/login"
          className="border border-zinc-700 px-6 py-3 rounded-xl hover:bg-zinc-900 transition"
        >
          Documentation
        </a>
      </div>
    </main>
  );
}