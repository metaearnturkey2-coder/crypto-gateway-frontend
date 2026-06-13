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
  const merchantSessions = [
    {
      browser: "Chrome",
      city: "Istanbul",
      country: "Türkiye",
      createdAt: "2026-06-13T09:00:00.000Z",
      device: "Desktop",
      expiresAt: "2026-06-20T09:00:00.000Z",
      id: "session-current-e2e",
      ipAddress: "127.0.0.1",
      isActive: true,
      isCurrent: true,
      os: "Windows",
    },
  ];
  const merchantApiKeys = [
    {
      createdAt: "2026-06-12T09:00:00.000Z",
      effectiveStatus: "ACTIVE",
      expiresAt: null,
      id: "api-key-live-e2e",
      lastUsedAt: "2026-06-13T08:00:00.000Z",
      mode: "LIVE",
      prefix: "cg_live_e2e",
      scopes: ["payments:create", "payments:read"],
      status: "ACTIVE",
    },
    {
      createdAt: "2026-06-11T09:00:00.000Z",
      effectiveStatus: "ACTIVE",
      expiresAt: null,
      id: "api-key-test-e2e",
      lastUsedAt: null,
      mode: "TEST",
      prefix: "cg_test_e2e",
      scopes: ["payments:create"],
      status: "ACTIVE",
    },
  ];
  const kybRequirements = {
    businessTypes: ["SOLE_PROPRIETORSHIP", "LIMITED_COMPANY", "CORPORATION", "PARTNERSHIP", "NON_PROFIT", "OTHER"],
    expectedVolumeBands: ["0-10K", "10K-50K", "50K-250K", "250K-1M", "1M+"],
    requiredFields: ["businessName", "businessType", "country", "contactName", "contactEmail"],
  };
  let kybProfile = {
    businessName: "E2E Merchant",
    businessType: "LIMITED_COMPANY",
    contactEmail: "merchant@example.test",
    contactName: "E2E Merchant",
    country: "Turkey",
    expectedVolumeBand: "10K-50K",
    registrationNumber: "MERSIS-123456",
    status: "NOT_SUBMITTED",
    website: "https://merchant.example.test",
  };
  const requiredLegalDocuments = [
    { documentType: "TERMS_OF_SERVICE", version: "2026-06-07" },
    { documentType: "PRIVACY_POLICY", version: "2026-06-07" },
    { documentType: "ACCEPTABLE_USE_POLICY", version: "2026-06-07" },
    { documentType: "MERCHANT_AGREEMENT", version: "2026-06-07" },
  ];
  let legalAccepted = false;
  const buildLegalDocuments = () => [
    {
      accepted: legalAccepted,
      required: true,
      summary: "Operational terms for payment processing and account usage.",
      title: "Terms of Service",
      type: "TERMS_OF_SERVICE",
      version: "2026-06-07",
    },
    {
      accepted: legalAccepted,
      required: true,
      summary: "Privacy commitments covering merchant and customer data.",
      title: "Privacy Policy",
      type: "PRIVACY_POLICY",
      version: "2026-06-07",
    },
    {
      accepted: legalAccepted,
      required: true,
      summary: "Restricted business categories and prohibited payment flows.",
      title: "Acceptable Use Policy",
      type: "ACCEPTABLE_USE_POLICY",
      version: "2026-06-07",
    },
    {
      accepted: legalAccepted,
      required: true,
      summary: "Merchant responsibilities for production payment operations.",
      title: "Merchant Agreement",
      type: "MERCHANT_AGREEMENT",
      version: "2026-06-07",
    },
  ];

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

      if (path === "/api/merchant/kyb") {
        if (route.request().method() === "PUT") {
          kybProfile = {
            ...kybProfile,
            ...route.request().postDataJSON(),
            status: "SUBMITTED",
          };
        }

        await fulfillJson(route, {
          profile: kybProfile,
          requirements: kybRequirements,
        });
        return;
      }

      if (path === "/api/merchant/onboarding/checklist") {
        await fulfillJson(route, {
          checklist: {
            checks: [
              {
                code: "KYB_APPROVED",
                message:
                  kybProfile.status === "APPROVED"
                    ? "Merchant KYB is approved."
                    : "Merchant KYB must be approved before pilot go-live.",
                status: kybProfile.status === "APPROVED" ? "PASS" : "FAIL",
              },
              {
                code: "LEGAL_DOCUMENTS_ACCEPTED",
                message: legalAccepted
                  ? "Current legal documents are accepted."
                  : "Merchant must accept current legal documents.",
                status: legalAccepted ? "PASS" : "FAIL",
              },
              {
                code: "ACTIVE_API_KEY",
                message: "Merchant has at least one active API key.",
                status: "PASS",
              },
              {
                code: "WEBHOOK_CONFIGURED",
                message: "Webhook URL should be configured and tested successfully.",
                status: "WARN",
              },
              {
                code: "PAYOUT_ADDRESS_READY",
                message: "Merchant has an active payout whitelist address.",
                status: "PASS",
              },
              {
                code: "RISK_EVENTS_REVIEWED",
                message: "No open risk events remain.",
                status: "PASS",
              },
              {
                code: "BALANCE_RECONCILED",
                message: "Merchant balance matches ledger.",
                status: "PASS",
              },
              {
                code: "SANDBOX_PAYMENT_TESTED",
                message: "A sandbox payment test is recommended before live traffic.",
                status: "WARN",
              },
            ],
            generatedAt: "2026-06-13T09:00:00.000Z",
            merchant: {
              id: "merchant-e2e",
              name: "E2E Merchant",
            },
            overallStatus: legalAccepted && kybProfile.status === "APPROVED" ? "REVIEW_REQUIRED" : "BLOCKED",
            summary: {
              fail: [kybProfile.status === "APPROVED", legalAccepted].filter((value) => !value).length,
              pass: 4 + (kybProfile.status === "APPROVED" ? 1 : 0) + (legalAccepted ? 1 : 0),
              total: 8,
              warn: 2,
            },
          },
          message: "Merchant onboarding checklist",
        });
        return;
      }

      if (path === "/api/merchant/legal/accept") {
        legalAccepted = true;
        await fulfillJson(route, {
          acceptances: requiredLegalDocuments,
          allCurrentAccepted: true,
          message: "Legal documents accepted",
        });
        return;
      }

      if (path === "/api/merchant/legal") {
        await fulfillJson(route, {
          acceptances: legalAccepted ? requiredLegalDocuments : [],
          allCurrentAccepted: legalAccepted,
          documents: buildLegalDocuments(),
          required: requiredLegalDocuments,
        });
        return;
      }

      if (path === "/api/merchant/compliance/travel-rule") {
        await fulfillJson(route, {
          assessment: {
            checklist: [
              {
                code: "KYB_PROFILE_APPROVED",
                complete: kybProfile.status === "APPROVED",
                description: "KYB approval is required before production Travel Rule enforcement.",
              },
              {
                code: "LEGAL_DOCUMENTS_ACCEPTED",
                complete: legalAccepted,
                description: "Current legal documents must be accepted by the merchant.",
              },
            ],
            market: url.searchParams.get("targetMarket") || "TURKEY",
            policyDescription: "Travel Rule policy is ready for merchant onboarding review.",
            readiness: legalAccepted ? "PARTIAL" : "PENDING",
            readyForProductionEnforcement: false,
            threshold: url.searchParams.get("amount") || "1000",
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

      if (path === "/api/merchant/sessions") {
        await fulfillJson(route, {
          sessions: merchantSessions,
        });
        return;
      }

      if (path === "/api/merchant/api-keys") {
        await fulfillJson(route, {
          apiKeys: merchantApiKeys,
          message: "Merchant API keys",
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
    await expect(page.getByRole("link", { name: /Continue onboarding/ })).toHaveAttribute(
      "href",
      "/business-wallet/onboarding"
    );
    await expect(page.getByRole("heading", { name: "Complete compliance onboarding" }).first()).toBeVisible();
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

  test("authorization settings summarize sessions and api access", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page);

    await page.goto("/settings/preference/authorization");
    await expect(page.getByRole("heading", { name: "Authorization control center" })).toBeVisible();
    await expect(page.locator(".settings-preference-row").filter({ hasText: "Active sessions" })).toBeVisible();
    await expect(page.locator(".settings-preference-row").filter({ hasText: "Active API keys" })).toBeVisible();
    await expect(page.getByText("API key authorization")).toBeVisible();
    await expect(page.getByText("cg_live_e2e")).toBeVisible();
    await expect(page.getByText("cg_test_e2e")).toBeVisible();
    await expect(page.getByText("Webhook endpoint configured")).toBeVisible();
    await expect(page.getByRole("link", { name: /Manage sessions/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Manage keys/ })).toBeVisible();

    expectNoRuntimeErrors(errors);
  });

  test("merchant onboarding submits kyb and accepts legal documents", async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await mockMerchantSession(page);

    await page.goto("/business-wallet/onboarding");
    await expect(page.getByRole("heading", { name: "Merchant onboarding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business verification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Legal acceptance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Go-live checklist" })).toBeVisible();
    await expect(page.getByText("Balance reconciled")).toBeVisible();
    await expect(page.getByText("Merchant KYB must be approved before pilot go-live.")).toBeVisible();

    await page.getByLabel("Business name").fill("E2E Merchant Limited");
    await page.getByLabel("Contact name").fill("E2E Owner");
    await page.getByLabel("Contact email").fill("owner@example.test");
    await page.getByLabel("Registration number").fill("REG-2026-001");
    await page.getByLabel("Website").fill("https://merchant.example.test");
    await page.getByRole("button", { name: "Submit KYB profile" }).click();

    await expect(page.getByText("KYB profile submitted for review.")).toBeVisible();
    await expect(page.getByText("SUBMITTED", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Accept required documents" }).click();

    await expect(page.getByText("Required legal documents accepted.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Legal documents accepted" })).toBeVisible();

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
