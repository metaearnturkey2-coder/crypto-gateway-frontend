"use client";

import { useState } from "react";
import {
  AuthCardHeader,
  AuthField,
  AuthInput,
  AuthMessage,
  AuthPageShell,
  AuthSubmitButton,
} from "@/components/auth-shell";
import { fetchApi } from "@/lib/api";
import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useDashboardLanguage();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(form.email);

    if (!isValidEmail(email)) {
      setMessage(t("auth.emailInvalid"));
      return;
    }

    if (!form.password) {
      setMessage(t("auth.passwordRequired"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetchApi("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "/overview";
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        const minutes = Math.ceil(Number(data.retryAfterSeconds) / 60);
        setMessage(
          t("auth.tooManyLogin")
            .replace("{minutes}", minutes)
            .replace("{plural}", minutes === 1 ? "" : "s")
        );
        return;
      }

      setMessage(data.message || t("auth.loginFailed"));
    } catch (error) {
      reportClientError("auth.login", error);
      setMessage(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Crypto Gateway"
      title={t("auth.loginHeroTitle")}
      description={t("auth.loginHeroDescription")}
      features={[
        { icon: "secure", value: t("auth.live"), label: t("auth.paymentStatus") },
        { icon: "api", value: "API", label: t("auth.keyAccess") },
        { icon: "checkout", value: "Webhook", label: t("auth.callbacks") },
      ]}
    >
      <AuthCardHeader title={t("auth.merchantLogin")} description={t("auth.loginDescription")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {message && <AuthMessage>{message}</AuthMessage>}

        <AuthField label={t("auth.emailAddress")}>
          <AuthInput
            id="login-email"
            type="email"
            name="email"
            placeholder="merchant@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </AuthField>

        <AuthField label={t("auth.password")}>
          <AuthInput
            id="login-password"
            type="password"
            name="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={form.password}
            onChange={handleChange}
            required
          />
        </AuthField>

        <AuthSubmitButton disabled={loading}>
          {loading ? t("auth.loggingIn") : t("auth.login")}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        {t("auth.noAccount")}{" "}
        <a href="/register" className="font-semibold text-white hover:underline">
          {t("auth.createAccount")}
        </a>
      </p>
    </AuthPageShell>
  );
}
