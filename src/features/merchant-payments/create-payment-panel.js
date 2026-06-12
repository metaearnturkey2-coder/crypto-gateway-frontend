import { CreditCard, Plus } from "lucide-react";
import { DashboardButton, DashboardInput, DashboardPanel } from "@/components/dashboard-ui";

export function CreatePaymentPanel({
  creatingPayment,
  maxAmount,
  minAmount,
  newAmount,
  newCustomerEmail,
  newOrderId,
  onCreatePayment,
  setNewAmount,
  setNewCustomerEmail,
  setNewOrderId,
  t,
}) {
  return (
    <DashboardPanel as="div" variant="merchant" className="mb-5 !rounded-lg p-4 md:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-emerald-300">
          <CreditCard size={17} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">{t("merchantPayments.createPayment")}</h2>
          <p className="payment-create-helper text-sm">{t("merchantPayments.createPaymentDescription")}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1fr)_minmax(220px,1fr)_170px]">
        <DashboardInput
          type="number"
          min={minAmount}
          max={maxAmount}
          step="0.01"
          placeholder={t("merchantPayments.amountPlaceholder")}
          value={newAmount}
          onChange={(event) => setNewAmount(event.target.value)}
          className="payment-create-input h-10 !rounded-lg transition"
        />
        <DashboardInput
          type="text"
          placeholder={t("merchantPayments.orderId")}
          maxLength={80}
          value={newOrderId}
          onChange={(event) => setNewOrderId(event.target.value)}
          className="payment-create-input h-10 !rounded-lg transition"
        />
        <DashboardInput
          type="email"
          placeholder={t("merchantPayments.customerEmail")}
          maxLength={254}
          value={newCustomerEmail}
          onChange={(event) => setNewCustomerEmail(event.target.value)}
          className="payment-create-input h-10 !rounded-lg transition"
        />
        <DashboardButton
          onClick={onCreatePayment}
          disabled={creatingPayment}
          className="payment-create-button flex h-10 items-center justify-center gap-2 !rounded-lg px-4 disabled:opacity-60"
        >
          <Plus size={15} />
          {creatingPayment ? t("merchantPayments.creating") : t("merchantPayments.createPayment")}
        </DashboardButton>
      </div>
      <p className="payment-create-helper mt-3 text-xs">
        {t("merchantPayments.helper")}
      </p>
    </DashboardPanel>
  );
}
