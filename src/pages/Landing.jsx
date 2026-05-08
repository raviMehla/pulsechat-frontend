import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center relative overflow-hidden text-textPrimary px-6">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.0, 0.0, 0.2, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg"
      >
        {/* Logo */}
        <div className="w-20 h-20 bg-accent text-white rounded-2xl flex items-center justify-center font-bold text-4xl shadow-2xl mb-8 border border-white/10">
          P
        </div>

        {/* Hero Copy */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-textPrimary">
          PulseChat
        </h1>
        <p className="text-lg text-textMuted mb-12 leading-relaxed">
          Secure, real-time messaging and high-fidelity calling. Experience the Noir Glass standard.
        </p>

        {/* Actions */}
        <div className="w-full space-y-4 sm:space-y-0 sm:flex sm:gap-4 justify-center">
          <button 
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accentHover text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-[0_8px_32px_rgba(124,110,247,0.3)]"
          >
            Create Account
          </button>
          <button 
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-8 py-4 bg-surface border border-borderSubtle hover:border-textMuted text-textPrimary rounded-xl font-semibold transition-all hover:bg-background"
          >
            Log In
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-8 text-xs text-textMuted font-medium tracking-widest uppercase">
        End-to-End Encrypted
      </div>
    </div>
  );
}

export default Landing;