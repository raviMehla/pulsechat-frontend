import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

// Layouts & Security
import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Pages
import ChatView from "./pages/ChatView";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register"; 
import Welcome from "./pages/Welcome";   
import Landing from "./pages/Landing"; // 🛡️ NEW: The Front Door

// Socket Integration
import { socket, disconnectSocket } from "./services/socket"; 

function App() {
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    // 1. Only establish the WebSocket connection if the user is securely authenticated.
    if (currentUserId && token) {
      
      socket.auth = { token }; 
      socket.connect();

      const onConnect = () => console.log("🟢 Global Socket connected:", socket.id);
      const onDisconnect = (reason) => console.warn("🔴 Global Socket disconnected:", reason);

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);

      // 🛡️ ARCHITECTURAL UPGRADE: The Mobile Foreground Resiliency Engine
      // Forces the socket to instantly reconnect the millisecond the user unlocks their phone
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          console.log("📱 App returned to foreground. Checking socket health...");
          if (socket.disconnected) {
            console.log("⚡ Socket was dead. Forcing instant reconnection...");
            socket.connect();
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // 2. Cleanup Function
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        disconnectSocket();
      };
    }
  }, [currentUserId, token]); 

  return (
    <>
    <Toaster position="top-right" reverseOrder={false} />
    <Routes>
      {/* 🛡️ Public Routes */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated Application Boundary */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default route inside the app (Empty state when no chat is selected) */}
        <Route index element={<Welcome />} />

        {/* Core Features */}
        <Route path="chat/:id" element={<ChatView />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Global Fallback: Catch-all 404 redirects safely to the platform root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </> 
  );
}

export default App;