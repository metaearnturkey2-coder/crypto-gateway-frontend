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

const PILOT_CODE_LABELS = {
  ACTIVE_API_KEY: "Aktif API anahtarı",
  BALANCE_RECONCILED: "Bakiye mutabakatı",
  LEGAL_DOCUMENTS_ACCEPTED: "Legal doküman kabulü",
  KYB_APPROVED: "KYB onayı",
  PAYOUT_ADDRESS_READY: "Payout adresi",
  RISK_EVENTS_REVIEWED: "Risk olayları",
  SANDBOX_PAYMENT_TESTED: "Sandbox ödeme testi",
  WEBHOOK_CONFIGURED: "Webhook kurulumu",
  balance_reconciliation: "Bakiye mutabakatı",
  checkedMerchants: "Kontrol edilen merchant",
  deadLetterWebhooks: "Dead-letter webhook",
  failedWebhooks: "Başarısız webhook",
  health_readiness: "Sistem sağlığı",
  kyb_review: "KYB inceleme",
  lastRunTimestamp: "Son çalışma",
  mismatchedMerchants: "Uyumsuz merchant",
  openRiskEvents: "Açık risk olayı",
  database: "Database",
  errors: "Hatalar",
  payment_backlog: "Ödeme kuyruğu",
  paymentCounts: "Ödeme sayımları",
  paymentWatcherPendingJobs: "Payment watcher işi",
  payout_backlog: "Payout kuyruğu",
  payoutCounts: "Payout sayımları",
  pendingKyb: "Bekleyen KYB",
  pendingOrFailedPayouts: "Bekleyen/başarısız payout",
  pendingOrReviewPayments: "Bekleyen/incelemedeki ödeme",
  queue_backlog: "Kuyruk birikimi",
  queues: "Kuyruklar",
  risk_review: "Risk inceleme",
  riskCounts: "Risk sayımları",
  security_config: "Güvenlik konfigürasyonu",
  status: "Durum",
  tron: "Tron",
  webhook_backlog: "Webhook kuyruğu",
  webhookRetryPendingJobs: "Webhook retry işi",
  activeApiKeys: "Aktif API anahtarı",
  activePayoutAddresses: "Aktif payout adresi",
  callbackUrl: "Callback URL",
  failedWebhookCount: "Başarısız webhook",
  hasWebhookSecret: "Webhook secret",
  kybStatus: "KYB durumu",
  livePaymentCount: "Live ödeme sayısı",
  missingLegalDocuments: "Eksik legal doküman",
  reconciliationStatus: "Mutabakat durumu",
  sandboxPaymentCount: "Sandbox ödeme sayısı",
  successfulWebhookCount: "Başarılı webhook",
};

const PILOT_STATUS_LABELS = {
  BLOCKED: "Blokaj",
  FAIL: "Başarısız",
  NOT_READY: "Hazır değil",
  PASS: "Geçti",
  READY: "Hazır",
  REVIEW_REQUIRED: "İnceleme gerekli",
  WAITING: "Bekliyor",
  WARN: "Uyarı",
};

export const formatPilotCode = (value) =>
  PILOT_CODE_LABELS[value] ||
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const formatPilotStatus = (status) => PILOT_STATUS_LABELS[status] || status || "Bilinmiyor";

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
      label: "GO adayı",
      title: "Pilot ilerleyebilir",
      description: "Kritik kontroller geçiyor. Launch onayı öncesi kanıtları güncel tutun.",
    };
  }

  if (status === "NOT_READY" || status === "BLOCKED" || status === "FAIL") {
    return {
      label: "NO-GO",
      title: "Pilot blokajda",
      description: "Merchant trafiği veya production pilot aktivitesi başlamadan önce başarısız kontrolleri çözün.",
    };
  }

  return {
    label: "İnceleme gerekli",
    title: "Pilot için operatör onayı gerekli",
    description: "Uyarılar veya eksik kanıtlar ilerlemeden önce admin kararı gerektiriyor.",
  };
};

const PILOT_ACTIONS = {
  ACTIVE_API_KEY: {
    href: "/settings/api",
    label: "API anahtarlarını incele",
    text: "Live trafik açılmadan önce merchant API anahtarını oluşturun veya aktifleştirin.",
  },
  BALANCE_RECONCILED: {
    href: "/admin/reconciliation",
    label: "Mutabakatı aç",
    text: "Finans mutabakatını çalıştırın ve ledger uyumsuzluklarını çözün.",
  },
  LEGAL_DOCUMENTS_ACCEPTED: {
    href: "/settings/business-settings",
    label: "İşletme ayarlarını incele",
    text: "Bu merchant için güncel legal dokümanların kabul edildiğini doğrulayın.",
  },
  KYB_APPROVED: {
    href: "/settings/business-settings",
    label: "KYB incele",
    text: "Pilot go-live öncesi KYB incelemesini tamamlayın.",
  },
  PAYOUT_ADDRESS_READY: {
    href: "/admin/settlement-console",
    label: "Settlement incele",
    text: "Payout öncesi aktif whitelist adresi bulunduğunu doğrulayın.",
  },
  RISK_EVENTS_REVIEWED: {
    href: "/admin/risk-review",
    label: "Risk incelemeyi aç",
    text: "Pilot erişimi genişlemeden önce açık risk olaylarını inceleyin.",
  },
  SANDBOX_PAYMENT_TESTED: {
    href: "/business-wallet/merchants",
    label: "Merchant ödemelerini aç",
    text: "Live trafik göndermeden önce sandbox ödeme testi çalıştırın.",
  },
  WEBHOOK_CONFIGURED: {
    href: "/business-wallet/webhooks",
    label: "Webhookları incele",
    text: "Callback URL'i yapılandırın ve başarılı webhook teslimatını doğrulayın.",
  },
  balance_reconciliation: {
    href: "/admin/reconciliation",
    label: "Mutabakatı aç",
    text: "Mutabakatı çalıştırın ve merchant bakiye uyumsuzluklarını çözün.",
  },
  health_readiness: {
    href: "/admin",
    label: "Admin konsolunu aç",
    text: "Pilot onayı öncesi sistem sağlık bağımlılıklarını kontrol edin.",
  },
  kyb_review: {
    href: "/settings/business-settings",
    label: "KYB incele",
    text: "Pilot erişimi genişlemeden önce bekleyen KYB incelemelerini temizleyin.",
  },
  payment_backlog: {
    href: "/business-wallet/merchants",
    label: "Ödemeleri incele",
    text: "Bekleyen, eksik ödenmiş veya manuel incelemedeki ödemeleri çözün.",
  },
  payout_backlog: {
    href: "/admin/settlement-console",
    label: "Payoutları incele",
    text: "Pilot imzası öncesi requested, approved veya failed payoutları temizleyin.",
  },
  queue_backlog: {
    href: "/admin",
    label: "Admin konsolunu aç",
    text: "Background jobların bitmesini bekleyin veya takılan workerları inceleyin.",
  },
  risk_review: {
    href: "/admin/risk-review",
    label: "Risk incelemeyi aç",
    text: "Pilot limitleri artmadan önce açık risk olaylarını inceleyin.",
  },
  security_config: {
    href: "/admin",
    label: "Güvenlik ayarlarını incele",
    text: "Production pilot öncesi eksik kritik güvenlik konfigürasyonunu tamamlayın.",
  },
  webhook_backlog: {
    href: "/business-wallet/webhooks",
    label: "Webhookları incele",
    text: "Başarısız webhookları tekrar deneyin ve dead-letter olaylarını inceleyin.",
  },
};

export const getPilotAction = (code, status) => {
  if (!code || status === "PASS" || status === "READY") return null;

  return PILOT_ACTIONS[code] || {
    href: "/admin",
    label: "Kontrolü incele",
    text: "Pilot onayı öncesi bu kontrolü inceleyin ve uyarıyı temizleyin.",
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
      title: `${blocked} kritik madde pilotu blokluyor`,
      description: firstAction
        ? `Önce ${firstAction.label.toLowerCase()}: ${firstAction.text}`
        : "Pilot onayı öncesi kritik kontrolleri çözün.",
    };
  }

  if (review > 0) {
    return {
      status: "İnceleme",
      title: `${review} madde operatör incelemesi gerektiriyor`,
      description: firstAction
        ? `Önce ${firstAction.label.toLowerCase()}: ${firstAction.text}`
        : "Launch öncesi uyarıları temizleyin veya onay kararını dokümante edin.",
    };
  }

  if (total > 0 && ready === total) {
    return {
      status: "GO",
      title: "Görünen tüm pilot kontrolleri geçiyor",
      description: "Final launch onayına kadar bu kanıtları güncel tutun.",
    };
  }

  return {
    status: "Bekliyor",
    title: "Henüz aksiyon alınabilir pilot kontrolü yüklenmedi",
    description: actionItems.length > 0
      ? "Final onay öncesi yüklenen checklist'i inceleyin."
      : "Pilot readiness kanıtlarını yüklemek için sayfayı yenileyin veya filtreleri düzenleyin.",
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
    evidence.push(["Oluşturulma", formatPilotDateTime(timestamp)]);
  }

  if (details.lastRunTimestamp) {
    evidence.push(["Son mutabakat", formatPilotDateTime(details.lastRunTimestamp)]);
  }

  if (details.checkedMerchants !== undefined) {
    evidence.push(["Kontrol edilen merchant", String(details.checkedMerchants)]);
  }

  if (details.mismatchedMerchants !== undefined) {
    evidence.push(["Uyumsuzluk", String(details.mismatchedMerchants)]);
  }

  if (details.pendingOrReviewPayments !== undefined) {
    evidence.push(["Ödeme kuyruğu", String(details.pendingOrReviewPayments)]);
  }

  if (details.failedWebhooks !== undefined || details.deadLetterWebhooks !== undefined) {
    evidence.push([
      "Webhook kuyruğu",
      `${details.failedWebhooks || 0} başarısız / ${details.deadLetterWebhooks || 0} dead-letter`,
    ]);
  }

  if (details.pendingOrFailedPayouts !== undefined) {
    evidence.push(["Payout kuyruğu", String(details.pendingOrFailedPayouts)]);
  }

  if (details.openRiskEvents !== undefined) {
    evidence.push(["Açık risk olayı", String(details.openRiskEvents)]);
  }

  if (details.pendingKyb !== undefined) {
    evidence.push(["Bekleyen KYB", String(details.pendingKyb)]);
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
      const displayValue = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return [
        key,
        displayValue,
      ];
    });
};
