import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useRegisterSW } from "virtual:pwa-register/react";
import localforage from "localforage";

// Layouts & Security
import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicRoute from "./components/common/PublicRoute";
import NetworkStatus from "./components/common/NetworkStatus";

// 🛡️ Lazy Loading Retry Wrapper to handle Chunk Load Errors on new deployments
const lazyWithRetry = (componentImport) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Dynamic import failed. Chunk loading mismatch. Reloading app...", error);
      const hasReloaded = window.sessionStorage.getItem("lazy-retry-reloaded");
      if (!hasReloaded) {
        window.sessionStorage.setItem("lazy-retry-reloaded", "true");
        window.location.reload();
        return new Promise(() => {}); // Keep loader displayed during reload
      }
      throw error;
    }
  });
};

// Pages (🛡️ Lazy Loaded Chunks)
const ChatView = lazyWithRetry(() => import("./pages/ChatView"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register")); 
const Welcome = lazyWithRetry(() => import("./pages/Welcome"));   
const Landing = lazyWithRetry(() => import("./pages/Landing")); 
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));

// Socket Integration
import { socket, disconnectSocket } from "./services/socket"; 

function App() {
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // 🛡️ PWA Update Notification Listener
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("PWA Service Worker registered:", r);
    },
    onRegisterError(error) {
      console.error("PWA SW registration failed:", error);
    }
  });

  useEffect(() => {
    if (needRefresh) {
      toast((t) => (
        <div className="flex flex-col gap-2 p-1 text-sm font-medium">
          <p className="text-toastTitle font-semibold">New version available!</p>
          <p className="text-xs text-textMuted">Reload the app to apply the latest security updates.</p>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => {
                updateServiceWorker(true);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-accent text-white rounded-md text-xs font-semibold hover:bg-accentHover transition-colors cursor-pointer"
            >
              Update Now
            </button>
            <button
              onClick={() => {
                setNeedRefresh(false);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-background border border-borderSubtle text-textPrimary rounded-md text-xs font-semibold hover:bg-surface transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      ), { 
        duration: Infinity,
        position: "top-right",
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  // 🛡️ Service Worker Deep Linking & Navigation Listener
  useEffect(() => {
    // Check query params on cold start
    const params = new URLSearchParams(window.location.search);
    const qChatId = params.get("chatId");
    if (qChatId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate(`/chat/${qChatId}`);
    }

    // Listen for background messages from service worker
    const handleSWMessage = (e) => {
      if (e.data && e.data.type === "NAVIGATE" && e.data.chatId) {
        console.log("🚀 Deep linking from SW message to chat:", e.data.chatId);
        navigate(`/chat/${e.data.chatId}`);
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      }
    };
  }, [navigate]);

  // 🛡️ Clear chunk retry reload state once the application successfully mounts
  useEffect(() => {
    window.sessionStorage.removeItem("lazy-retry-reloaded");
  }, []);

  // 🛡️ Cross-Tab Authentication Sync & Custom 401 Interceptor Listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" && !e.newValue) {
        console.warn("🔐 Auth token cleared in another tab. Logging out...");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
        localforage.clear().catch(err => console.error("Failed to clear localforage:", err));
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

      const onOfflineMissedCalls = (missedCalls) => {
        console.log("☎️ Received offline missed calls:", missedCalls);
        missedCalls.forEach(call => {
          const callTime = new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const callDate = new Date(call.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
          toast((t) => (
            <div className="flex flex-col gap-1 p-1">
              <p className="text-sm font-bold text-textPrimary">Missed Call</p>
              <p className="text-xs text-textSecondary">
                You missed a {call.type} call from <span className="font-semibold text-accent">{call.callerName}</span> at {callTime} on {callDate}.
              </p>
              <div className="flex gap-2 justify-end mt-1">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-2.5 py-1 bg-surface border border-borderSubtle hover:bg-background rounded-md text-[11px] font-semibold text-textMuted transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), {
            duration: 8000,
            icon: call.type === 'video' ? '📹' : '📞',
            style: {
              background: '#131318',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
            }
          });
        });
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("offline_missed_calls", onOfflineMissedCalls);

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
        socket.off("offline_missed_calls", onOfflineMissedCalls);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        disconnectSocket();
      };
    }
  }, [currentUserId, token]); 

  return (
    <>
    <NetworkStatus />
    <Toaster position="top-right" reverseOrder={false} />
    <Suspense fallback={
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-accent gap-4 font-semibold">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm tracking-wide">Loading PulseChat...</span>
      </div>
    }>
      <Routes>
      {/* 🛡️ Public Routes */}
      <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />


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