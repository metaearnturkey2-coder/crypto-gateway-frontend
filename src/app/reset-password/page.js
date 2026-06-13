"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";
import {
  getPasswordRequirementState,
  isPasswordPolicyValid,
} from "@/lib/password-policy";

function ResetPasswordForm() {
  const { t } = useDashboardLanguage();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    token: searchParams.get("token") || "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = form.token.trim();

    if (!token) {
      setMessage({
        type: "error",
        text: t("auth.resetTokenRequired"),
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
      const response = await fetchApi("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: form.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.message || t("auth.resetPasswordError"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.message || t("auth.resetPasswordSuccess"),
      });
      setForm({
        token,
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      reportClientError("auth.reset_password", error);
      setMessage({
        type: "error",
        text: t("auth.resetPasswordError"),
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
      title={t("auth.resetPasswordHeroTitle")}
      description={t("auth.resetPasswordHeroDescription")}
      features={[
        { icon: "secure", value: t("auth.reset"), label: t("auth.accountAccess") },
        { icon: "api", value: t("auth.policy"), label: t("auth.passwordStrength") },
        { icon: "checkout", value: t("auth.sessions"), label: t("auth.sessionControl") },
      ]}
    >
      <AuthCardHeader title={t("auth.resetPasswordTitle")} description={t("auth.resetPasswordDescription")} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}

        <AuthField label={t("auth.resetToken")}>
          <AuthInput
            id="reset-token"
            type="text"
            name="token"
            placeholder={t("auth.resetTokenPlaceholder")}
            value={form.token}
            onChange={handleChange}
            required
          />
        </AuthField>

        <AuthField label={t("auth.newPassword")}>
          <AuthInput
            id="reset-password"
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
            id="reset-confirm-password"
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
          {loading ? t("auth.resettingPassword") : t("auth.resetPassword")}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
