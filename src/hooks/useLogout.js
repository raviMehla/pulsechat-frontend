// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";
import { disconnectSocket } from "../services/socket";

export const useLogout = () => {
  const navigate = useNavigate();

  const logout = () => {
    // 1. Purge the authentication payload from the browser
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    
    // Optional: Clear any other cached data if you have it
    // localStorage.removeItem("userProfile");

    // 2. 🚨 CRITICAL: Sever the real-time connection immediately
    // This prevents "ghost" sessions if a different user logs in on this device.
    disconnectSocket();

    // 3. Force route back to login, replacing the history stack
    // so they cannot hit the "Back" button to re-enter the app.
    navigate("/login", { replace: true });
  };

  return logout;
};