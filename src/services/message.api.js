import api from "./api";

// GET messages of a chat with cursor pagination
export const getMessages = async (chatId, cursor = null) => {
  // Construct URL dynamically based on whether a cursor exists
  const url = cursor 
    ? `/message/${chatId}?cursor=${encodeURIComponent(cursor)}` 
    : `/message/${chatId}`;
    
  const res = await api.get(url);
  return res.data;
};

// Send a text message
export const sendMessage = async ({ chatId, content, replyTo }) => {
  const res = await api.post(`/message`, {
    chatId,
    content,
    replyTo // 🔥 NEW: Pass reply ID
  });
  return res.data;
};

// Send media (image/video/file)
export const sendMedia = async (chatId, file, replyTo) => {
  const formData = new FormData();
  formData.append("chatId", chatId);
  formData.append("file", file);
  if (replyTo) formData.append("replyTo", replyTo); // 🔥 NEW: Pass reply ID

  const { data } = await api.post("/message/media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

// MARK messages as read

export const markChatAsRead = async (chatId) => {
  try {
    // Calling the backend controller you already built
    const { data } = await api.put("/message/read", { chatId });
    return data;
  } catch (error) {
    console.error("Error marking messages as read", error);
  }
};

// React to a message with an emoji
export const reactToMessage = async (messageId, emoji) => {
  // 🛡️ ARCHITECTURAL FIX: Changed api.post to api.put to match Express router
  const res = await api.put(`/message/react`, {
    messageId,
    emoji
  });
  return res.data;
};

/// Delete a message (only for sender or admin)
export const deleteMessage = async (messageId) => {
  // 🛡️ ARCHITECTURAL FIX: Pass the messageId directly into the URL string
  const res = await api.delete(`/message/${messageId}`);
  return res.data;
};

// Search messages in a chat
export const fetchMessageContext = async (chatId, messageId) => {
  const res = await api.get(`/message/${chatId}/context/${messageId}`);
  return res.data;
};

// =====================================
// SEARCH MESSAGES (CHAT-LEVEL)
// =====================================
export const searchChatMessages = async (chatId, query) => {
  // Assuming your Axios instance is imported as 'api' (e.g., import api from './axios.config')
  const res = await api.get(`/message/search/${chatId}?query=${encodeURIComponent(query)}`);
  return res.data; 
};