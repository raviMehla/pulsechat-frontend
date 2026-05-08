import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import {Toaster} from "react-hot-toast";

// Layouts & Security
import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Pages
import ChatView from "./pages/ChatView";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register"; // 🟢 Prepared for auth expansion
import Welcome from "./pages/Welcome";   // 🟢 Default platform entry screen

// Socket Integration
import { socket, disconnectSocket } from "./services/socket"; 

function App() {
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    // 1. Only establish the WebSocket connection if the user is securely authenticated.
    if (currentUserId && token) {
      
      // Inject the current token right before connecting
      socket.auth = { token }; 
      socket.connect();

      // Setup connection loggers
      const onConnect = () => console.log("🟢 Global Socket connected:", socket.id);
      const onDisconnect = (reason) => console.warn("🔴 Global Socket disconnected:", reason);

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);

      // 2. Cleanup Function: Destroys the socket connection when the App unmounts
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        disconnectSocket();
      };
    }
  }, [currentUserId, token]); // The connection relies on these credentials existing

  return (
    <>
    <Toaster position="top-right" reverseOrder={false} />
    <Routes>
      {/* Public Routes */}
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