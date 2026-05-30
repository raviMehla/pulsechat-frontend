
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { getSocket } from "../services/socket";
import CallOverlay from "../components/chat/CallOverlay";
import toast from "react-hot-toast";
import { getAvatarUrl } from "../utils/getAvatarUrl";
import localforage from "localforage";

const CallContext = createContext();

const addCallLog = async (log) => {
  try {
    const existing = await localforage.getItem("call_logs") || [];
    const newLog = {
      _id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...log
    };
    await localforage.setItem("call_logs", [newLog, ...existing].slice(0, 50));
  } catch (err) {
    console.error("Failed to save local call log:", err);
  }
};

export const CallProvider = ({ children }) => {
  const currentUserId = localStorage.getItem("userId");
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const incomingCallRef = useRef(null);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const [callTargetInfo, setCallTargetInfo] = useState({ name: "", image: "" });

  const callTargetUserIdRef = useRef(null);

  const webrtc = useWebRTC(currentUserId);

  // WebRTC Call Socket Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingCall = (data) => setIncomingCall(data);

    const handleCallRejected = (data) => {
      setIsCalling(false);
      webrtc.cleanupCall();
      if (data?.reason === "offline") {
        toast.error("User is offline");
      } else {
        toast.error("Call declined");
      }
      callTargetUserIdRef.current = null;
    };

    const handleCallCancelled = () => {
      if (incomingCallRef.current) {
        addCallLog({
          type: incomingCallRef.current.type || "audio",
          direction: "missed",
          user: {
            id: incomingCallRef.current.from,
            name: incomingCallRef.current.callerName,
            image: incomingCallRef.current.callerAvatar
          }
        });
      }
      setIncomingCall(null);
      setIsCalling(false);
      webrtc.cleanupCall();
      toast("Call ended", { icon: "📵" });
      callTargetUserIdRef.current = null;
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_cancelled", handleCallCancelled);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_cancelled", handleCallCancelled);
    };
  }, [webrtc]);

  const handleInitiateCall = (targetUserId, type = "audio", targetName, targetImage, chatId) => {
    if (!targetUserId) return;
    setIsCalling(true);
    setCallTargetInfo({ name: targetName, image: targetImage });
    callTargetUserIdRef.current = targetUserId;

    // Log call locally
    addCallLog({
      type,
      direction: "outgoing",
      user: {
        id: targetUserId,
        name: targetName,
        image: targetImage
      }
    });

    const myUserString = localStorage.getItem("user");
    const myName = myUserString ? JSON.parse(myUserString).name : "Someone";
    const myProfilePic = myUserString ? getAvatarUrl(JSON.parse(myUserString).profilePic) : null;
    const currentUserIdReal = localStorage.getItem("userId");

    getSocket().emit("call_user", {
      userToCall: targetUserId,
      from: currentUserIdReal,
      callerName: myName,
      callerAvatar: myProfilePic,
      type: type,
      chatId: chatId,
    });

    webrtc.initiateCall(targetUserId, type);
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    toast.success("Connecting securely...");
    callTargetUserIdRef.current = incomingCall.from;

    // Log call locally
    addCallLog({
      type: incomingCall.type || "audio",
      direction: "incoming",
      user: {
        id: incomingCall.from,
        name: incomingCall.callerName,
        image: incomingCall.callerAvatar
      }
    });

    webrtc.acceptCall(incomingCall.from, incomingCall.type || "audio");
  };

  const handleEndCall = () => {
    const target = callTargetUserIdRef.current || incomingCall?.from;
    webrtc.cleanupCall();
    setIsCalling(false);
    setIncomingCall(null);
    if (target) {
      getSocket().emit("cancel_call", { to: target });
    }
    callTargetUserIdRef.current = null;
  };

  const handleCancelCall = () => {
    const target = callTargetUserIdRef.current;
    webrtc.cleanupCall();
    setIsCalling(false);
    if (target) {
      getSocket().emit("cancel_call", { to: target });
    }
    callTargetUserIdRef.current = null;
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;
    webrtc.cleanupCall();
    getSocket().emit("reject_call", { to: incomingCall.from });

    // Log call locally
    addCallLog({
      type: incomingCall.type || "audio",
      direction: "missed",
      user: {
        id: incomingCall.from,
        name: incomingCall.callerName,
        image: incomingCall.callerAvatar
      }
    });

    setIncomingCall(null);
    callTargetUserIdRef.current = null;
  };

  return (
    <CallContext.Provider
      value={{
        isCalling,
        setIsCalling,
        incomingCall,
        setIncomingCall,
        startCall: handleInitiateCall,
        acceptCall: handleAcceptCall,
        endCall: handleEndCall,
        cancelCall: handleCancelCall,
        declineCall: handleDeclineCall,
        ...webrtc,
      }}
    >
      {children}
      <CallOverlay
        isCalling={isCalling}
        incomingCall={incomingCall}
        chatName={incomingCall ? incomingCall.callerName : callTargetInfo.name}
        chatImage={incomingCall ? incomingCall.callerAvatar : callTargetInfo.image}
        callStatus={webrtc.callStatus}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        callType={webrtc.callType}
        isMuted={webrtc.isMuted}
        isVideoMuted={webrtc.isVideoMuted}
        facingMode={webrtc.facingMode}
        onToggleMute={webrtc.toggleMute}
        onToggleVideoMute={webrtc.toggleVideoMute}
        onSwitchCamera={webrtc.switchCamera}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        onCancel={handleCancelCall}
        onEndCall={handleEndCall}
        myAvatar={localStorage.getItem("user") ? getAvatarUrl(JSON.parse(localStorage.getItem("user")).profilePic) : null}
      />
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
