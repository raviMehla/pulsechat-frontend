import axios from "axios";
import toast from "react-hot-toast"; 
import { getSocket } from "./socket"; // Assuming you export your socket instance from here

const api = axios.create({
  // Dynamically points to Render in production, or relative path locally
  baseURL: import.meta.env.VITE_API_URL || "/api", 
});

// ==========================================
// REQUEST INTERCEPTOR: Attach Auth Token
// ==========================================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// RESPONSE INTERCEPTOR: Global Security Handling
// ==========================================
api.interceptors.response.use(
  (response) => response, // Let successful responses pass through
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    switch (status) {
      case 429: // 🛡️ Rate Limit Hit (Spam Protection)
        toast.error(message || "You are doing that too fast. Please slow down.");
        break;
      
      case 413: // 🛡️ File Too Large (Multer Memory Protection)
      case 415: // 🛡️ Unsupported Media Type (MIME Type Blocked)
        toast.error(message || "File upload rejected by security policy.");
        break;

      case 401: // 🛡️ Unauthorized (JWT Expired/Tampered)
        toast.error("Session expired or invalid. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        
        // 🚨 CRITICAL: Sever the WebSocket connection immediately to prevent ghost sessions
        const socket = getSocket();
        if (socket) socket.disconnect(); 
        
        // Redirect to login (or use your router's navigate function if inside a React context)
        window.location.href = "/login"; 
        break;

      case 403: // 🛡️ Forbidden (e.g., attempting to message a group you were kicked from)
        toast.error(message || "You do not have permission to do this.");
        break;
        
      default:
  if (status >= 500) {
     // 🛡️ ARCHITECTURAL FIX: Defensive check to prevent "reading '0' of undefined"
     const errorMessage = error.response?.data?.message || "Internal Server Error";
     console.error("Critical Server Failure:", errorMessage);
     toast.error("Server is currently unavailable. Please try again later.");
  }
  break;
    }

    // Always reject the promise so the local component knows the request failed
    return Promise.reject(error);
  }
);

export default api;