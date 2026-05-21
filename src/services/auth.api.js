import api from "./api";

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const res = await api.post("/auth/reset-password", { email, otp, newPassword });
  return res.data;
};