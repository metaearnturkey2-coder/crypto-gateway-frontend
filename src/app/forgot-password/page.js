"use client";

import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const { t } = useDashboardLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setMessage({
        type: "error",
        text: t("auth.emailInvalid"),
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetchApi("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.message || t("auth.forgotPasswordError"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.message || t("auth.forgotPasswordSent"),
      });
    } catch (error) {
      reportClientError("auth.forgot_password", error);
      setMessage({
        type: "error",
        text: t("auth.forgotPasswordError"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Crypto Gateway"
      title={t("auth.forgotPasswordHeroTitle")}
      description={t("auth.forgotPasswordHeroDescription")}
      features={[
        { icon: "secure", value: t("auth.reset"), label: t("auth.accountAccess") },
        { icon: "api", value: "30 min", label: t("auth.resetWindow") },
        { icon: "checkout", value: t("auth.sessions"), label: t("auth.sessionControl") },
      ]}
    >
      <AuthCardHeader title={t("auth.forgotPasswordTitle")} description={t("auth.forgotPasswordDescription")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}

        <AuthField label={t("auth.emailAddress")}>
          <AuthInput
            id="forgot-email"
            type="email"
            name="email"
            placeholder="merchant@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </AuthField>

        <AuthSubmitButton disabled={loading}>
          {loading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-semibold text-white hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
