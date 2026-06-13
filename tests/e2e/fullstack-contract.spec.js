import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const apiBaseUrl = process.env.CONTRACT_API_BASE_URL || "http://localhost:5000";

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
  expect(
    errors
      .filter((message) => !message.includes("favicon"))
      .filter((message) => !message.includes("Failed to load resource"))
      .join("\n")
  ).toBe("");
};

const readJson = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text.slice(0, 240) };
  }
};

const expectStatus = async (response, expectedStatus) => {
  const body = await readJson(response);

  expect(response.status(), JSON.stringify(body, null, 2)).toBe(expectedStatus);

  return body;
};

const setMerchantSession = async (page, token) => {
  await page.addInitScript((accessToken) => {
    window.localStorage.setItem("token", accessToken);
    window.localStorage.setItem("dashboardLanguage", "English");
    window.localStorage.setItem("dashboardTheme", "dark");
  }, token);
};

test.describe("full-stack contract", () => {
  test.skip(
    process.env.RUN_FULLSTACK_CONTRACT !== "1",
    "Set RUN_FULLSTACK_CONTRACT=1 to run against the real backend."
  );

  test("public payment create flows into checkout and merchant payment screens", async ({
    browserName,
    page,
    request,
  }, testInfo) => {
    const errors = watchRuntimeErrors(page);
    const uniqueId = randomUUID().replaceAll("-", "").slice(0, 16);
    const runKey = `${browserName}-${testInfo.project.name}-${uniqueId}`;
    const email = `contract-${runKey}@example.test`;
    const password = "Contract-password-123!";
    const orderId = `ORDER-${runKey}`.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 80);
    const clientIp = `198.51.100.${(testInfo.workerIndex % 200) + 1}`;

    const registerResponse = await request.post(`${apiBaseUrl}/api/v1/auth/register`, {
      data: {
        email,
        name: `Contract Merchant ${uniqueId}`,
        password,
      },
      headers: {
        "x-forwarded-for": clientIp,
      },
    });
    const registerBody = await expectStatus(registerResponse, 201);
    const apiKey = registerBody.merchant?.apiKey;
    expect(apiKey).toMatch(/^cg_(live|test)_/);

    const loginResponse = await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        email,
        password,
      },
      headers: {
        "x-forwarded-for": clientIp,
      },
    });
    const loginBody = await expectStatus(loginResponse, 200);
    expect(loginBody.token).toBeTruthy();

    const createPaymentResponse = await request.post(`${apiBaseUrl}/api/v1/public/payments/create`, {
      data: {
        amount: "17.25",
        customerEmail: "customer@example.test",
        orderId,
      },
      headers: {
        "Idempotency-Key": `contract-${runKey}`,
        "x-api-key": apiKey,
      },
    });
    const createPaymentBody = await expectStatus(createPaymentResponse, 201);
    const payment = createPaymentBody.payment;

    expect(payment.id).toBeTruthy();
    expect(payment.orderId).toBe(orderId);
    expect(payment.customerEmail).toBe("customer@example.test");
    expect(payment.walletAddress).toBeTruthy();
    expect(createPaymentBody.checkoutUrl).toContain(`/pay/${payment.id}`);

    await page.goto(`/pay/${payment.id}`);
    await expect(page.getByRole("heading", { name: "Complete Payment" })).toBeVisible();
    await expect(page.getByText("17.25 USDT").first()).toBeVisible();
    await expect(page.getByText(payment.walletAddress)).toBeVisible();
    await expect(page.getByText(orderId)).toBeVisible();

    await setMerchantSession(page, loginBody.token);
    await page.goto("/business-wallet/merchants");

    const paymentCard = page.locator(".merchant-payment-card").filter({ hasText: payment.id });
    await expect(paymentCard).toBeVisible();
    await expect(paymentCard).toContainText(orderId);
    await expect(paymentCard.locator(".payment-status-badge")).toContainText("Pending");
    await expect(paymentCard.getByRole("link", { name: "Details" })).toHaveAttribute(
      "href",
      `/business-wallet/payments/${payment.id}`
    );

    await page.goto(`/business-wallet/payments/${payment.id}`);
    await expect(page.getByRole("heading", { name: "Payment details" })).toBeVisible();
    await expect(page.getByText(payment.id).first()).toBeVisible();
    await expect(page.getByText(orderId).first()).toBeVisible();
    await expect(page.getByText(payment.walletAddress).first()).toBeVisible();
    await expect(page.getByText("customer@example.test").first()).toBeVisible();

    expectNoRuntimeErrors(errors);
  });
});
