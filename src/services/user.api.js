import api from "./api";

export const getUserStatus = async (userId) => {
  const res = await api.get(`/users/status/${userId}`);
  return res.data;
};

export const getMyProfile = async () => {
  const res = await api.get("/users/profile");
  return res.data;
};

export const toggleBlockUser = async (targetUserId) => {
  const res = await api.put(`/users/block/${targetUserId}`);
  return res.data;
};

export const searchUsers = async (searchQuery) => {
  // Use encodeURIComponent to safely handle spaces and special characters in the URL
  const res = await api.get(`/users/search?search=${encodeURIComponent(searchQuery)}`);
  return res.data;
};

export const registerFcmToken = async (token) => {
  const res = await api.post("/users/fcm-token", { token });
  return res.data;
};

export const requestDataBackup = async () => {
  const res = await api.get("/users/export-data");
  return res.data;
};

export const requestDeletionOtp = async () => {
  const res = await api.post("/users/delete-account/otp");
  return res.data;
};

export const deleteAccount = async (password, otp) => {
  const res = await api.delete("/users/delete-account", {
    data: { password, otp } // Axios requires payload in 'data' field for DELETE requests
  });
  return res.data;
};

// ==========================================
// 2. PROFILE MUTATIONS
// ==========================================

export const updateUserProfile = async (formData) => {
  const res = await api.put("/users/profile", formData, {
    // Axios will automatically append the correct boundary for the file payload
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updatePassword = async (passwords) => {
  const res = await api.put("/users/password", passwords);
  return res.data;
};

// 🛡️ Ensure this exact function is present and exported
export const logoutAllDevices = async () => {
  const res = await api.post("/users/logout-all");
  return res.data;
};