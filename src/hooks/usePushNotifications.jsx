import { useEffect } from "react";
// 1. Import your initialized instance from your local config
import { messaging } from "../config/firebase.js"; 
// 2. Import the actual SDK functions directly from the firebase package
import { getToken, onMessage } from "firebase/messaging"; 
import { registerFcmToken } from "../services/user.api.js";
import toast from "react-hot-toast"; // Used for proactive UI feedback when app is open

export const usePushNotifications = (currentUserId) => {
  useEffect(() => {
    // Only attempt registration if the user is logged in and messaging is supported by the browser
    if (!currentUserId || !messaging) return;

    const requestPermissionAndRegister = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === "granted") {
          // 🚨 ARCHITECTURAL FIX: Use environment variables for VAPID key. Never hardcode secrets.
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          
          if (!vapidKey) {
            console.error("VITE_FIREBASE_VAPID_KEY is missing in your .env file.");
            return;
          }

          const currentToken = await getToken(messaging, { vapidKey });
          
          if (currentToken) {
            // Send token to our Node.js backend to associate with the user document
            await registerFcmToken(currentToken);
            console.log("FCM Token registered successfully.");
          } else {
            console.warn("No registration token available. Request permission to generate one.");
          }
        } else {
          console.warn("Notification permission denied by user.");
        }
      } catch (error) {
        console.error("An error occurred while retrieving FCM token: ", error);
      }
    };

    requestPermissionAndRegister();

    // ==========================================
    // FOREGROUND MESSAGE HANDLER
    // ==========================================
    // When the user has the app open, the OS won't show a native push banner. 
    // We catch the message payload here and trigger an in-app toast notification.
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Received foreground message:", payload);
      
      const title = payload.notification?.title || "New Message";
      const body = payload.notification?.body || "You received a new message.";
      
      toast(
        (t) => (
          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => toast.dismiss(t.id)}>
            <span className="font-bold text-sm text-gray-900">{title}</span>
            <span className="text-sm text-gray-600 line-clamp-2">{body}</span>
          </div>
        ),
        { 
          icon: '💬', 
          duration: 4000,
          position: 'top-right'
        }
      );
    });

    // Cleanup listener on unmount to prevent memory leaks and duplicate toasts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId]);
};