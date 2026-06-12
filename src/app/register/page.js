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
  PasswordRequirementList,
} from "@/components/auth-shell";
import { fetchApi } from "@/lib/api";
import { isValidEmail, normalizeEmail, normalizeMerchantName } from "@/lib/auth-validation";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";
import {
  getPasswordRequirementState,
  isPasswordPolicyValid,
} from "@/lib/password-policy";

export default function RegisterPage() {
  const { t } = useDashboardLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(form.email);
    const name = normalizeMerchantName(form.name);

    if (!name) {
      setMessage({
        type: "error",
        text: t("auth.nameRequired"),
      });
      return;
    }

    if (!isValidEmail(email)) {
      setMessage({
        type: "error",
        text: t("auth.emailInvalid"),
      });
      return;
    }

    if (!isPasswordPolicyValid(form.password)) {
      setMessage({
        type: "error",
        text: t("auth.passwordRequirementsError"),
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({
        type: "error",
        text: t("auth.passwordMismatch"),
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetchApi("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || t("auth.accountCreated"),
        });
        window.location.href = "/login";
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        const minutes = Math.ceil(Number(data.retryAfterSeconds) / 60);
        setMessage({
          type: "error",
          text: t("auth.tooManyRegister")
            .replace("{minutes}", minutes)
            .replace("{plural}", minutes === 1 ? "" : "s"),
        });
        return;
      }

      setMessage({
        type: "error",
        text: data.message || t("auth.registerFailed"),
      });
    } catch (error) {
      reportClientError("auth.register", error);
      setMessage({
        type: "error",
        text: t("auth.registerError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = getPasswordRequirementState(form.password);
  const passwordScore = passwordRequirements.filter((requirement) => requirement.met).length;
  const passwordStrengthLabel =
    passwordScore >= passwordRequirements.length
      ? t("auth.passwordStrengthStrong")
      : passwordScore >= 4
        ? t("auth.passwordStrengthGood")
        : t("auth.passwordStrengthWeak");

  return (
    <AuthPageShell
      eyebrow="Crypto Gateway"
      title={t("auth.registerHeroTitle")}
      description={t("auth.registerHeroDescription")}
      features={[
        { icon: "secure", value: "TRC20", label: t("auth.usdtNetwork") },
        { icon: "api", value: "API", label: t("auth.merchantReady") },
        { icon: "checkout", value: "Checkout", label: t("auth.checkoutFlow") },
      ]}
    >
      <AuthCardHeader title={t("auth.createMerchantAccount")} description={t("auth.registerDescription")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}

        <AuthField label={t("auth.merchantName")}>
          <AuthInput
            id="merchant-name"
            type="text"
            name="name"
            placeholder={t("auth.namePlaceholder")}
            value={form.name}
            onChange={handleChange}
            required
          />
        </AuthField>

        <AuthField label={t("auth.emailAddress")}>
          <AuthInput
            id="merchant-email"
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
            id="merchant-password"
            type="password"
            name="password"
            placeholder={t("auth.passwordMinPlaceholder")}
            value={form.password}
            onChange={handleChange}
            required
            minLength={10}
          />
        </AuthField>

        <div className="rounded-lg border border-zinc-800 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-200">{t("auth.passwordStrength")}</p>
            <p className="text-xs font-semibold text-zinc-400">{passwordStrengthLabel}</p>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {passwordRequirements.map((requirement) => (
              <span
                key={requirement.code}
                className={`h-1 rounded-full ${
                  requirement.met ? "bg-emerald-400" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <PasswordRequirementList requirements={passwordRequirements} t={t} />
        </div>

        <AuthField label={t("auth.confirmPassword")}>
          <AuthInput
            id="merchant-confirm-password"
            type="password"
            name="confirmPassword"
            placeholder={t("auth.confirmPasswordPlaceholder")}
            value={form.confirmPassword}
            onChange={handleChange}
            required
            minLength={10}
          />
        </AuthField>

        <AuthSubmitButton disabled={loading}>
          {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-semibold text-white hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
