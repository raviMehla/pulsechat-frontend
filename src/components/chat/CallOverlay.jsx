/* eslint-disable react-hooks/set-state-in-effect */
import { createPortal } from "react-dom";
import { Avatar } from "../ui/Avatar";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FocusLock from "react-focus-lock";

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

const MicOn = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
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

const VideoOn = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const VideoOff = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10l-3.34-2.34" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const FlipCamera = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ChevronUp = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDown = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MaximizeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ─────────────────────────────────────────────
   ANIMATED WAVEFORM
───────────────────────────────────────────── */
const SoundWave = ({ small = false }) => {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4, 0.6, 0.9, 0.6, 0.4];
  return (
    <div className={`flex items-center gap-[3px] ${small ? "h-4" : "h-7"}`}>
      {bars.map((amp, i) => (
        <motion.div
          key={i}
          className={`${small ? "w-[2px]" : "w-[3px]"} rounded-full bg-success opacity-85`}
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
   MINIMIZED AUDIO PILL
───────────────────────────────────────────── */
const MinimizedAudioPill = ({ callerLabel, chatImage, incomingCall, timer, isMuted, onToggleMute, onEndCall, onExpand }) => (
  createPortal(
    <motion.div
      drag
      dragConstraints={{ 
        left: -window.innerWidth / 2 + 140, 
        right: window.innerWidth / 2 - 140, 
        top: -window.innerHeight + 80, 
        bottom: 20 
      }}
      dragElastic={0}
      dragMomentum={false}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed bottom-6 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing"
      style={{
        background: "rgba(19,19,28,0.92)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(93,214,176,0.25)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(93,214,176,0.1)",
        minWidth: 280,
        left: "calc(50% - 140px)"
      }}
    >
      {/* Avatar with green pulse dot */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={incomingCall ? incomingCall.callerAvatar : chatImage}
          alt={callerLabel}
          size="sm"
          style={{ width: 36, height: 36, borderRadius: "50%" }}
        />
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-[rgba(19,19,28,0.92)]"
          style={{ boxShadow: "0 0 6px var(--status-success)" }}
        />
      </div>

      {/* Name + waveform + timer */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-white truncate leading-tight">{callerLabel}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <SoundWave small />
          <span className="text-[10px] font-mono text-success tabular-nums">{timer}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Mute toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: isMuted ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.08)",
            border: isMuted ? "1px solid rgba(255,100,100,0.3)" : "1px solid rgba(255,255,255,0.12)",
            color: isMuted ? "#ff6464" : "rgba(255,255,255,0.7)",
          }}
        >
          {isMuted ? <MicOff size={14} /> : <MicOn size={14} />}
        </motion.button>

        {/* End call */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onEndCall}
          title="End Call"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "var(--status-danger)",
            boxShadow: "0 4px 14px rgba(239,68,68,0.4)",
          }}
        >
          <PhoneOff size={14} className="text-white" />
        </motion.button>

        {/* Expand / Maximize */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onExpand}
          title="Expand Call"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <ChevronUp size={14} />
        </motion.button>
      </div>
    </motion.div>,
    document.body
  )
);

/* ─────────────────────────────────────────────
   MINIMIZED VIDEO PIP CARD
───────────────────────────────────────────── */
const MinimizedVideoPip = ({ callerLabel, chatImage, incomingCall, timer, isMuted, isVideoMuted, onToggleMute, onEndCall, onExpand, setRemoteVideo }) => (
  createPortal(
    <motion.div
      drag
      dragConstraints={{
        left: -window.innerWidth + 244,
        right: 0,
        top: -window.innerHeight + 184,
        bottom: 0
      }}
      dragElastic={0}
      dragMomentum={false}
      initial={{ scale: 0.8, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed bottom-6 right-6 z-[200] rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      style={{
        width: 220,
        height: 160,
        border: "1.5px solid rgba(93,214,176,0.3)",
        boxShadow: "0 12px 50px rgba(0,0,0,0.75), 0 0 0 1px rgba(93,214,176,0.1)",
        background: "#0b0b0f",
      }}
    >
      {/* Remote video feed or avatar fallback */}
      <video
        ref={setRemoteVideo}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient overlay at top and bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* Top: name + timer */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-white leading-tight truncate max-w-[100px]">{callerLabel}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <SoundWave small />
            <span className="text-[9px] font-mono text-success tabular-nums">{timer}</span>
          </div>
        </div>
        {/* Expand button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.94 }}
          onClick={onExpand}
          title="Expand Call"
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
          }}
        >
          <MaximizeIcon size={11} />
        </motion.button>
      </div>

      {/* Bottom: mute + end */}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-2.5">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: isMuted ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: isMuted ? "#ff6464" : "white",
          }}
        >
          {isMuted ? <MicOff size={13} /> : <MicOn size={13} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onEndCall}
          title="End Call"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "var(--status-danger)",
            boxShadow: "0 4px 14px rgba(239,68,68,0.5)",
          }}
        >
          <PhoneOff size={15} className="text-white" />
        </motion.button>
      </div>

      {/* Connected indicator dot */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success"
        style={{ boxShadow: "0 0 6px var(--status-success)" }}
      />
    </motion.div>,
    document.body
  )
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
  localStream,
  remoteStream,
  callType,
  isMuted,            // 🛡️ RECEIVED FROM CHATVIEW
  isVideoMuted,       // 🛡️ RECEIVED FROM CHATVIEW
  facingMode,         // 🛡️ RECEIVED FROM CHATVIEW
  onToggleMute,       // 🛡️ RECEIVED FROM CHATVIEW
  onToggleVideoMute,  // 🛡️ RECEIVED FROM CHATVIEW
  onSwitchCamera,     // 🛡️ FOR CAMERA FLIPPING
  onAccept,
  onDecline,
  onCancel,
  onEndCall,
  myAvatar,
}) {
  const audioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [speakerOff, setSpeakerOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const timer = useCallTimer(callStatus === "connected");

  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isFlapping, setIsFlapping] = useState(false);

  useEffect(() => {
    if (callType === "video" && callStatus === "connected") {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((device) => device.kind === "videoinput");
          setHasMultipleCameras(videoDevices.length >= 2);
        })
        .catch((err) => {
          console.warn("Failed to check for multiple cameras:", err);
        });
    }
  }, [callType, callStatus]);

  const handleFlip = async () => {
    setIsFlapping(true);
    if (onSwitchCamera) {
      await onSwitchCamera();
    }
    setTimeout(() => setIsFlapping(false), 600);
  };

  const setAudio = useCallback((el) => {
    audioRef.current = el;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.muted = speakerOff;
      // 🛡️ Programmatically trigger play to catch and handle autoplay policy blocks
      el.play().catch((err) => {
        console.warn("Autoplay blocked remote WebRTC audio stream playback:", err);
      });
    }
  }, [remoteStream, speakerOff]);

  const setLocalVideo = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
    }
  }, [localStream]);

  const setRemoteVideo = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  /* Speaker Off/On (Mutes the incoming HTML audio/video elements on Web) */
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = speakerOff;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = speakerOff;
  }, [speakerOff]);

  // Reset minimize when call ends
  useEffect(() => {
    if (callStatus === "idle") {
      setIsMinimized(false);
    }
  }, [callStatus]);

  // 🛡️ Autoplay Silent Ringtone & Audio Fallback using Web Audio API Synthesis
  useEffect(() => {
    const isConnected = callStatus === "connected";
    const isIncoming = !!incomingCall;
    const isRinging = isIncoming && !isConnected;

    if (!isRinging) return;

    let audioCtx = null;
    let ringInterval = null;
    let titleInterval = null;
    const originalTitle = document.title;

    const startFlashingTitle = () => {
      if (titleInterval) return;
      let toggle = false;
      titleInterval = setInterval(() => {
        document.title = toggle ? `📞 INCOMING CALL FROM ${chatName.toUpperCase()}...` : "PulseChat";
        toggle = !toggle;
      }, 500);
    };

    const stopFlashingTitle = () => {
      if (titleInterval) {
        clearInterval(titleInterval);
        titleInterval = null;
      }
      document.title = originalTitle;
    };

    const triggerNotification = () => {
      if (typeof window.Notification !== "undefined") {
        if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              showNotification();
            }
          });
        } else if (Notification.permission === "granted") {
          showNotification();
        }
      }
    };

    const showNotification = () => {
      try {
        const title = callType === "video" ? "Incoming Video Call" : "Incoming Voice Call";
        const options = {
          body: `${chatName} is calling you on PulseChat...`,
          tag: "pulsechat-call",
          renotify: true,
          requireInteraction: true,
        };
        const notification = new window.Notification(title, options);
        notification.onclick = () => {
          window.focus();
          onAccept && onAccept();
          notification.close();
        };
      } catch (err) {
        console.error("Failed to show push notification:", err);
      }
    };

    const playRingtoneBeep = () => {
      try {
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          audioCtx = new AudioContextClass();
        }
        
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        const playTone = (freq, startTime, duration) => {
          if (!audioCtx || audioCtx.state === "closed") return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
          gain.gain.setValueAtTime(0.15, startTime + duration - 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        // Dual-frequency US telephone ring style: 440Hz + 480Hz combined
        const now = audioCtx.currentTime;
        playTone(440, now, 0.8);
        playTone(480, now, 0.8);
        playTone(440, now + 1.0, 0.8);
        playTone(480, now + 1.0, 0.8);
      } catch (err) {
        console.error("Synthesizer audio error:", err);
      }
    };

    playRingtoneBeep();
    
    const blockCheckTimeout = setTimeout(() => {
      if (audioCtx && audioCtx.state === "suspended") {
        console.warn("🔔 Autoplay blocked! Activating flashing title and push notifications.");
        startFlashingTitle();
        triggerNotification();
      }
    }, 150);

    ringInterval = setInterval(playRingtoneBeep, 3500);

    const handleUnlockInteraction = () => {
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
          console.log("🔊 AudioContext successfully unlocked by user interaction!");
          stopFlashingTitle();
        });
      }
    };

    window.addEventListener("click", handleUnlockInteraction);
    window.addEventListener("touchstart", handleUnlockInteraction);

    return () => {
      clearTimeout(blockCheckTimeout);
      clearInterval(ringInterval);
      stopFlashingTitle();
      window.removeEventListener("click", handleUnlockInteraction);
      window.removeEventListener("touchstart", handleUnlockInteraction);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close();
      }
    };
  }, [incomingCall, callStatus, chatName, callType, onAccept]);

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
    ? (incomingCall.type === "video" ? "Incoming Video Call…" : "Incoming Call…")
    : (callType === "video" ? "Calling Video…" : "Calling…");

  /* ── Pulse ring colour ── */
  const ringColor = isIncoming ? "var(--status-success)" : "var(--accent-primary)";

  // ─────────────────────────────────────────────
  // MINIMIZED STATES — only when connected
  // ─────────────────────────────────────────────
  if (isMinimized && isConnected) {
    if (callType === "video") {
      return (
        <AnimatePresence>
          <MinimizedVideoPip
            callerLabel={callerLabel}
            chatImage={chatImage}
            incomingCall={incomingCall}
            timer={timer}
            isMuted={isMuted}
            isVideoMuted={isVideoMuted}
            onToggleMute={onToggleMute}
            onEndCall={onEndCall}
            onExpand={() => setIsMinimized(false)}
            setRemoteVideo={setRemoteVideo}
          />
        </AnimatePresence>
      );
    }
    // Audio minimized pill (audio element still needed)
    return (
      <AnimatePresence>
        <>
          <audio ref={setAudio} autoPlay className="hidden" />
          <MinimizedAudioPill
            callerLabel={callerLabel}
            chatImage={chatImage}
            incomingCall={incomingCall}
            timer={timer}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            onEndCall={onEndCall}
            onExpand={() => setIsMinimized(false)}
          />
        </>
      </AnimatePresence>
    );
  }

  // ─────────────────────────────────────────────
  // FULL VIDEO CALL UI (Connected)
  // ─────────────────────────────────────────────
  if (callType === "video" && isConnected) {
    return createPortal(
      <FocusLock>
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col justify-between overflow-hidden"
        >
          {/* Remote Video Stream (Full Screen) */}
          <video
            ref={setRemoteVideo}
            autoPlay
            playsInline
            muted={speakerOff}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Ambient glow container if remote video is black/waiting */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div
              className="w-96 h-96 rounded-full opacity-20 filter blur-3xl bg-accent-primary"
              style={{ mixBlendMode: "screen" }}
            />
          </div>

          {/* Local Video Stream (Floating PIP) */}
          <div className="absolute top-6 right-6 w-32 h-44 md:w-40 md:h-56 rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-20 bg-zinc-900 flex items-center justify-center">
            <video
              ref={setLocalVideo}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
            {isVideoMuted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-2 p-3 text-center">
                <Avatar src={myAvatar} alt="Me" size="sm" />
                <span className="text-[10px] text-textMuted font-medium">Camera Off</span>
              </div>
            )}
          </div>

          {/* Top Info overlay */}
          <div className="relative z-10 w-full p-6 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Video Call
              </span>
            </div>
            <h2 className="text-white font-bold text-2xl tracking-tight drop-shadow-md mt-1">
              {callerLabel}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-semibold tabular-nums text-success drop-shadow-md tracking-[0.04em]">
                {timer}
              </span>
            </div>
          </div>

          {/* Minimize button — top-left */}
          <div className="absolute top-5 left-6 z-30">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsMinimized(true)}
              title="Minimize Call"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/80 hover:text-white transition-colors"
              style={{
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <ChevronDown size={13} />
              Minimize
            </motion.button>
          </div>

          {/* Bottom Control Overlay */}
          <div className="relative z-10 w-full p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-6">
            {/* Secondary Controls (Mute Mic, Camera Toggle, Speaker Toggle) */}
            <div className="flex gap-6">
              {[
                {
                  label: isMuted ? "Unmute" : "Mute",
                  active: isMuted,
                  icon: <MicOff size={18} />,
                  onClick: onToggleMute,
                  show: true,
                },
                {
                  label: isVideoMuted ? "Camera On" : "Camera Off",
                  active: isVideoMuted,
                  icon: isVideoMuted ? <VideoOff size={18} /> : <VideoOn size={18} />,
                  onClick: onToggleVideoMute,
                  show: true,
                },
                {
                  label: "Flip Camera",
                  active: false,
                  icon: (
                    <motion.div
                      animate={{ rotate: isFlapping ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="flex items-center justify-center"
                    >
                      <FlipCamera size={18} />
                    </motion.div>
                  ),
                  onClick: handleFlip,
                  show: hasMultipleCameras,
                },
                {
                  label: speakerOff ? "Speaker Off" : "Speaker On",
                  active: speakerOff,
                  icon: <VolumeOff size={18} />,
                  onClick: () => setSpeakerOff((s) => !s),
                  show: true,
                },
              ].filter(btn => btn.show).map(({ label, active, icon, onClick }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClick}
                  title={label}
                  className="flex flex-col items-center gap-1.5 focus:outline-none"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200"
                    style={{
                      background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                    }}
                  >
                    {icon}
                  </div>
                  <span className="text-[10px] text-zinc-300 font-medium tracking-[0.04em]">
                    {label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* End Call Button */}
            <ActionBtn
              onClick={onEndCall}
              color="var(--status-danger)"
              hoverColor="#d94f4f"
              label="End Call"
              large
            >
              <PhoneOff size={26} className="text-white" />
            </ActionBtn>
          </div>
        </motion.div>
      </FocusLock>,
      document.body
    );
  }

  // ─────────────────────────────────────────────
  // FULL AUDIO / RINGING / DIALING INTERFACE
  // ─────────────────────────────────────────────
  return createPortal(
    <FocusLock>
      <motion.div
        role="dialog"
        aria-modal="true"
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

      <audio ref={setAudio} autoPlay className="hidden" />

      {/* Minimize button — only when connected */}
      {isConnected && (
        <div className="absolute top-6 right-6 z-20">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsMinimized(true)}
            title="Minimize Call"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            <ChevronDown size={13} />
            Minimize
          </motion.button>
        </div>
      )}

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
            src={isIncoming ? incomingCall.callerAvatar : chatImage}
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
              className={`text-[11px] font-medium tracking-[0.06em] uppercase flex items-center gap-1.5 ${isIncoming ? "text-success" : "text-textMuted"}`}
            >
              {(callType === "video" || incomingCall?.type === "video") && <span>📹</span>}
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
                onClick: onToggleMute,
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
          {isConnected || callStatus === "connecting" ? (
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
    </motion.div>
    </FocusLock>,
    document.body
  );
}

export default CallOverlay;