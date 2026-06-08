"use client";

import { useCallback, useEffect, useState } from "react";
import OverviewShell from "@/components/overview-shell";
import { useDashboardLanguage, useDashboardTimeZone } from "@/lib/i18n";
import { hasMoreThanDecimals, parseMoneyAmount } from "@/lib/money";
import {
  createDashboardPayment,
  getPaymentDetails,
  listAuditLogs,
  listPayments,
  retryPaymentWebhook,
  runDashboardPaymentAction,
} from "@/features/merchant-payments/api";
import {
  ActivityPanel,
  CreatePaymentPanel,
  NoticeBanner,
  PaymentDetailsModal,
  PaymentOperationsPanel,
} from "@/features/merchant-payments/components";
import {
  EMAIL_PATTERN,
  MAX_PAYMENT_AMOUNT,
  MIN_PAYMENT_AMOUNT,
  ORDER_ID_PATTERN,
} from "@/features/merchant-payments/validation";

export default function BusinessWalletMerchantsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({ page: 1, totalCount: 0, totalPages: 1 });
  const [paymentSearch, setPaymentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("ALL");
  const [paymentPage, setPaymentPage] = useState(1);
  const [now, setNow] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: 5,
    totalCount: 0,
    totalPages: 1,
  });
  const [auditActions, setAuditActions] = useState([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState("ALL");
  const [newAmount, setNewAmount] = useState("");
  const [newOrderId, setNewOrderId] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [notice, setNotice] = useState(null);
  const [paymentAction, setPaymentAction] = useState(null);
  const [webhookAction, setWebhookAction] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const { t } = useDashboardLanguage();
  const timeZone = useDashboardTimeZone();

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ type: "success", message: `${label} copied.` });
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      setNotice({ type: "success", message: `${label} copied.` });
    }
  };

  const fetchOps = useCallback(async () => {
    const { body: data } = await listPayments({
      page: paymentPage,
      search: paymentSearch,
      status: statusFilter,
      webhookStatus: webhookStatusFilter,
    });
    setPayments(data.payments || []);
    setPaymentPagination({
      page: data.pagination?.page || data.page || paymentPage,
      totalCount:
        data.pagination?.totalCount ??
        data.pagination?.total ??
        data.totalCount ??
        data.stats?.total ??
        0,
      totalPages: data.pagination?.totalPages || data.totalPages || 1,
    });
  }, [paymentPage, paymentSearch, statusFilter, webhookStatusFilter]);

  const fetchActivity = useCallback(async () => {
    const { body: data } = await listAuditLogs({
      action: auditActionFilter,
      limit: auditPagination.limit,
      page: auditPage,
      targetType: auditTargetTypeFilter,
    });
    setAuditLogs(data.auditLogs || []);
    setAuditPagination({
      page: data.page || auditPage,
      limit: data.limit || auditPagination.limit,
      totalCount: data.totalCount || 0,
      totalPages: data.totalPages || 1,
    });
    setAuditActions(data.actions || []);
    setAuditTargetTypes(data.targetTypes || []);
  }, [auditActionFilter, auditPage, auditPagination.limit, auditTargetTypeFilter]);

  const createPayment = async () => {
    const amountNumber = parseMoneyAmount(newAmount, NaN);
    if (!Number.isFinite(amountNumber)) {
      setNotice({ type: "error", message: t("merchantPayments.validAmount") });
      return;
    }

    if (amountNumber < MIN_PAYMENT_AMOUNT || amountNumber > MAX_PAYMENT_AMOUNT) {
      setNotice({
        type: "error",
        message: `${t("merchantPayments.amountRange")} ${MIN_PAYMENT_AMOUNT} - ${MAX_PAYMENT_AMOUNT} USDT.`,
      });
      return;
    }

    if (hasMoreThanDecimals(newAmount, 2)) {
      setNotice({ type: "error", message: "Amount can have at most 2 decimal places." });
      return;
    }

    const trimmedOrderId = newOrderId.trim();
    if (trimmedOrderId && (trimmedOrderId.length > 80 || !ORDER_ID_PATTERN.test(trimmedOrderId))) {
      setNotice({
        type: "error",
        message: t("merchantPayments.orderIdValidation"),
      });
      return;
    }

    const trimmedCustomerEmail = newCustomerEmail.trim();
    if (trimmedCustomerEmail && (trimmedCustomerEmail.length > 254 || !EMAIL_PATTERN.test(trimmedCustomerEmail))) {
      setNotice({ type: "error", message: t("merchantPayments.emailValidation") });
      return;
    }

    setCreatingPayment(true);
    setNotice(null);
    try {
      const { body: data, ok } = await createDashboardPayment({
        amount: newAmount.trim(),
        orderId: trimmedOrderId,
        customerEmail: trimmedCustomerEmail,
      });

      if (!ok) {
        setNotice({
          type: "error",
          message: data.errors?.join(" ") || data.message || t("merchantPayments.createError"),
        });
        return;
      }

      setNotice({ type: "success", message: data.message || "Payment created." });
      setNewAmount("");
      setNewOrderId("");
      setNewCustomerEmail("");
      setPaymentPage(1);
      setPaymentSearch("");
      setStatusFilter("ALL");
      setWebhookStatusFilter("ALL");
      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: t("merchantPayments.createError") });
    } finally {
      setCreatingPayment(false);
    }
  };

  const runPaymentAction = async (paymentId, action) => {
    setPaymentAction({ paymentId, action });
    setNotice(null);

    try {
      const { body: data, ok } = await runDashboardPaymentAction({
        action,
        paymentId,
      });

      if (!ok) {
        setNotice({
          type: "error",
          message: data.message || `Payment ${action} failed.`,
        });
        return;
      }

      if (action === "verify" && data.underpaid) {
        setVerificationResult({
          paymentId,
          type: "underpaid",
          ...data.underpaid,
        });
        setNotice({
          type: "error",
          message: `${t("merchantPayments.underpaidNotice")} ${t("merchantPayments.received")}: ${data.underpaid.amountReceived} USDT, ${t("merchantPayments.missing").toLowerCase()}: ${data.underpaid.amountMissing} USDT.`,
        });
      } else {
        setVerificationResult(
          action === "verify" && data.payment?.status === "PAID"
            ? {
                paymentId,
                type: "paid",
                txHash: data.payment.txHash,
              }
            : null
        );
        setNotice({
          type: "success",
          message: data.message || `Payment ${action} completed.`,
        });
      }
      setConfirmAction(null);

      if (selectedPayment?.id === paymentId && data.payment) {
        setSelectedPayment((current) => ({
          ...current,
          ...data.payment,
          webhookEvents: current?.webhookEvents || data.payment.webhookEvents,
        }));
      }

      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: `Payment ${action} failed.` });
    } finally {
      setPaymentAction(null);
    }
  };

  const openPaymentDetails = async (payment) => {
    setSelectedPayment(payment);

    try {
      const { body: data, ok } = await getPaymentDetails(payment.id);
      if (ok && data.payment) {
        setSelectedPayment(data.payment);
      }
    } catch {
      setNotice({ type: "error", message: t("merchantPayments.detailsRefreshError") });
    }
  };

  const refreshSelectedPayment = async (paymentId) => {
    const { body: data, ok } = await getPaymentDetails(paymentId);
    if (ok && data.payment) {
      setSelectedPayment(data.payment);
    }
  };

  const retryWebhook = async (paymentId, webhookId) => {
    setWebhookAction({ paymentId, webhookId });
    setNotice(null);

    try {
      const { body: data, ok } = await retryPaymentWebhook({
        paymentId,
        webhookId,
      });

      if (!ok) {
        setNotice({
          type: "error",
          message: data.message || "Webhook retry failed.",
        });
        return;
      }

      setNotice({
        type: "success",
        message: data.message || "Webhook retry attempted.",
      });
      await refreshSelectedPayment(paymentId);
      await fetchOps();
      await fetchActivity();
    } catch {
      setNotice({ type: "error", message: "Webhook retry failed." });
    } finally {
      setWebhookAction(null);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchOps();
        await fetchActivity();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [fetchActivity, fetchOps]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => {
      fetchOps();
      fetchActivity();
    }, 10000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [fetchActivity, fetchOps]);

  return (
    <OverviewShell>
      <NoticeBanner notice={notice} />

      <CreatePaymentPanel
        creatingPayment={creatingPayment}
        maxAmount={MAX_PAYMENT_AMOUNT}
        minAmount={MIN_PAYMENT_AMOUNT}
        newAmount={newAmount}
        newCustomerEmail={newCustomerEmail}
        newOrderId={newOrderId}
        onCreatePayment={createPayment}
        setNewAmount={setNewAmount}
        setNewCustomerEmail={setNewCustomerEmail}
        setNewOrderId={setNewOrderId}
        t={t}
      />

      <PaymentOperationsPanel
        confirmAction={confirmAction}
        copyText={copyText}
        loading={loading}
        now={now}
        paymentAction={paymentAction}
        paymentPagination={paymentPagination}
        payments={payments}
        paymentSearch={paymentSearch}
        runPaymentAction={runPaymentAction}
        setConfirmAction={setConfirmAction}
        setPaymentPage={setPaymentPage}
        setPaymentSearch={setPaymentSearch}
        setStatusFilter={setStatusFilter}
        setWebhookStatusFilter={setWebhookStatusFilter}
        statusFilter={statusFilter}
        timeZone={timeZone}
        t={t}
        webhookStatusFilter={webhookStatusFilter}
      />
      <ActivityPanel
        auditActionFilter={auditActionFilter}
        auditActions={auditActions}
        auditLogs={auditLogs}
        auditPagination={auditPagination}
        auditTargetTypeFilter={auditTargetTypeFilter}
        auditTargetTypes={auditTargetTypes}
        setAuditActionFilter={setAuditActionFilter}
        setAuditPage={setAuditPage}
        setAuditTargetTypeFilter={setAuditTargetTypeFilter}
        timeZone={timeZone}
        t={t}
      />

      <PaymentDetailsModal
        confirmAction={confirmAction}
        copyText={copyText}
        now={now}
        onClose={() => setSelectedPayment(null)}
        paymentAction={paymentAction}
        retryWebhook={retryWebhook}
        runPaymentAction={runPaymentAction}
        selectedPayment={selectedPayment}
        setConfirmAction={setConfirmAction}
        setConfirmActionEmpty={() => setConfirmAction(null)}
        timeZone={timeZone}
        t={t}
        verificationResult={verificationResult}
        webhookAction={webhookAction}
      />
    </OverviewShell>
  );
}
