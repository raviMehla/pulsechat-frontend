import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";

// Layouts & Security
import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Pages (🛡️ Lazy Loaded Chunks)
const ChatView = lazy(() => import("./pages/ChatView"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register")); 
const Welcome = lazy(() => import("./pages/Welcome"));   
const Landing = lazy(() => import("./pages/Landing")); 
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

// Socket Integration
import { socket, disconnectSocket } from "./services/socket"; 

function App() {
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // 🛡️ Cross-Tab Authentication Sync & Custom 401 Interceptor Listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" && !e.newValue) {
        console.warn("🔐 Auth token cleared in another tab. Logging out...");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
        disconnectSocket();
        navigate("/login", { replace: true });
      }
    };

    const handleAuthExpired = () => {
      console.warn("🔒 Session expired. Redirecting to login...");
      navigate("/login", { replace: true });
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth_expired", handleAuthExpired);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth_expired", handleAuthExpired);
    };
  }, [navigate]);

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
    <Suspense fallback={
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-accent gap-4 font-semibold">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm tracking-wide">Loading PulseChat...</span>
      </div>
    }>
      <Routes>
      {/* 🛡️ Public Routes */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

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
    </Suspense>
    </> 
  );
}

export default App;