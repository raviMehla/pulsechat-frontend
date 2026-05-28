import { useEffect, useRef, useState } from "react";
import { getSocket } from "../services/socket";
import api from "../services/api";
import toast from "react-hot-toast";

export const useWebRTC = (_currentUserId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connecting, connected
  const [callType, setCallType] = useState("audio"); // audio, video
  const [isMuted, setIsMuted] = useState(false); // 🛡️ Hardware Mute State
  const [isVideoMuted, setIsVideoMuted] = useState(false); // 🛡️ Hardware Camera State
  const [facingMode, setFacingMode] = useState("user"); // user, environment
  
  const peerConnection = useRef(null);
  const currentCallTarget = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTypeRef = useRef("audio"); // 🛡️ Fix stale closure in socket event listener
  const iceCandidateQueue = useRef([]);
  const iceDropTimeoutRef = useRef(null);

  // Fetches fresh TURN + STUN ICE credentials from the backend.
  // This keeps the Metered API key secret (server-side only).
  // Falls back to Google STUN if the backend call fails, so calls
  // still work on open/simple networks even if Metered is unreachable.
  const fetchIceServers = async () => {
    try {
      const { data } = await api.get("/call/ice-servers");
      return data.iceServers;
    } catch (err) {
      console.warn("[WebRTC] Failed to fetch TURN credentials, falling back to STUN only:", err.message);
      return [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ];
    }
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

  const initWebRTC = async (targetUserId, type = "audio") => {
    currentCallTarget.current = targetUserId;
    
    let stream;
    try {
      const constraints = {
        audio: true,
        video: type === "video" ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } : false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsMuted(false); // Reset mute state on new call
      setIsVideoMuted(false); // Reset video mute state on new call
      setFacingMode("user"); // Reset facing mode on new call
    } catch (err) {
      if (type === "video") {
        console.warn("Video access denied or unavailable, trying audio-only fallback...", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(stream);
          localStreamRef.current = stream;
          setIsMuted(false);
          setCallType("audio"); // Gracefully degrade state to audio
          callTypeRef.current = "audio";
          toast.success("Connected via voice call (camera unavailable)");
        } catch (audioErr) {
          toast.error("Microphone access denied!");
          throw audioErr;
        }
      } else {
        toast.error("Microphone access denied!");
        throw err;
      }
    }

    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      remoteStreamRef.current = stream;
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

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("⚡ WebRTC ICE Connection State Changed:", state);
      
      if (state === "disconnected" || state === "failed") {
        toast.error("WebRTC connection lost. Reconnecting...", { id: "webrtc-status" });
        
        if (!iceDropTimeoutRef.current) {
          iceDropTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              toast.error("Call timed out due to network issues.", { id: "webrtc-status" });
              cleanupCall();
              const socket = getSocket();
              if (socket && socket.connected && currentCallTarget.current) {
                socket.emit("cancel_call", { to: currentCallTarget.current });
              }
            }
          }, 5000);
        }
      } else if (state === "connected" || state === "completed") {
        toast.success("WebRTC connection restored!", { id: "webrtc-status" });
        if (iceDropTimeoutRef.current) {
          clearTimeout(iceDropTimeoutRef.current);
          iceDropTimeoutRef.current = null;
        }
      }
    };

    return pc;
  };

  const initiateCall = (targetUserId, type = "audio") => {
    setCallStatus("calling");
    setCallType(type);
    callTypeRef.current = type;
    currentCallTarget.current = targetUserId;
  };

  const acceptCall = (callerId, type = "audio") => {
    setCallStatus("connecting");
    setCallType(type);
    callTypeRef.current = type;
    currentCallTarget.current = callerId;
    const socket = getSocket();
    socket.emit("accept_call", { to: callerId });
  };

  const handleCallAccepted = async () => {
    try {
      const targetUserId = currentCallTarget.current;
      if (!targetUserId) return;

      setCallStatus("connecting");
      const pc = await initWebRTC(targetUserId, callTypeRef.current);
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

  const processQueuedCandidates = async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding queued ice candidate:", err);
      }
    }
  };

  const handleIncomingOffer = async ({ from, sdp }) => {
    try {
      setCallStatus("connecting");
      const pc = await initWebRTC(from, callTypeRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await processQueuedCandidates(); // 🛡️ Flush early candidates
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

  // 🛡️ ARCHITECTURAL UPGRADE: Hardware Video Camera Control
  const toggleVideoMute = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled; // Physically cuts the camera stream
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const cleanupCall = () => {
    if (iceDropTimeoutRef.current) {
      clearTimeout(iceDropTimeoutRef.current);
      iceDropTimeoutRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    iceCandidateQueue.current = []; // 🛡️ Flush queue
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setCallType("audio");
    callTypeRef.current = "audio";
    setIsMuted(false);
    setIsVideoMuted(false);
    setFacingMode("user");
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
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
          await processQueuedCandidates(); // 🛡️ Flush early candidates
        } catch (err) {
          console.error("Error setting remote description or processing candidates:", err);
        }
      }
    };

    const handleIceCandidateEvent = async ({ candidate }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding received ice candidate:", err);
        }
      } else {
        iceCandidateQueue.current.push(candidate);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🛡️ Prevent hardware leaks when switching views in SPA
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  // 🛡️ ARCHITECTURAL UPGRADE: Switch Camera (Front/Back)
  const switchCamera = async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      // 1. Enumerate all video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      if (videoDevices.length < 2) {
        throw new Error("No other camera detected on this device.");
      }

      // 2. Find the next device to toggle to
      const currentDeviceId = videoTrack.getSettings().deviceId;
      let targetDeviceId = "";
      if (currentDeviceId) {
        const currentIndex = videoDevices.findIndex((d) => d.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        targetDeviceId = videoDevices[nextIndex].deviceId;
      } else {
        targetDeviceId = videoDevices[1].deviceId;
      }

      // Stop the old track FIRST to release the camera hardware lock
      videoTrack.stop();

      // 3. Request user media for the selected camera device
      const constraints = {
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : { facingMode: "environment" })
        }
      };
      
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("[WebRTC] Failed to acquire video track with target device constraints, trying generic fallback...", err);
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      }
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Preserve the current video mute (enabled) state on the new track
      newVideoTrack.enabled = !isVideoMuted;

      // Replace the track in RTCPeerConnection sender
      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Update the local stream ref
      localStreamRef.current.removeTrack(videoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      // Trigger state change with a new MediaStream instance so UI re-renders
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      // 4. Update the facingMode state dynamically from new track settings/labels for mirroring
      const settings = newVideoTrack.getSettings();
      let newFacingMode = settings.facingMode;
      if (!newFacingMode && newVideoTrack.label) {
        const label = newVideoTrack.label.toLowerCase();
        if (label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("outer")) {
          newFacingMode = "environment";
        } else {
          newFacingMode = "user";
        }
      }
      if (!newFacingMode) {
        newFacingMode = "user";
      }
      setFacingMode(newFacingMode);

      return newFacingMode;
    } catch (err) {
      console.error("[WebRTC] Failed to switch camera:", err);
      toast.error("Failed to switch camera: " + err.message);
    }
  };

  return {
    localStream,
    remoteStream,
    callStatus,
    callType,
    isMuted,
    isVideoMuted,
    facingMode,
    toggleMute, // Exported so CallOverlay can use it
    toggleVideoMute, // Exported so CallOverlay can use it
    switchCamera, // Exported so CallOverlay can use it
    initiateCall,
    acceptCall,
    cleanupCall
  };
};