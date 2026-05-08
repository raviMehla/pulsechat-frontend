import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://pulsechat-backend-xlri.onrender.com";

// ==========================================
// 1️⃣ NATIVE SINGLETON INITIALIZATION
// ==========================================
// By using autoConnect: false, we guarantee only ONE socket instance 
// ever exists in memory, preventing race conditions and zombie connections.
export const socket = io(SOCKET_URL, {
  autoConnect: false, 
  transports: ["polling", "websocket"], 
  reconnection: true,                   // 🔥 Enforce connection resilience for Render
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,              // Increased to 2s to prevent overwhelming a waking server
  reconnectionDelayMax: 10000,
});

// ==========================================
// 2️⃣ GLOBAL EVENT LISTENERS
// ==========================================
// We attach this globally to the singleton so it fires regardless 
// of which component the user is currently viewing.
socket.on("message_received", (msg) => {
  const currentUserId = localStorage.getItem("userId");
  
  // Prevent sending delivery receipts for our own messages
  if (String(msg.sender?._id || msg.sender) !== String(currentUserId)) {
    const chatId = msg.chat?._id || msg.chat;
    
    // Emit the true device-level delivery receipt
    socket.emit("message_delivered", { 
      messageId: msg._id, 
      chatId: chatId 
    });
  }
});

// ==========================================
// 3️⃣ ACCESSOR & CLEANUP METHODS
// ==========================================
export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};