import { expect, test } from "@playwright/test";

const backendUrls = ["http://localhost:5000", "http://127.0.0.1:5000"];

const expiredPendingPayment = {
  amount: "10.00",
  checkoutUrl: "/pay/expired-pending-e2e",
  createdAt: "2026-06-01T10:00:00.000Z",
  currency: "USDT",
  expiresAt: "2026-06-01T10:30:00.000Z",
  id: "expired-pending-e2e",
  network: "TRC20",
  orderId: "order-expired-pending-e2e",
  status: "PENDING",
  walletAddress: "TQxE2ESmokeWallet1111111111111111111",
  webhookEvents: [],
};

const watchRuntimeErrors = (page) => {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
};

const expectNoRuntimeErrors = (errors) => {
  expect(errors.filter((message) => !message.includes("favicon")).join("\n")).toBe("");
};

const mockAdminSession = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("adminAccessToken", "e2e-admin-token");
  });

  for (const baseUrl of backendUrls) {
    await page.route(`${baseUrl}/api/admin/me`, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          admin: {
            email: "admin@example.test",
            role: "ADMIN",
          },
        },
        status: 200,
      });
    });

    await page.route(`${baseUrl}/api/admin/logout`, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { ok: true },
        status: 200,
      });
    });
  }
};

const mockMerchantSession = async (
  page,
  {
    paymentStats = {
      expired: 0,
      paid: 0,
      pending: 1,
      total: 1,
    },
    payments = [],
  } = {}
) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "e2e-merchant-token");
    window.localStorage.setItem("dashboardLanguage", "English");
    window.localStorage.setItem("dashboardTheme", "dark");
  });

  const fulfillJson = (route, json, status = 200) =>
    route.fulfill({
      contentType: "application/json",
      json,
      status,
    });

  for (const baseUrl of backendUrls) {
    await page.route(`${baseUrl}/api/**`, async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === "/api/merchant/dashboard") {
        await fulfillJson(route, {
          merchant: {
            apiKeyMode: "LIVE",
            apiKeyPrefix: "cg_live_e2e",
            apiKeyPreview: "cg_live_e2e...hidden",
            callbackUrl: "https://merchant.example.test/webhook",
            createdAt: "2026-06-01T10:00:00.000Z",
            email: "merchant@example.test",
            id: "merchant-e2e",
            name: "E2E Merchant",
            webhookSecret: "whsec_e2e_preview",
          },
        });
        return;
      }

      if (path === "/api/payments") {
        await fulfillJson(route, {
          pagination: {
            page: 1,
            totalCount: payments.length,
            totalPages: 1,
          },
          payments,
          stats: paymentStats,
        });
        return;
      }

      if (path === "/api/merchant/settlements") {
        await fulfillJson(route, {
          payoutLimits: {
            currency: "USDT",
            dailyLimit: "25000",
            dailyRemaining: "25000",
            dailyUsed: "0",
            perTransactionLimit: "10000",
            weeklyLimit: "100000",
            weeklyRemaining: "100000",
            weeklyUsed: "0",
          },
          payoutRequests: [],
          summary: {
            available: "125.50",
            currency: "USDT",
            grossPaid: "125.50",
            network: "TRC20",
            pendingBalance: "0",
            reservedForPayouts: "0",
          },
        });
        return;
      }

      if (path === "/api/merchant/audit-logs") {
        await fulfillJson(route, {
          auditLogs: [],
          count: 0,
          totalCount: 0,
        });
        return;
      }

      if (path === "/api/merchant/payout-addresses") {
        await fulfillJson(route, {
          addresses: [
            {
              effectiveStatus: "ACTIVE",
              id: "addr-e2e",
              label: "E2E wallet",
              status: "ACTIVE",
              walletAddress: "TQxE2ESmokeWallet1111111111111111111",
            },
          ],
        });
        return;
      }

      await fulfillJson(route, {});
    });
  }
};

test.describe("public frontend smoke", () => {
  for (const route of ["/login", "/register", "/history", "/trade"]) {
    test(`${route} renders without runtime errors`, async ({ page }) => {
      const errors = watchRuntimeErrors(page);

      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("main, section").first()).toBeVisible();

      expectNoRuntimeErrors(errors);
    });
  }
});

test.describe("merchant frontend smoke", () => {
  test("business wallet renders authenticated finance surfaces", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page);

    await page.goto("/business-wallet");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Payout" })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("security settings render authenticated webhook and api access surfaces", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page);

    await page.goto("/settings/security");
    await expect(page.getByRole("heading", { name: "Security" }).first()).toBeVisible();
    await expect(page.getByText("Webhook Secret")).toBeVisible();
    await expect(page.getByRole("heading", { name: "API Access" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save URL" })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("merchant payments show expired pending checkouts as expired", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page, {
      paymentStats: {
        expired: 0,
        paid: 0,
        pending: 1,
        total: 1,
      },
      payments: [expiredPendingPayment],
    });

    await page.goto("/business-wallet/merchants");

    const paymentCard = page
      .locator(".merchant-payment-card")
      .filter({ hasText: expiredPendingPayment.id });
    await expect(paymentCard).toBeVisible();
    await expect(paymentCard.locator(".payment-status-badge")).toHaveText("Expired");
    await expect(paymentCard.getByText("Payment window closed")).toBeVisible();
    await expect(paymentCard.getByRole("button", { name: "Verify" })).toHaveCount(0);
    await expect(paymentCard.getByRole("button", { name: "Cancel" })).toHaveCount(0);

    expectNoRuntimeErrors(errors);
  });
});

test.describe("admin frontend smoke", () => {
  test("signed-out admin entry renders login panel", async ({ page }) => {
    const errors = watchRuntimeErrors(page);

    await page.goto("/admin");
    await expect(page.getByText("Admin Sign In")).toBeVisible();
    await expect(page.getByRole("button", { name: "Giris yap" })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("signed-in admin branch renders navigation cards with hrefs", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockAdminSession(page);

    await page.goto("/admin");
    await expect(page.getByText("Verified admin session")).toBeVisible();
    await expect(page.getByText("Settlement Console").first()).toBeVisible();

    const navCards = page.locator('a[href^="/admin/"]');
    await expect(navCards).toHaveCount(6);

    const hrefs = await navCards.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs.filter(Boolean)).toHaveLength(hrefs.length);
    expect(hrefs).toContain("/admin/settlement-console");
    expect(hrefs).toContain("/admin/merchant-onboarding");

    expectNoRuntimeErrors(errors);
  });
});
