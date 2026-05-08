import { createPortal } from "react-dom";
import { Avatar } from "../ui/Avatar";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   SVG ICON PRIMITIVES 
───────────────────────────────────────────── */
const PhoneOff = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" />
    <path d="M14.59 10a4 4 0 0 1-4-4" />
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M3.07 3.07A19.83 19.83 0 0 0 1 12a19.79 19.79 0 0 0 3.07 8.63" />
  </svg>
);

const PhoneIncoming = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 2 16 8 22 8" />
    <line x1="23" y1="1" x2="16" y2="8" />
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MicOff = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VolumeOff = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

/* ─────────────────────────────────────────────
   ANIMATED WAVEFORM
───────────────────────────────────────────── */
const SoundWave = () => {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4, 0.6, 0.9, 0.6, 0.4];
  return (
    <div className="flex items-center gap-[3px] h-7">
      {bars.map((amp, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-success opacity-85"
          animate={{ scaleY: [0.3 * amp, 1.0 * amp, 0.3 * amp] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
          style={{ height: "100%", transformOrigin: "center" }}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   PULSE RINGS
───────────────────────────────────────────── */
const PulseRings = ({ color }) => (
  <>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full"
        style={{ border: `2px solid ${color}` }}
        animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: i * 0.6 }}
      />
    ))}
  </>
);

/* ─────────────────────────────────────────────
   CALL TIMER HOOK
───────────────────────────────────────────── */
function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/* ─────────────────────────────────────────────
   ROUND ACTION BUTTON
───────────────────────────────────────────── */
const ActionBtn = ({ onClick, color, hoverColor, label, children, pulse = false, large = false }) => (
  <div className="flex flex-col items-center gap-2">
    <motion.button
      whileHover={{ scale: 1.1, backgroundColor: hoverColor }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      className={`
        ${large ? "w-[68px] h-[68px]" : "w-[60px] h-[60px]"} 
        rounded-full flex items-center justify-center shadow-lg focus:outline-none
        ${pulse ? "animate-bounce" : ""}
      `}
      style={{
        backgroundColor: color,
        boxShadow: `0 8px 32px ${color}55`,
      }}
    >
      {children}
    </motion.button>
    <span className="text-xs font-medium text-textMuted">{label}</span>
  </div>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
function CallOverlay({
  isCalling,
  incomingCall,
  chatName,
  chatImage,
  callStatus,
  remoteStream,
  isMuted,            // 🛡️ RECEIVED FROM CHATVIEW
  onToggleMute,       // 🛡️ RECEIVED FROM CHATVIEW
  onAccept,
  onDecline,
  onCancel,
  onEndCall,
}) {
  const audioRef = useRef(null);
  const [speakerOff, setSpeakerOff] = useState(false);
  const timer = useCallTimer(callStatus === "connected");

  /* Attach remote stream */
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* Speaker Off/On (Mutes the incoming HTML audio element on Web) */
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = speakerOff;
  }, [speakerOff]);

  const isActive = isCalling || incomingCall || callStatus !== "idle";
  if (!isActive) return null;

  const isConnected = callStatus === "connected";
  const isIncoming = !!incomingCall;
  
  // 🛡️ THE CALLER ID FIX: Displays the name correctly whether we are receiving or dialing
  const callerLabel = isIncoming ? incomingCall.callerName : chatName;

  /* ── Status pill copy ── */
  const statusText = isConnected
    ? timer
    : callStatus === "connecting"
    ? "Connecting…"
    : isIncoming
    ? "Incoming call"
    : "Calling…";

  /* ── Pulse ring colour ── */
  const ringColor = isIncoming ? "var(--status-success)" : "var(--accent-primary)";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 40%, #1a1428 0%, #0B0B0F 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Ambient glow blob */}
      <div
        className="absolute pointer-events-none transition-colors duration-1000"
        style={{
          width: 420, height: 420, borderRadius: "50%",
          top: "50%", left: "50%", transform: "translate(-50%, -60%)",
          background: isConnected
            ? "radial-gradient(circle, #5DD6B033 0%, transparent 70%)"
            : isIncoming
            ? "radial-gradient(circle, #5DD6B020 0%, transparent 70%)"
            : "radial-gradient(circle, #7C6EF720 0%, transparent 70%)",
        }}
      />

      <audio ref={audioRef} autoPlay className="hidden" />

      {/* ── Glass card ── */}
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative flex flex-col items-center text-center shadow-2xl"
        style={{
          background: "rgba(19,19,24,0.75)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 32,
          padding: "52px 64px 44px",
          backdropFilter: "blur(40px)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
          minWidth: 320,
        }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 transition-colors duration-700"
          style={{
            width: 48, height: 3, borderRadius: 99,
            background: isConnected || isIncoming ? "var(--status-success)" : "var(--accent-primary)",
            top: -1.5,
          }}
        />

        {/* ── Avatar ring stack ── */}
        <div className="relative flex items-center justify-center mb-8" style={{ width: 128, height: 128 }}>
          {!isConnected && <PulseRings color={ringColor} />}

          <div
            className="absolute inset-0 rounded-full transition-colors duration-700"
            style={{
              border: `2px solid ${isConnected ? "var(--status-success)" : ringColor}`,
              opacity: 0.35,
            }}
          />

          <Avatar
            src={chatImage}
            alt={callerLabel}
            size="xl"
            className="relative z-10 transition-shadow duration-700"
            style={{
              width: 112, height: 112, borderRadius: "50%", objectFit: "cover",
              boxShadow: isConnected
                ? "0 0 0 3px var(--status-success), 0 12px 40px rgba(93,214,176,0.3)"
                : `0 0 0 3px ${ringColor}88, 0 12px 40px rgba(124,110,247,0.25)`,
            }}
          />

          <AnimatePresence>
            {isConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute bottom-1 right-1 z-20 rounded-full bg-success shadow-[0_0_8px_var(--status-success)] border-[2.5px] border-surface"
                style={{ width: 16, height: 16 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Identity ── */}
        <h2 className="font-bold tracking-tight mb-1 text-textPrimary text-[26px] tracking-[-0.02em]">
          {callerLabel}
        </h2>

        {/* ── Status row ── */}
        <div className="flex items-center gap-2 mb-8 min-h-[28px]">
          {isConnected ? (
            <>
              <SoundWave />
              <span className="text-sm font-semibold tabular-nums text-success tracking-[0.04em]">
                {timer}
              </span>
            </>
          ) : (
            <motion.span
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className={`text-[11px] font-medium tracking-[0.06em] uppercase ${isIncoming ? "text-success" : "text-textMuted"}`}
            >
              {statusText}
            </motion.span>
          )}
        </div>

        {/* ── Secondary controls (mute/speaker) when connected ── */}
        {isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 mb-7"
          >
            {[
              {
                label: isMuted ? "Unmute" : "Mute",
                active: isMuted,
                icon: <MicOff size={18} />,
                onClick: onToggleMute, // 🛡️ Calls the physical hardware toggle in useWebRTC.js
              },
              {
                label: speakerOff ? "Speaker Off" : "Speaker On",
                active: speakerOff,
                icon: <VolumeOff size={18} />,
                onClick: () => setSpeakerOff((s) => !s),
              },
            ].map(({ label, active, icon, onClick }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                title={label}
                className="flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200"
                  style={{
                    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {icon}
                </div>
                <span className="text-[10px] text-textMuted tracking-[0.04em]">
                  {label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── Primary call actions ── */}
        <div className="flex gap-6 items-end">
          {isConnected ? (
            <ActionBtn
              onClick={onEndCall}
              color="var(--status-danger)"
              hoverColor="#d94f4f"
              label="End Call"
              large
            >
              <PhoneOff size={26} className="text-white" />
            </ActionBtn>
          ) : isIncoming ? (
            <>
              <ActionBtn
                onClick={onDecline}
                color="var(--status-danger)"
                hoverColor="#d94f4f"
                label="Decline"
              >
                <PhoneOff size={22} className="text-white" />
              </ActionBtn>
              <ActionBtn
                onClick={onAccept}
                color="var(--status-success)"
                hoverColor="#3eb896"
                label="Accept"
                pulse
              >
                <PhoneIncoming size={22} className="text-white" />
              </ActionBtn>
            </>
          ) : (
            <ActionBtn
              onClick={onCancel}
              color="var(--status-danger)"
              hoverColor="#d94f4f"
              label="Cancel"
            >
              <PhoneOff size={22} className="text-white" />
            </ActionBtn>
          )}
        </div>

        {/* ── Connecting dots (non-connected state only) ── */}
        {!isConnected && (
          <div className="flex gap-1.5 mt-7">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-textMuted"
                animate={{ y: [0, -5, 0], opacity: [0.35, 0.9, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default CallOverlay;