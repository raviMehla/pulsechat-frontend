import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ChatList from "../../pages/ChatList";
import Sidebar from "./Sidebar"; 
import { usePushNotifications } from "../../hooks/usePushNotifications";

function AppLayout() {
  const currentUserId = localStorage.getItem("userId");
  const location = useLocation();
  
  usePushNotifications(currentUserId);

  const isRouteActive = location.pathname !== "/";

  return (
    // 🛡️ ARCHITECTURAL UPGRADE: h-[100dvh] fixes the mobile browser URL bar bug!
    <div className="h-[100dvh] w-full flex flex-col-reverse md:flex-row bg-background text-textPrimary overflow-hidden">
      
      {/* 1. Global Navigation Rail */}
      <Sidebar />
      
      {/* 2. Middle Panel (Chat List) */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r border-borderSubtle bg-surface flex flex-col z-10 shadow-lg ${
        isRouteActive ? "hidden md:flex" : "flex"
      } h-[calc(100dvh-60px)] md:h-full`}>
        <ChatList />
      </div>

      {/* 3. Right Main Content Area (Outlet) */}
      <main className={`flex-grow md:flex-grow-0 md:flex-1 flex flex-col min-w-0 h-[calc(100dvh-60px)] md:h-full relative bg-background ${
        !isRouteActive ? "hidden md:flex" : "flex"
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full w-full relative"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}

export default AppLayout;