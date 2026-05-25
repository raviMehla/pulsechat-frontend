import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -50, x: "-50%", opacity: 0 }}
          animate={{ y: 20, x: "-50%", opacity: 1 }}
          exit={{ y: -50, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed top-0 left-1/2 z-[250] pointer-events-none"
        >
          <div className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md border ${
            isOnline 
              ? "bg-success/10 text-success border-success/30" 
              : "bg-danger/10 text-danger border-danger/30"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-danger animate-pulse"}`}></span>
            <span>{isOnline ? "Back online" : "No internet connection"}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NetworkStatus;
