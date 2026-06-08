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
    <div className="merchant-payments-panel mb-5 rounded-2xl border p-4">
      <div className="mb-4 flex flex-col">
        <h2 className="text-xl font-bold">{t("merchantPayments.createPayment")}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1fr)_minmax(220px,1fr)_180px]">
        <input
          type="number"
          min={minAmount}
          max={maxAmount}
          step="0.01"
          placeholder={t("merchantPayments.amountPlaceholder")}
          value={newAmount}
          onChange={(event) => setNewAmount(event.target.value)}
          className="payment-create-input rounded-lg border px-4 py-2.5 outline-none transition"
        />
        <input
          type="text"
          placeholder={t("merchantPayments.orderId")}
          maxLength={80}
          value={newOrderId}
          onChange={(event) => setNewOrderId(event.target.value)}
          className="payment-create-input rounded-lg border px-4 py-2.5 outline-none transition"
        />
        <input
          type="email"
          placeholder={t("merchantPayments.customerEmail")}
          maxLength={254}
          value={newCustomerEmail}
          onChange={(event) => setNewCustomerEmail(event.target.value)}
          className="payment-create-input rounded-lg border px-4 py-2.5 outline-none transition"
        />
        <button
          onClick={onCreatePayment}
          disabled={creatingPayment}
          className="payment-create-button h-[45px] rounded-lg border px-5 font-semibold transition disabled:opacity-60"
        >
          {creatingPayment ? t("merchantPayments.creating") : t("merchantPayments.createPayment")}
        </button>
      </div>
      <p className="payment-create-helper mt-2 text-xs">
        {t("merchantPayments.helper")}
      </p>
    </div>
  );
}
