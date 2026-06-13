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

const activeCheckoutPayment = {
  amount: "148.00",
  checkoutUrl: "/pay/checkout-polish-e2e",
  createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
  currency: "USDT",
  customerEmail: "customer@example.test",
  expiresAt: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
  id: "checkout-polish-e2e",
  mode: "LIVE",
  network: "TRC20",
  orderId: "ORDER-CG-1048",
  status: "PENDING",
  txHash: null,
  walletAddress: "TQx7yGvQ9pR2mN4kL6sD8fH1jK3pQ5zX7mP2",
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
  const merchantPreferences = {
    countryRegion: "Türkiye",
    dashboardLanguage: "English",
    dashboardTheme: "dark",
    displayCurrency: "USD",
    notificationLanguage: "English",
    paymentEmailAlerts: true,
    payoutEmailAlerts: true,
    securityEmailAlerts: true,
    timeZone: "Europe/Istanbul",
    webhookEmailAlerts: true,
    weeklySummaryEmail: false,
  };
  const preferenceOptions = {
    dashboardLanguage: ["English", "Türkçe"],
    displayCurrency: ["USD", "TRY", "EUR", "GBP"],
    notificationLanguage: ["English", "Türkçe"],
  };

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

      if (path === "/api/merchant/preferences") {
        if (route.request().method() === "PUT") {
          Object.assign(merchantPreferences, route.request().postDataJSON());
        }

        await fulfillJson(route, {
          message: "Preferences updated",
          options: preferenceOptions,
          preference: merchantPreferences,
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

const mockPublicCheckoutPayment = async (page, payment = activeCheckoutPayment) => {
  for (const baseUrl of backendUrls) {
    await page.route(`${baseUrl}/api/public/payments/${payment.id}`, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { payment },
        status: 200,
      });
    });
  }
};

test.describe("public frontend smoke", () => {
  for (const route of ["/login", "/forgot-password", "/reset-password?token=e2e-reset-token", "/register", "/history", "/trade"]) {
    test(`${route} renders without runtime errors`, async ({ page }) => {
      const errors = watchRuntimeErrors(page);

      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("main, section").first()).toBeVisible();

      expectNoRuntimeErrors(errors);
    });
  }

  test("register shows password requirements and blocks weak passwords", async ({ page }) => {
    const errors = watchRuntimeErrors(page);

    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Password strength")).toBeVisible();
    await expect(page.getByText("10+ characters")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();

    await page.getByLabel("Merchant Name").fill("Weak Password Merchant");
    await page.getByLabel("Email Address").fill("weak@example.test");
    await page.getByLabel("Password", { exact: true }).fill("1234567890");
    await page.getByLabel("Confirm password").fill("1234567890");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Password does not meet the security requirements.")).toBeVisible();
    expectNoRuntimeErrors(errors);
  });

  test("login shows custom validation for invalid email", async ({ page }) => {
    const errors = watchRuntimeErrors(page);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email Address").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    expectNoRuntimeErrors(errors);
  });

  test("forgot password shows custom validation for invalid email", async ({ page }) => {
    const errors = watchRuntimeErrors(page);

    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email Address").fill("not-an-email");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    expectNoRuntimeErrors(errors);
  });

  test("forgot password shows generic success after accepted request", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    let requestPayload = null;

    for (const baseUrl of backendUrls) {
      await page.route(`${baseUrl}/api/auth/forgot-password`, async (route) => {
        requestPayload = route.request().postDataJSON();
        await route.fulfill({
          contentType: "application/json",
          json: {
            message: "If an account exists for this email, password reset instructions will be sent.",
          },
          status: 200,
        });
      });
    }

    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email Address").fill(" Merchant@Example.TEST ");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByText("If an account exists for this email, password reset instructions will be sent.")
    ).toBeVisible();
    expect(requestPayload).toEqual({ email: "merchant@example.test" });
    expectNoRuntimeErrors(errors);
  });

  test("reset password enforces token, policy, and confirmation", async ({ page }) => {
    const errors = watchRuntimeErrors(page);

    await page.goto("/reset-password");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Reset token is required.")).toBeVisible();

    await page.goto("/reset-password?token=e2e-reset-token");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("New password").fill("1234567890");
    await page.getByLabel("Confirm password").fill("1234567890");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Password does not meet the security requirements.")).toBeVisible();

    await page.getByLabel("New password").fill("Reset-password-123!");
    await page.getByLabel("Confirm password").fill("Different-password-123!");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("reset password submits valid token and handles success and api errors", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    const resetRequests = [];
    let shouldFail = false;

    for (const baseUrl of backendUrls) {
      await page.route(`${baseUrl}/api/auth/reset-password`, async (route) => {
        resetRequests.push(route.request().postDataJSON());
        await route.fulfill({
          contentType: "application/json",
          json: shouldFail
            ? { message: "Password reset token is invalid or expired" }
            : { message: "Password reset successful" },
          status: shouldFail ? 400 : 200,
        });
      });
    }

    await page.goto("/reset-password?token=e2e-reset-token");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("New password").fill("Reset-password-123!");
    await page.getByLabel("Confirm password").fill("Reset-password-123!");
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("Password reset successful")).toBeVisible();
    expect(resetRequests[0]).toEqual({
      password: "Reset-password-123!",
      token: "e2e-reset-token",
    });

    shouldFail = true;
    await page.getByLabel("New password").fill("Reset-password-456!");
    await page.getByLabel("Confirm password").fill("Reset-password-456!");
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("Password reset token is invalid or expired")).toBeVisible();
    expect(resetRequests[1]).toEqual({
      password: "Reset-password-456!",
      token: "e2e-reset-token",
    });
    expect(
      errors
        .filter((message) => !message.includes("favicon"))
        .filter((message) => !message.includes("the server responded with a status of 400"))
        .join("\n")
    ).toBe("");
  });

  test("checkout renders hosted payment details", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockPublicCheckoutPayment(page);

    await page.goto("/pay/checkout-polish-e2e");
    await expect(page.getByRole("heading", { name: "Complete Payment" })).toBeVisible();
    await expect(page.getByText("148.00 USDT").first()).toBeVisible();
    await expect(page.getByText(activeCheckoutPayment.walletAddress)).toBeVisible();
    await expect(page.getByRole("button", { name: "Check Payment Status" })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });
});

test.describe("merchant frontend smoke", () => {
  test("overview renders authenticated merchant summary", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page, {
      paymentStats: {
        expired: 2,
        paid: 34,
        pending: 6,
        total: 42,
      },
    });

    await page.goto("/overview");
    await expect(page.getByText("Total funds")).toBeVisible();
    await expect(page.getByRole("link", { exact: true, name: "Create payment" })).toBeVisible();
    await expect(page.getByText("Merchant setup")).toBeVisible();
    await expect(page.getByText("Assets")).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

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

  test("notifications settings update email controls and language", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page);

    await page.goto("/settings/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByText("Email delivery controls")).toBeVisible();
    await expect(page.getByText("4/5 Enabled")).toBeVisible();

    await page.getByRole("button", { name: "Payment status alerts" }).click();
    await expect(page.getByText("3/5 Enabled")).toBeVisible();
    await expect(page.getByText("Notification settings saved.")).toBeVisible();

    await page.getByRole("combobox").selectOption("Türkçe");
    await expect(page.getByRole("combobox")).toHaveValue("Türkçe");
    await expect(page.getByText("Notification settings saved.")).toBeVisible();

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
    await expect(page.getByText("Admin girişi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("signed-in admin branch renders navigation cards with hrefs", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockAdminSession(page);

    await page.goto("/admin");
    await expect(page.getByText("Doğrulanmış admin oturumu")).toBeVisible();
    await expect(page.getByText("Settlement konsolu").first()).toBeVisible();

    const navCards = page.locator('a[href^="/admin/"]');
    await expect(navCards).toHaveCount(6);

    const hrefs = await navCards.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs.filter(Boolean)).toHaveLength(hrefs.length);
    expect(hrefs).toContain("/admin/settlement-console");
    expect(hrefs).toContain("/admin/merchant-onboarding");

    expectNoRuntimeErrors(errors);
  });
});
