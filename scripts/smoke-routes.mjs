const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 8000);

const routes = [
  "/",
  "/login",
  "/register",
  "/overview",
  "/history",
  "/trade",
  "/business-wallet",
  "/business-wallet/merchants",
  "/business-wallet/api-docs",
  "/business-wallet/ledger",
  "/business-wallet/webhooks",
  { path: "/settings", allowedStatuses: [200, 307, 308] },
  "/settings/api",
  "/settings/security",
  "/settings/preference/account",
  "/settings/preference/active-sessions",
  "/settings/preference/basic-preferences",
  "/admin",
  "/admin/merchant-onboarding",
  "/admin/pilot-readiness",
  "/admin/reconciliation",
  "/admin/risk-review",
  "/admin/settlement-console",
  "/admin/treasury",
  { path: "/api/market/prices", minBytes: 2 },
].map((route) => {
  if (typeof route === "string") {
    return {
      allowedStatuses: [200],
      minBytes: 1000,
      path: route,
    };
  }

  return {
    allowedStatuses: [200],
    minBytes: 1000,
    ...route,
  };
});

const failurePatterns = [
  "Application error",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "ReferenceError",
  "TypeError:",
  "SyntaxError:",
];

const fetchRoute = async (route) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(route.path, baseUrl), {
      redirect: "manual",
      signal: controller.signal,
    });
    const body = await response.text();
    const matchedFailure = failurePatterns.find((pattern) => body.includes(pattern));
    const statusAllowed = route.allowedStatuses.includes(response.status);
    const bodyTooSmall = body.length < route.minBytes;

    return {
      bodyLength: body.length,
      bodyTooSmall,
      minBytes: route.minBytes,
      matchedFailure,
      route: route.path,
      status: response.status,
      statusAllowed,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const results = [];

for (const route of routes) {
  try {
    results.push(await fetchRoute(route));
  } catch (error) {
    results.push({
      error: error.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error.message,
      route,
      status: 0,
    });
  }
}

const failures = results.filter((result) => {
  if (result.error) return true;
  if (!result.statusAllowed) return true;
  if (result.bodyTooSmall) return true;
  if (result.matchedFailure) return true;
  return false;
});

for (const result of results) {
  const marker = failures.includes(result) ? "FAIL" : "OK";
  const detail =
    result.error ||
    result.matchedFailure ||
    (!result.statusAllowed ? "unexpected status" : "") ||
    (result.bodyTooSmall ? `body below ${result.minBytes} bytes` : "") ||
    `${result.bodyLength} bytes`;
  console.log(`${marker} ${String(result.status).padStart(3, " ")} ${result.route} ${detail}`);
}

if (failures.length > 0) {
  console.error(`Smoke check failed for ${failures.length} route(s).`);
  process.exit(1);
}

console.log(`Smoke check passed for ${results.length} route(s).`);
