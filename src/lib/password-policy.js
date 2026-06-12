export const PASSWORD_REQUIREMENTS = [
  {
    code: "min_length",
    labelKey: "auth.passwordRequirementLength",
    test: (password) => password.length >= 10,
  },
  {
    code: "uppercase",
    labelKey: "auth.passwordRequirementUppercase",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    code: "lowercase",
    labelKey: "auth.passwordRequirementLowercase",
    test: (password) => /[a-z]/.test(password),
  },
  {
    code: "number",
    labelKey: "auth.passwordRequirementNumber",
    test: (password) => /\d/.test(password),
  },
  {
    code: "symbol",
    labelKey: "auth.passwordRequirementSymbol",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
  {
    code: "common_password",
    labelKey: "auth.passwordRequirementCommon",
    test: (password) => {
      const normalized = password.toLowerCase();
      return normalized.length > 0 && !["123456", "password", "qwerty", "111111", "testpassword"].includes(normalized);
    },
  },
];

export const getPasswordRequirementState = (password) =>
  PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));

export const isPasswordPolicyValid = (password) =>
  getPasswordRequirementState(password).every((requirement) => requirement.met);
