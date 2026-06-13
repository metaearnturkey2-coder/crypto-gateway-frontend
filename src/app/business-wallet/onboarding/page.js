"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe2,
  ListChecks,
  Scale,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardButton, DashboardInput, DashboardPanel, DashboardPill, DashboardSelect } from "@/components/dashboard-ui";
import OverviewShell from "@/components/overview-shell";
import { merchantFetch } from "@/lib/api";
import { reportClientError } from "@/lib/client-error";
import { useDashboardLanguage } from "@/lib/i18n";

const defaultKybForm = {
  businessName: "",
  businessType: "LIMITED_COMPANY",
  contactEmail: "",
  contactName: "",
  country: "Turkey",
  expectedVolumeBand: "10K-50K",
  registrationNumber: "",
  website: "",
};

const statusClassName = {
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700",
  SUBMITTED: "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700",
  NEEDS_MORE_INFO: "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-300 light-dashboard:text-red-700",
  NOT_SUBMITTED: "border-zinc-700 bg-zinc-800 text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700",
};

const checklistTitleKeys = {
  ACTIVE_API_KEY: "merchantOnboarding.checkApi",
  BALANCE_RECONCILED: "merchantOnboarding.checkBalance",
  KYB_APPROVED: "merchantOnboarding.checkKyb",
  LEGAL_DOCUMENTS_ACCEPTED: "merchantOnboarding.checkLegal",
  PAYOUT_ADDRESS_READY: "merchantOnboarding.checkPayoutAddress",
  RISK_EVENTS_REVIEWED: "merchantOnboarding.checkRiskEvents",
  SANDBOX_PAYMENT_TESTED: "merchantOnboarding.checkSandboxPayment",
  WEBHOOK_CONFIGURED: "merchantOnboarding.checkWebhook",
};

const formatChecklistCode = (code) =>
  String(code || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function Notice({ notice }) {
  if (!notice) return null;

  const className =
    notice.type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 light-dashboard:text-emerald-700"
      : "border-red-500/40 bg-red-500/10 text-red-200 light-dashboard:text-red-700";

  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{notice.message}</div>;
}

function ChecklistItem({ complete, description, title }) {
  return (
    <div className="flex gap-3 px-4 py-4 sm:px-5">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          complete
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700"
        }`}
      >
        {complete ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{title}</p>
        <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">{description}</p>
      </div>
    </div>
  );
}

export default function MerchantOnboardingPage() {
  const { t } = useDashboardLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [kyb, setKyb] = useState(null);
  const [legal, setLegal] = useState(null);
  const [onboardingChecklist, setOnboardingChecklist] = useState(null);
  const [travelRule, setTravelRule] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [form, setForm] = useState(defaultKybForm);
  const [loading, setLoading] = useState(true);
  const [savingKyb, setSavingKyb] = useState(false);
  const [acceptingLegal, setAcceptingLegal] = useState(false);
  const [notice, setNotice] = useState(null);

  const hydrateForm = useCallback((profile, merchant) => {
    setForm({
      ...defaultKybForm,
      businessName: profile?.businessName || merchant?.name || "",
      businessType: profile?.businessType || defaultKybForm.businessType,
      contactEmail: profile?.contactEmail || merchant?.email || "",
      contactName: profile?.contactName || merchant?.name || "",
      country: profile?.country || defaultKybForm.country,
      expectedVolumeBand: profile?.expectedVolumeBand || defaultKybForm.expectedVolumeBand,
      registrationNumber: profile?.registrationNumber || "",
      website: profile?.website || "",
    });
  }, []);

  const loadOnboarding = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [dashboardResponse, kybResponse, legalResponse, travelRuleResponse, checklistResponse] = await Promise.all([
        merchantFetch("/api/merchant/dashboard"),
        merchantFetch("/api/merchant/kyb"),
        merchantFetch("/api/merchant/legal"),
        merchantFetch("/api/merchant/compliance/travel-rule?targetMarket=TURKEY&amount=1000"),
        merchantFetch("/api/merchant/onboarding/checklist"),
      ]);

      if (!dashboardResponse.ok || !kybResponse.ok || !legalResponse.ok || !travelRuleResponse.ok) {
        setNotice({ type: "error", message: t("merchantOnboarding.loadError") });
        return;
      }

      const merchant = dashboardResponse.body.merchant || null;
      const profile = kybResponse.body.profile || null;

      setDashboard(merchant);
      setKyb(profile);
      setRequirements(kybResponse.body.requirements || null);
      setLegal(legalResponse.body);
      setOnboardingChecklist(checklistResponse.ok ? checklistResponse.body.checklist || null : null);
      setTravelRule(travelRuleResponse.body.assessment || null);
      hydrateForm(profile, merchant);
    } catch (error) {
      reportClientError("merchant.onboarding.load", error);
      setNotice({ type: "error", message: t("merchantOnboarding.loadError") });
    } finally {
      setLoading(false);
    }
  }, [hydrateForm, t]);

  useEffect(() => {
    queueMicrotask(loadOnboarding);
  }, [loadOnboarding]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitKyb = async (event) => {
    event.preventDefault();
    setSavingKyb(true);
    setNotice(null);

    try {
      const { body, ok } = await merchantFetch("/api/merchant/kyb", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          registrationNumber: form.registrationNumber || null,
          website: form.website || null,
        }),
      });

      if (!ok) {
        throw new Error(body.errors?.join(" ") || body.message || t("merchantOnboarding.kybSaveError"));
      }

      await loadOnboarding();
      setKyb(body.profile || null);
      setNotice({ type: "success", message: t("merchantOnboarding.kybSubmitted") });
    } catch (error) {
      reportClientError("merchant.onboarding.kyb", error);
      setNotice({ type: "error", message: error.message || t("merchantOnboarding.kybSaveError") });
    } finally {
      setSavingKyb(false);
    }
  };

  const acceptLegal = async () => {
    if (!legal?.required?.length) return;

    setAcceptingLegal(true);
    setNotice(null);

    try {
      const { body, ok } = await merchantFetch("/api/merchant/legal/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acceptedDocuments: legal.required,
        }),
      });

      if (!ok) {
        throw new Error(body.message || t("merchantOnboarding.legalAcceptError"));
      }

      await loadOnboarding();
      setNotice({ type: "success", message: t("merchantOnboarding.legalAccepted") });
    } catch (error) {
      reportClientError("merchant.onboarding.legal", error);
      setNotice({ type: "error", message: error.message || t("merchantOnboarding.legalAcceptError") });
    } finally {
      setAcceptingLegal(false);
    }
  };

  const goLiveChecklist = useMemo(() => {
    if (onboardingChecklist?.checks?.length) {
      return onboardingChecklist.checks.map((check) => ({
        complete: check.status === "PASS",
        description: check.message || t("merchantOnboarding.checkDescriptionFallback"),
        title: checklistTitleKeys[check.code] ? t(checklistTitleKeys[check.code]) : formatChecklistCode(check.code),
      }));
    }

    const apiReady = Boolean(dashboard?.apiKeyPrefix || dashboard?.apiKeyPreview || dashboard?.apiKey);
    const webhookReady = Boolean(dashboard?.callbackUrl || dashboard?.webhookUrl);
    const kybApproved = kyb?.status === "APPROVED";
    const legalAccepted = Boolean(legal?.allCurrentAccepted);

    return [
      {
        complete: Boolean(dashboard?.id),
        title: t("merchantOnboarding.checkAccount"),
        description: t("merchantOnboarding.checkAccountDescription"),
      },
      {
        complete: kybApproved,
        title: t("merchantOnboarding.checkKyb"),
        description: t("merchantOnboarding.checkKybDescription"),
      },
      {
        complete: legalAccepted,
        title: t("merchantOnboarding.checkLegal"),
        description: t("merchantOnboarding.checkLegalDescription"),
      },
      {
        complete: apiReady,
        title: t("merchantOnboarding.checkApi"),
        description: t("merchantOnboarding.checkApiDescription"),
      },
      {
        complete: webhookReady,
        title: t("merchantOnboarding.checkWebhook"),
        description: t("merchantOnboarding.checkWebhookDescription"),
      },
    ];
  }, [dashboard, kyb, legal, onboardingChecklist, t]);

  const completedCount = goLiveChecklist.filter((item) => item.complete).length;
  const profileStatus = kyb?.status || "NOT_SUBMITTED";

  return (
    <OverviewShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white light-dashboard:text-zinc-950">
              {t("merchantOnboarding.title")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400 light-dashboard:text-zinc-600">
              {t("merchantOnboarding.description")}
            </p>
          </div>
          <DashboardPill className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700">
            {completedCount}/{goLiveChecklist.length} {t("merchantOnboarding.completed")}
          </DashboardPill>
        </div>

        <Notice notice={notice} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <DashboardPanel className="overflow-hidden rounded-lg p-0 sm:p-0">
            <div className="settings-panel-header flex flex-col gap-3 border-b px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <Building2 size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white light-dashboard:text-zinc-950">
                    {t("merchantOnboarding.kybTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                    {t("merchantOnboarding.kybDescription")}
                  </p>
                </div>
              </div>
              <DashboardPill className={statusClassName[profileStatus] || statusClassName.NOT_SUBMITTED}>
                {profileStatus}
              </DashboardPill>
            </div>

            <form onSubmit={submitKyb} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.businessName")}</span>
                <DashboardInput
                  value={form.businessName}
                  onChange={(event) => updateForm("businessName", event.target.value)}
                  className="h-11 w-full rounded-lg"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.businessType")}</span>
                <DashboardSelect
                  value={form.businessType}
                  onChange={(event) => updateForm("businessType", event.target.value)}
                  className="h-11 w-full rounded-lg"
                  required
                >
                  {(requirements?.businessTypes || ["LIMITED_COMPANY"]).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </DashboardSelect>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.country")}</span>
                <DashboardInput
                  value={form.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  className="h-11 w-full rounded-lg"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.contactName")}</span>
                <DashboardInput
                  value={form.contactName}
                  onChange={(event) => updateForm("contactName", event.target.value)}
                  className="h-11 w-full rounded-lg"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.contactEmail")}</span>
                <DashboardInput
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => updateForm("contactEmail", event.target.value)}
                  className="h-11 w-full rounded-lg"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.expectedVolume")}</span>
                <DashboardSelect
                  value={form.expectedVolumeBand}
                  onChange={(event) => updateForm("expectedVolumeBand", event.target.value)}
                  className="h-11 w-full rounded-lg"
                >
                  {(requirements?.expectedVolumeBands || ["10K-50K"]).map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </DashboardSelect>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.registrationNumber")}</span>
                <DashboardInput
                  value={form.registrationNumber}
                  onChange={(event) => updateForm("registrationNumber", event.target.value)}
                  className="h-11 w-full rounded-lg"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-white light-dashboard:text-zinc-950">{t("merchantOnboarding.website")}</span>
                <DashboardInput
                  type="url"
                  value={form.website}
                  onChange={(event) => updateForm("website", event.target.value)}
                  placeholder="https://example.com"
                  className="h-11 w-full rounded-lg"
                />
              </label>

              <div className="flex justify-end sm:col-span-2">
                <DashboardButton
                  type="submit"
                  disabled={loading || savingKyb}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg px-5 disabled:opacity-60 sm:w-auto"
                >
                  {savingKyb ? t("merchantOnboarding.savingKyb") : t("merchantOnboarding.submitKyb")}
                </DashboardButton>
              </div>
            </form>
          </DashboardPanel>

          <div className="space-y-5">
            <DashboardPanel className="overflow-hidden rounded-lg p-0 sm:p-0">
              <div className="settings-panel-header flex items-start gap-3 border-b px-4 py-4 sm:px-5">
                <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <Scale size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white light-dashboard:text-zinc-950">
                    {t("merchantOnboarding.legalTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                    {t("merchantOnboarding.legalDescription")}
                  </p>
                </div>
              </div>

              <div className="settings-row-list divide-y divide-zinc-800">
                {(legal?.documents || []).map((document) => (
                  <div key={`${document.type}:${document.version}`} className="flex gap-3 px-4 py-4 sm:px-5">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        document.accepted
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 light-dashboard:border-zinc-200 light-dashboard:bg-zinc-100 light-dashboard:text-zinc-700"
                      }`}
                    >
                      <FileCheck2 size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">
                        {document.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                        {document.summary}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-zinc-500">
                        v{document.version} - {document.accepted ? t("merchantOnboarding.accepted") : t("merchantOnboarding.pending")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="settings-panel-footer border-t px-4 py-4 sm:px-5">
                <DashboardButton
                  type="button"
                  onClick={acceptLegal}
                  disabled={loading || acceptingLegal || legal?.allCurrentAccepted}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg px-5 disabled:opacity-60"
                >
                  {legal?.allCurrentAccepted
                    ? t("merchantOnboarding.legalAcceptedState")
                    : acceptingLegal
                      ? t("merchantOnboarding.acceptingLegal")
                      : t("merchantOnboarding.acceptLegal")}
                </DashboardButton>
              </div>
            </DashboardPanel>

            <DashboardPanel className="overflow-hidden rounded-lg p-0 sm:p-0">
              <div className="settings-panel-header flex items-start gap-3 border-b px-4 py-4 sm:px-5">
                <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <ListChecks size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white light-dashboard:text-zinc-950">
                    {t("merchantOnboarding.goLiveTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                    {travelRule?.policyDescription || t("merchantOnboarding.goLiveDescription")}
                  </p>
                </div>
              </div>

              <div className="settings-row-list divide-y divide-zinc-800">
                {goLiveChecklist.map((item) => (
                  <ChecklistItem key={item.title} complete={item.complete} title={item.title} description={item.description} />
                ))}
                {!onboardingChecklist?.checks?.length && (travelRule?.checklist || []).map((item) => (
                  <ChecklistItem
                    key={item.code}
                    complete={Boolean(item.complete)}
                    title={item.code.replaceAll("_", " ")}
                    description={item.description}
                  />
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel className="rounded-lg">
              <div className="flex items-start gap-3">
                <span className="settings-preference-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <Globe2 size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white light-dashboard:text-zinc-950">
                    {t("merchantOnboarding.travelRuleTitle")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400 light-dashboard:text-zinc-600">
                    {t("merchantOnboarding.travelRuleDescription")} {travelRule?.market || "TURKEY"} /{" "}
                    {travelRule?.threshold || "1000"} USDT
                  </p>
                  <DashboardPill
                    className={`mt-3 ${
                      travelRule?.readyForProductionEnforcement
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light-dashboard:text-emerald-700"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300 light-dashboard:text-amber-700"
                    }`}
                  >
                    {travelRule?.readyForProductionEnforcement
                      ? t("merchantOnboarding.ready")
                      : t("merchantOnboarding.reviewRequired")}
                  </DashboardPill>
                </div>
              </div>
            </DashboardPanel>
          </div>
        </div>
      </div>
    </OverviewShell>
  );
}
