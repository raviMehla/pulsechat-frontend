import { Outlet, useLocation } from "react-router-dom";
import ChatList from "../../pages/ChatList";
import Sidebar from "./Sidebar"; // 🛡️ ARCHITECTURAL UPGRADE
import { usePushNotifications } from "../../hooks/usePushNotifications";

function AppLayout() {
  const currentUserId = localStorage.getItem("userId");
  const location = useLocation();
  
  usePushNotifications(currentUserId);

  // Determine if a specific view is active. Root "/" means user is viewing the ChatList.
  const isRouteActive = location.pathname !== "/";

  return (
    // 🛡️ Changed to flex-col-reverse on mobile (Sidebar at bottom), flex-row on desktop
    <div className="h-screen w-full flex flex-col-reverse md:flex-row bg-background text-textPrimary overflow-hidden">
      
      {/* 1. Global Navigation Rail */}
      <Sidebar />
      
      {/* 2. Middle Panel (Chat List) */}
      {/* Hidden on mobile if viewing a specific chat/page. Always visible on desktop. */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r border-borderSubtle bg-surface flex-col z-10 shadow-lg ${
        isRouteActive ? "hidden md:flex" : "flex"
      } h-full`}>
        <ChatList />
      </div>

      {/* 3. Right Main Content Area (Outlet) */}
      {/* Hidden on mobile if viewing the Chat List. Always visible on desktop. */}
      <main className={`flex-1 flex-col min-w-0 h-full relative bg-background ${
        !isRouteActive ? "hidden md:flex" : "flex"
      }`}>
        <Outlet />
      </main>

    </div>
  );
}

export default AppLayout;