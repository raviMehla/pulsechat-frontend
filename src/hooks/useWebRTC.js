import { useEffect, useRef, useState } from "react";
import { getSocket } from "../services/socket";
import toast from "react-hot-toast";

export const useWebRTC = (currentUserId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connecting, connected
  const [isMuted, setIsMuted] = useState(false); // 🛡️ NEW: Hardware Mute State
  
  const peerConnection = useRef(null);
  const currentCallTarget = useRef(null);
  const localStreamRef = useRef(null);

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // 🛡️ ARCHITECTURAL UPGRADE: Anti-Refresh Safety Net
  // Warns the user if they try to close or refresh the tab during an active call
  useEffect(() => {
    if (callStatus === "idle") return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "You have an active call. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [callStatus]);

  const initWebRTC = async (targetUserId) => {
    currentCallTarget.current = targetUserId;
    
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsMuted(false); // Reset mute state on new call
    } catch (err) {
      toast.error("Microphone access denied!");
      throw err;
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setCallStatus("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket.emit("webrtc_ice_candidate", {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    return pc;
  };

  const initiateCall = (targetUserId) => {
    setCallStatus("calling");
    currentCallTarget.current = targetUserId;
  };

  const acceptCall = (callerId) => {
    setCallStatus("connecting");
    currentCallTarget.current = callerId;
    const socket = getSocket();
    socket.emit("accept_call", { to: callerId });
  };

  const handleCallAccepted = async () => {
    try {
      const targetUserId = currentCallTarget.current;
      if (!targetUserId) return;

      setCallStatus("connecting");
      const pc = await initWebRTC(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket.emit("webrtc_offer", {
        to: targetUserId,
        sdp: offer
      });
    } catch (err) {
      console.error("Failed to generate WebRTC offer after call accepted:", err);
      cleanupCall();
    }
  };

  const handleIncomingOffer = async ({ from, sdp }) => {
    try {
      setCallStatus("connecting");
      const pc = await initWebRTC(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket.emit("webrtc_answer", {
        to: from,
        sdp: answer
      });
    } catch (err) {
      console.error("Failed to handle incoming WebRTC offer:", err);
      cleanupCall();
    }
  };

  // 🛡️ ARCHITECTURAL UPGRADE: Hardware Microphone Control
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled; // Physically cuts the mic
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setIsMuted(false);
    currentCallTarget.current = null;
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCallAcceptedEvent = () => {
      handleCallAccepted();
    };

    const handleOfferEvent = (data) => {
      handleIncomingOffer(data);
    };

    const handleAnswerEvent = async ({ sdp }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleIceCandidateEvent = async ({ candidate }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding received ice candidate", err);
        }
      }
    };

    socket.on("call_accepted", handleCallAcceptedEvent);
    socket.on("webrtc_offer", handleOfferEvent);
    socket.on("webrtc_answer", handleAnswerEvent);
    socket.on("webrtc_ice_candidate", handleIceCandidateEvent);

    return () => {
      socket.off("call_accepted", handleCallAcceptedEvent);
      socket.off("webrtc_offer", handleOfferEvent);
      socket.off("webrtc_answer", handleAnswerEvent);
      socket.off("webrtc_ice_candidate", handleIceCandidateEvent);
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    toggleMute, // Exported so CallOverlay can use it
    initiateCall,
    acceptCall,
    cleanupCall
  };
};