export const PILOT_DETAIL_KEYS = [
  "checkedMerchants",
  "mismatchedMerchants",
  "lastRunTimestamp",
  "pendingOrReviewPayments",
  "failedWebhooks",
  "deadLetterWebhooks",
  "pendingOrFailedPayouts",
  "openRiskEvents",
  "pendingKyb",
];

export const formatPilotCode = (value) =>
  String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const getPilotStatusClassName = (status) => {
  if (status === "READY" || status === "PASS") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "NOT_READY" || status === "BLOCKED" || status === "FAIL") {
    return "border-red-400/40 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
};

const PILOT_STATUS_PRIORITY = {
  BLOCKED: 0,
  FAIL: 0,
  NOT_READY: 0,
  REVIEW_REQUIRED: 1,
  WARN: 1,
  READY: 2,
  PASS: 2,
};

export const getPilotStatusPriority = (status) => PILOT_STATUS_PRIORITY[status] ?? 1;

export const sortPilotItemsByPriority = (items = [], getStatus = (item) => item?.status) =>
  [...items].sort((first, second) => {
    const firstPriority = getPilotStatusPriority(getStatus(first));
    const secondPriority = getPilotStatusPriority(getStatus(second));

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    const firstLabel = first?.name || first?.code || first?.merchant?.name || "";
    const secondLabel = second?.name || second?.code || second?.merchant?.name || "";
    return String(firstLabel).localeCompare(String(secondLabel));
  });

export const getPilotDecision = (status) => {
  if (status === "READY") {
    return {
      label: "GO candidate",
      title: "Pilot can move forward",
      description: "Critical controls are passing. Keep the evidence fresh before launch approval.",
    };
  }

  if (status === "NOT_READY" || status === "BLOCKED" || status === "FAIL") {
    return {
      label: "NO-GO",
      title: "Pilot is blocked",
      description: "Resolve failed controls before merchant traffic or production pilot activity.",
    };
  }

  return {
    label: "Review required",
    title: "Pilot needs operator review",
    description: "Warnings or missing evidence need an admin decision before moving forward.",
  };
};

const PILOT_ACTIONS = {
  ACTIVE_API_KEY: {
    href: "/settings/api",
    label: "Review API keys",
    text: "Create or activate a merchant API key before allowing live traffic.",
  },
  BALANCE_RECONCILED: {
    href: "/admin/reconciliation",
    label: "Open reconciliation",
    text: "Run finance reconciliation and resolve any ledger mismatch.",
  },
  LEGAL_DOCUMENTS_ACCEPTED: {
    href: "/settings/business-settings",
    label: "Review business settings",
    text: "Confirm current legal documents are accepted for this merchant.",
  },
  KYB_APPROVED: {
    href: "/settings/business-settings",
    label: "Review KYB",
    text: "Complete KYB review before pilot go-live.",
  },
  PAYOUT_ADDRESS_READY: {
    href: "/admin/settlement-console",
    label: "Review settlement",
    text: "Confirm an active payout whitelist address exists before payouts.",
  },
  RISK_EVENTS_REVIEWED: {
    href: "/admin/risk-review",
    label: "Open risk review",
    text: "Review open risk events before expanding pilot access.",
  },
  SANDBOX_PAYMENT_TESTED: {
    href: "/business-wallet/merchants",
    label: "Open merchant payments",
    text: "Run a sandbox payment before sending live traffic.",
  },
  WEBHOOK_CONFIGURED: {
    href: "/business-wallet/webhooks",
    label: "Review webhooks",
    text: "Configure the callback URL and verify a successful webhook delivery.",
  },
  balance_reconciliation: {
    href: "/admin/reconciliation",
    label: "Open reconciliation",
    text: "Run reconciliation and resolve mismatched merchant balances.",
  },
  health_readiness: {
    href: "/admin",
    label: "Open admin console",
    text: "Check system health dependencies before pilot approval.",
  },
  kyb_review: {
    href: "/settings/business-settings",
    label: "Review KYB",
    text: "Clear pending KYB reviews before expanding pilot access.",
  },
  payment_backlog: {
    href: "/business-wallet/merchants",
    label: "Review payments",
    text: "Resolve pending, underpaid, or manual-review payments.",
  },
  payout_backlog: {
    href: "/admin/settlement-console",
    label: "Review payouts",
    text: "Clear requested, approved, or failed payouts before pilot sign-off.",
  },
  queue_backlog: {
    href: "/admin",
    label: "Open admin console",
    text: "Let background jobs drain or inspect stuck queue workers.",
  },
  risk_review: {
    href: "/admin/risk-review",
    label: "Open risk review",
    text: "Review open risk events before increasing pilot limits.",
  },
  security_config: {
    href: "/admin",
    label: "Review security config",
    text: "Fix missing critical security configuration before production pilot.",
  },
  webhook_backlog: {
    href: "/business-wallet/webhooks",
    label: "Review webhooks",
    text: "Retry failed webhooks and inspect dead-letter events.",
  },
};

export const getPilotAction = (code, status) => {
  if (!code || status === "PASS" || status === "READY") return null;

  return PILOT_ACTIONS[code] || {
    href: "/admin",
    label: "Review control",
    text: "Review this control and clear the warning before pilot approval.",
  };
};

export const getPilotOperatorSummary = ({
  actionItems = [],
  blocked = 0,
  firstAction,
  ready = 0,
  review = 0,
  total = 0,
} = {}) => {
  if (blocked > 0) {
    return {
      status: "NO-GO",
      title: `${blocked} critical item${blocked === 1 ? "" : "s"} blocking pilot readiness`,
      description: firstAction
        ? `Start with ${firstAction.label.toLowerCase()}: ${firstAction.text}`
        : "Resolve critical controls before pilot approval.",
    };
  }

  if (review > 0) {
    return {
      status: "Review",
      title: `${review} item${review === 1 ? "" : "s"} need operator review`,
      description: firstAction
        ? `Start with ${firstAction.label.toLowerCase()}: ${firstAction.text}`
        : "Clear warnings or document the approval decision before launch.",
    };
  }

  if (total > 0 && ready === total) {
    return {
      status: "GO",
      title: "All visible pilot controls are passing",
      description: "Keep this evidence fresh until the final launch approval.",
    };
  }

  return {
    status: "Waiting",
    title: "No actionable pilot controls loaded yet",
    description: actionItems.length > 0
      ? "Review the loaded checklist before final approval."
      : "Refresh the page or adjust filters to load pilot readiness evidence.",
  };
};

export const formatPilotDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const getPilotEvidence = (details = {}, timestamp) => {
  const evidence = [];

  if (timestamp) {
    evidence.push(["Generated", formatPilotDateTime(timestamp)]);
  }

  if (details.lastRunTimestamp) {
    evidence.push(["Last reconciliation", formatPilotDateTime(details.lastRunTimestamp)]);
  }

  if (details.checkedMerchants !== undefined) {
    evidence.push(["Checked merchants", String(details.checkedMerchants)]);
  }

  if (details.mismatchedMerchants !== undefined) {
    evidence.push(["Mismatches", String(details.mismatchedMerchants)]);
  }

  if (details.pendingOrReviewPayments !== undefined) {
    evidence.push(["Payment backlog", String(details.pendingOrReviewPayments)]);
  }

  if (details.failedWebhooks !== undefined || details.deadLetterWebhooks !== undefined) {
    evidence.push([
      "Webhook backlog",
      `${details.failedWebhooks || 0} failed / ${details.deadLetterWebhooks || 0} dead-letter`,
    ]);
  }

  if (details.pendingOrFailedPayouts !== undefined) {
    evidence.push(["Payout backlog", String(details.pendingOrFailedPayouts)]);
  }

  if (details.openRiskEvents !== undefined) {
    evidence.push(["Open risk events", String(details.openRiskEvents)]);
  }

  if (details.pendingKyb !== undefined) {
    evidence.push(["Pending KYB", String(details.pendingKyb)]);
  }

  return evidence.slice(0, 4);
};

export const summarizePilotDetails = (details = {}, preferredKeys = PILOT_DETAIL_KEYS) => {
  if (!details || Object.keys(details).length === 0) return [];

  const keys = preferredKeys.filter((key) => details[key] !== undefined && details[key] !== null);
  const selectedKeys = keys.length > 0 ? keys : Object.keys(details);

  return selectedKeys
    .filter((key) => details[key] !== undefined && details[key] !== null)
    .map((key) => {
      const value = details[key];
      return [
        key,
        Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value),
      ];
    });
};
