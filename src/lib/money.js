export const parseMoneyAmount = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const hasMoreThanDecimals = (value, maxDecimals = 2) => {
  const [, decimals = ""] = String(value || "").split(".");
  return decimals.length > maxDecimals;
};

export const formatMoneyAmount = (value, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 6,
    locale,
  } = options;
  const numeric = parseMoneyAmount(value);

  return numeric.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

export const formatTokenAmount = (value, currency = "USDT", options = {}) =>
  `${formatMoneyAmount(value, options)} ${currency}`;
