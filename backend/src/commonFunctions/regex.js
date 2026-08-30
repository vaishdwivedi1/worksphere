export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
export const plans = ["FREE", "PRO", "PREMIUM"];
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const isValidEmail = (email) => {
  if (!email) return false;
  return emailRegex.test(email);
};

export const isValidMobile = (mobile) => {
  if (!mobile) return false;
  return phoneRegex.test(mobile);
};

export const isValidPlan = (plan) => {
  if (!plan) return false;
  return plans.includes(plan.toUpperCase());
};

export const isValidPassword = (password) => {
  return password && password.length >= 8;
};
