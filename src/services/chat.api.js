import api from "./api";

// ==========================================
// 1️⃣ DATA FETCHING (Defensive Fallbacks)
// ==========================================

export const getChats = async () => {
  try {
    const res = await api.get("/chat");
    // 🛡️ Ensure we always return an array, even if the backend payload is malformed
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Failed to fetch chats API:", error);
    // 🛡️ CRITICAL FIX: Return a safe primitive so components don't crash on .map() or .find()
    return [];
  }
};

// 🛡️ ARCHITECTURAL ADDITION: Access or create a 1-on-1 chat
export const accessChat = async (userId) => {
  try {
    const res = await api.post("/chat", { userId });
    return res.data;
  } catch (error) {
    console.error("Failed to access 1-on-1 chat API:", error);
    throw error;
  }
};

// ==========================================
// 2️⃣ MUTATIONS (Explicit Error Bubbling)
// Note: Catch errors to log them, but re-throw so the calling 
// React components can stop loading spinners or keep modals open.
// ==========================================

export const createGroupChat = async (name, users) => {
  try {
    // Ensure we are sending the exact payload structure our Zod schema expects
    const res = await api.post("/chat/group", { name, users });
    return res.data;
  } catch (error) {
    console.error("Failed to create group chat API:", error);
    throw error; // Bubble up to component's try/catch
  }
};

// 🛡️ ARCHITECTURAL ADDITION: Replaces/Enhances renameGroupChat for the new GroupInfoModal
export const updateGroupDetails = async (chatId, data) => {
  try {
    // data payload expects: { chatName: string, description: string }
    const res = await api.put(`/chat/group/${chatId}/details`, data);
    return res.data;
  } catch (error) {
    console.error("Failed to update group details API:", error);
    throw error;
  }
};


// Note: Keeping renameGroupChat for backward compatibility if older components still use it.
// Consider deprecating this once updateGroupDetails is fully integrated.
export const renameGroupChat = async (chatId, newName) => {
  try {
    const res = await api.put("/chat/group/rename", { chatId, newName });
    return res.data;
  } catch (error) {
    console.error("Failed to rename group chat API:", error);
    throw error;
  }
};

export const addUserToGroup = async (chatId, userId) => {
  try {
    const res = await api.put("/chat/group/add", { chatId, userId });
    return res.data;
  } catch (error) {
    console.error("Failed to add user to group API:", error);
    throw error;
  }
};

export const removeUserFromGroup = async (chatId, userId) => {
  try {
    const res = await api.put("/chat/group/remove", { chatId, userId });
    return res.data;
  } catch (error) {
    console.error("Failed to remove user from group API:", error);
    throw error;
  }
};

export const leaveGroupChat = async (chatId) => {
  try {
    const res = await api.put("/chat/group/leave", { chatId });
    return res.data;
  } catch (error) {
    console.error("Failed to leave group chat API:", error);
    throw error;
  }
};