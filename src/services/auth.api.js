import api from "./api";

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

// ── Registration OTP Flow ──
export const sendRegistrationOtp = async (email) => {
  const res = await api.post("/auth/send-registration-otp", { email });
  return res.data;
};

export const verifyRegistrationOtp = async (email, otp) => {
  const res = await api.post("/auth/verify-registration-otp", { email, otp });
  return res.data;
};

export const registerUser = async ({ name, username, password, emailVerifiedToken }) => {
  const res = await api.post("/auth/register", { name, username, password, emailVerifiedToken });
  return res.data;
};

// ── Forgot Password Flow ──
export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const res = await api.post("/auth/reset-password", { email, otp, newPassword });
  return res.data;
};