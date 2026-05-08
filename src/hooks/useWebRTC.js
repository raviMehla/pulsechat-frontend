import { useEffect, useRef, useState } from "react";
import { getSocket } from "../services/socket";
import toast from "react-hot-toast";

export const useWebRTC = (currentUserId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connected
  
  const peerConnection = useRef(null);
  const currentCallTarget = useRef(null);

  // 🛡️ ARCHITECTURAL UPGRADE: Google's Free STUN Servers for NAT Traversal
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // ─────────────────────────────────────────────
  // 1️⃣ CORE: Initialize Peer Connection & Media
  // ─────────────────────────────────────────────
  const initWebRTC = async (targetUserId) => {
    currentCallTarget.current = targetUserId;
    
    // 1. Get Microphone Permissions
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
    } catch (err) {
      toast.error("Microphone access denied!");
      throw err;
    }

    // 2. Create the P2P Connection
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    // 3. Add our microphone audio to the connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 4. Listen for the other person's audio arriving
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setCallStatus("connected");
    };

    // 5. When our browser finds its public IP, send it to the other user via Socket
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

  // ─────────────────────────────────────────────
  // 2️⃣ CALLER LOGIC: Create the Offer
  // ─────────────────────────────────────────────
  const initiateCall = async (targetUserId) => {
    try {
      setCallStatus("calling");
      const pc = await initWebRTC(targetUserId);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket.emit("webrtc_offer", {
        userToCall: targetUserId,
        sdp: offer
      });
    } catch (err) {
      console.error("Failed to initiate call:", err);
      cleanupCall();
    }
  };

  // ─────────────────────────────────────────────
  // 3️⃣ RECEIVER LOGIC: Answer the Call
  // ─────────────────────────────────────────────
  const acceptCall = async (callerId, incomingOfferSdp) => {
    try {
      setCallStatus("connecting");
      const pc = await initWebRTC(callerId);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket.emit("webrtc_answer", {
        to: callerId,
        sdp: answer
      });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanupCall();
    }
  };

  // ─────────────────────────────────────────────
  // 4️⃣ MEMORY LEAK PREVENTION: Cleanup
  // ─────────────────────────────────────────────
  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    currentCallTarget.current = null;
  };

  // ─────────────────────────────────────────────
  // 5️⃣ SOCKET EVENT LISTENERS
  // ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Caller receives the Answer
    const handleAnswer = async ({ sdp }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    // Both users receive ICE Candidates (Network paths)
    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding received ice candidate", err);
        }
      }
    };

    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callStatus,
    initiateCall,
    acceptCall,
    cleanupCall
  };
};