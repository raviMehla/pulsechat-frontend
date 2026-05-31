import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import { getAvatarUrl } from "../utils/getAvatarUrl";
import UserInfoModal from "../components/chat/UserInfoModal";
import localforage from "localforage";
import { 
  getMessages, 
  sendMessage, 
  markChatAsRead, 
  sendMedia, 
  reactToMessage, 
  deleteMessage, 
  fetchMessageContext,
  editMessage,
  pinMessage,
  starMessage
} from "../services/message.api";
import { getSocket } from "../services/socket";
import { getUserStatus, getMyProfile, toggleBlockUser } from "../services/user.api";
import { getChats, accessChat } from "../services/chat.api";
import { useChatSocket } from "../hooks/useChatSocket"; 
import { MessageSkeleton } from "../components/chat/MessageSkeleton";
import { useChat } from "../context/ChatContext";
import { useCall } from "../context/CallContext";

import toast from "react-hot-toast";

import { useConfirm } from "../hooks/useConfirm";
import ConfirmDialog from "../components/ui/ConfirmDialog";

import ChatHeader from "../components/chat/ChatHeader";

import MessageBubble from "../components/chat/MessageBubble";
import MessageInput from "../components/chat/MessageInput";
import MessageSearch from "../components/chat/MessageSearch";
import GroupInfoModal from "../components/chat/GroupInfoModal";
import ForwardMessageModal from "../components/chat/ForwardMessageModal";
import { Virtuoso } from "react-virtuoso";

// Helper for client-side image compression
const compressImage = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      return resolve(file);
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const MAX_WIDTH = 1600;
      const MAX_HEIGHT = 1600;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        file.type,
        0.8
      );
    };
    img.onerror = () => resolve(file);
  });
};

function ChatView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");
  const { setActiveChat } = useChat();

  // Local State
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [isOnline, setIsOnline]   = useState(false);
  const [chatName, setChatName]   = useState("Chat");
  const [isGroup, setIsGroup]     = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [activeChatData, setActiveChatData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isOtherUserDeleted, setIsOtherUserDeleted] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const virtuosoRef = useRef(null);
  const isFetchingMoreRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypedTimeRef = useRef(0);
  const uploadAbortControllerRef = useRef(null);
  const [chatImage, setChatImage] = useState(null);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const { startCall } = useCall();

  const otherUserIdRef = useRef(null);

  const { confirmState, confirm, close: closeConfirm } = useConfirm();


  // 🛡️ Synchronize currently active chat ID with global context
  useEffect(() => {
    if (id) {
      setActiveChat(id);
    }
    return () => {
      setActiveChat(null);
    };
  }, [id, setActiveChat]);

  // ─────────────────────────────────────────────
  // 1️⃣ Load Initial Data
  // ─────────────────────────────────────────────
  useEffect(() => {
    // Reset initial loading state asynchronously to prevent ESLint cascading render warning
    Promise.resolve().then(() => {
      setIsInitialLoading(true);
      setIsBroadcast(id ? id.startsWith("broadcast_") : false);
    });

    const fetchMessages = async () => {
      try {
        if (id && id.startsWith("broadcast_")) {
          const broadcastMsgs = await localforage.getItem(`broadcast_messages_${id}`);
          setMessages(broadcastMsgs || []);
          setNextCursor(null);
          setIsInitialLoading(false);
          return;
        }
        const data = await getMessages(id);
        const messagesData = data.messages || [];
        setMessages(messagesData);
        setNextCursor(data.nextCursor || null); // 🛡️ Capture cursor
        await markChatAsRead(id);
        await localforage.setItem(`messages_${id}`, {
          messages: messagesData,
          nextCursor: data.nextCursor || null
        });
      } catch (err) {
        console.error("Messages fetch error:", err);
      } finally {
        setIsInitialLoading(false); // 🛡️ End skeleton
      }
    };

    const loadCachedMessages = async () => {
      try {
        if (id && id.startsWith("broadcast_")) {
          const cachedData = await localforage.getItem(`broadcast_messages_${id}`);
          setMessages(cachedData || []);
          setIsInitialLoading(false);
          return;
        }
        const cachedData = await localforage.getItem(`messages_${id}`);
        if (cachedData && cachedData.messages) {
          setMessages(cachedData.messages);
          setNextCursor(cachedData.nextCursor || null);
          setIsInitialLoading(false);
        }
      } catch (error) {
        console.error("Failed to load cached messages:", error);
      }
      fetchMessages();
    };

    loadCachedMessages();
  }, [id]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const jumpTo = searchParams.get("jumpTo");

  useEffect(() => {
    if (jumpTo && messages.length > 0) {
      const msgObj = messages.find(m => String(m._id) === String(jumpTo));
      if (msgObj) {
        handleJumpToMessage(msgObj);
      } else {
        handleJumpToMessage({ _id: jumpTo });
      }
      // Clean query parameter from URL to prevent infinite scrolling loops
      const url = new URL(window.location);
      url.searchParams.delete("jumpTo");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, [jumpTo, messages]);

  // Persist messages to cache on any update (socket arrivals, reactions, deletions, retry queue updates)
  useEffect(() => {
    if (!isInitialLoading && id) {
      if (id.startsWith("broadcast_")) {
        localforage.setItem(`broadcast_messages_${id}`, messages).catch((err) => {
          console.error("Failed to persist broadcast messages:", err);
        });
      } else {
        localforage.setItem(`messages_${id}`, {
          messages,
          nextCursor
        }).catch((err) => {
          console.error("Failed to persist messages to IndexedDB:", err);
        });
      }
    }
  }, [messages, nextCursor, id, isInitialLoading]);

  // Offline queue auto-retry on reconnect
  useEffect(() => {
    if (!id || id.startsWith("broadcast_")) return;
    
    const socket = getSocket();
    if (!socket) return;

    const flushQueue = async () => {
      try {
        const queue = await localforage.getItem(`offline_queue_${id}`) || [];
        if (queue.length === 0) return;

        console.log(`🔌 Online! Flushing ${queue.length} pending messages...`);
        const remainingQueue = [];

        for (const item of queue) {
          try {
            const sentData = await sendMessage({
              content: item.content,
              chatId: id,
              replyTo: item.replyToId
            });

            // Update the message status in messages list
            setMessages((prev) => 
              prev.map((m) => String(m._id) === String(item.tempId) ? { ...sentData, status: "sent" } : m)
            );
          } catch (err) {
            console.error("Failed to send queued message, keeping in queue:", err);
            remainingQueue.push(item);
          }
        }

        await localforage.setItem(`offline_queue_${id}`, remainingQueue);
      } catch (err) {
        console.error("Failed to flush offline queue:", err);
      }
    };

    socket.on("connect", flushQueue);
    if (socket.connected) {
      flushQueue();
    }

    return () => {
      socket.off("connect", flushQueue);
    };
  }, [id]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        if (id && id.startsWith("broadcast_")) {
          const storedLists = await localforage.getItem("broadcast_lists") || [];
          const currentList = storedLists.find(l => l._id === id);
          if (!currentList) {
            toast.error("Broadcast list not found");
            navigate("/");
            return;
          }
          setIsGroup(false);
          setIsBroadcast(true);
          setChatName(currentList.chatName || "Broadcast List");
          setParticipantCount(currentList.users?.length || 0);
          setActiveChatData({
            ...currentList,
            isBroadcast: true
          });
          setChatImage(null);
          setIsOtherUserDeleted(false);
          setIsBlockedByMe(false);
          setIsOnline(false);
          otherUserIdRef.current = null;
          return;
        }

        setIsBroadcast(false);

        const chats = await getChats();
        if (!Array.isArray(chats)) return;

        const currentChat = chats.find((c) => c._id === id);
        if (!currentChat) return;

        setIsGroup(currentChat.isGroup || false);
        setIsOtherUserDeleted(false);
        setIsBlockedByMe(false);

        if (currentChat.isGroup) {
          setChatName(currentChat.chatName || "Group");
          setParticipantCount(currentChat.users?.length || 0);
          setActiveChatData(currentChat);
          setChatImage(getAvatarUrl(currentChat.groupAvatar));
          return;
        }

        const other = currentChat.users.find((u) => u && String(u._id) !== String(currentUserId));
        
        if (currentChat.otherUserDeleted || !other) {
          setIsOtherUserDeleted(true);
          setChatName("Deleted Account");
          setChatImage(null);
          setActiveChatData(currentChat);
          otherUserIdRef.current = null;
          return;
        }

        setChatName(other.name || other.username || "User");
        otherUserIdRef.current = other._id;
        setChatImage(getAvatarUrl(other.profilePic));
        setActiveChatData(currentChat);

        try {
          const myProfile = await getMyProfile();
          if (myProfile.blockedUsers?.some(u => String(u._id || u) === String(other._id))) {
            setIsBlockedByMe(true);
          }
        } catch (profileErr) {
          console.error("Failed to fetch profile block data", profileErr);
        }

        try {
          const status = await getUserStatus(other._id);
          setIsOnline(status.isOnline);
        } catch (err) {
          console.error("Initial status fetch error:", err);
        }
      } catch (err) {
        console.error("Chat info fetch error:", err);
      }
    };
    fetchChatInfo();
  }, [id, currentUserId]);

  const loadMoreMessages = useCallback(async () => {
    if (!nextCursor || isFetchingMoreRef.current) return;
    
    try {
      isFetchingMoreRef.current = true;
      setIsFetchingMore(true);

      const data = await getMessages(id, nextCursor);
      
      setMessages(prev => [...(data.messages || []), ...prev]);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error("Failed to load older messages", error);
      toast.error("Failed to sync message history");
    } finally {
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [id, nextCursor]);

  // ─────────────────────────────────────────────
  // 2️⃣ Attach Modular Socket Engine
  // ─────────────────────────────────────────────
  useChatSocket({
    chatId: id,
    currentUserId,
    otherUserIdRef,
    setMessages,
    setIsTyping,
    setIsOnline,
    setChatName,
    setParticipantCount,
    setActiveChatData,
    navigate
  });



  // 🛡️ Revoke the preview Object URL when previewUrl changes or component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 🛡️ Abort active media uploads on unmount or session expiration to prevent background resource waste
  useEffect(() => {
    const handleAuthExpired = () => {
      if (uploadAbortControllerRef.current) {
        console.log("🔒 Session expired. Aborting active media uploads...");
        uploadAbortControllerRef.current.abort();
      }
    };
    window.addEventListener("auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("auth_expired", handleAuthExpired);
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Cleanup typing timeout and emit stop_typing on unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      const socket = getSocket();
      if (socket && id) {
        socket.emit("stop_typing", { chatId: id });
      }
    };
  }, [id]);
  // ─────────────────────────────────────────────
  // 3️⃣ Component Methods (UI Handlers)
  // ─────────────────────────────────────────────
  
  const handleToggleBlock = async () => {
    try {
      if (!otherUserIdRef.current) return;
      const res = await toggleBlockUser(otherUserIdRef.current);
      setIsBlockedByMe(res.blocked);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle block status");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 25MB.");
      e.target.value = ""; 
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Images, videos, PDFs, Office docs, text files, and ZIP files are allowed.");
      e.target.value = ""; 
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const clearPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };
  
  const handleSend = async () => {
    try {
      if (id.startsWith("broadcast_")) {
        const textToSend = input.trim();
        if (!textToSend && !selectedFile) return;

        // 1. Get recipients list from localforage
        const storedLists = await localforage.getItem("broadcast_lists") || [];
        const currentList = storedLists.find(l => l._id === id);
        if (!currentList || !currentList.users || currentList.users.length === 0) {
          toast.error("No recipients in this broadcast list.");
          return;
        }

        setIsUploading(true);
        const tempMsgId = `broadcast-temp-${Date.now()}`;
        const myUserString = localStorage.getItem("user");
        const myUserObj = myUserString ? JSON.parse(myUserString) : {};
        const normalizedSender = {
          ...myUserObj,
          _id: currentUserId,
        };

        const optimisticBroadcastMsg = {
          _id: tempMsgId,
          content: textToSend || (selectedFile ? selectedFile.name : ""),
          sender: normalizedSender,
          createdAt: new Date().toISOString(),
          messageType: selectedFile 
            ? (selectedFile.type.startsWith("image/") ? "image" : selectedFile.type.startsWith("video/") ? "video" : "file") 
            : "text",
          status: "sent",
          fileName: selectedFile?.name || null,
          deliveredTo: [],
          readBy: [],
        };

        let fileToSend = selectedFile;
        if (selectedFile && selectedFile.type.startsWith("image/") && selectedFile.type !== "image/gif") {
          try {
            fileToSend = await compressImage(selectedFile);
          } catch (compressErr) {
            console.error("Compression failed:", compressErr);
          }
        }

        setInput("");
        clearPreview();

        // 2. Send individually to all users in the broadcast list
        const sendPromises = currentList.users.map(async (recipient) => {
          try {
            const chatObj = await accessChat(recipient._id);
            const targetChatId = chatObj._id || chatObj.data?._id;
            
            if (fileToSend) {
              await sendMedia(targetChatId, fileToSend);
            } else {
              await sendMessage({ content: textToSend, chatId: targetChatId });
            }
          } catch (err) {
            console.error(`Failed to send broadcast message to ${recipient.name}:`, err);
          }
        });

        await Promise.all(sendPromises);

        // Append to local broadcast message logs
        const updatedMsgs = [...messages, optimisticBroadcastMsg];
        setMessages(updatedMsgs);
        await localforage.setItem(`broadcast_messages_${id}`, updatedMsgs);

        // Update lastMessage inside the broadcast lists storage so it renders in sidebar
        const updatedLists = storedLists.map(l => {
          if (l._id === id) {
            return {
              ...l,
              lastMessage: optimisticBroadcastMsg
            };
          }
          return l;
        });
        await localforage.setItem("broadcast_lists", updatedLists);
        
        toast.success("Broadcast sent!");
        setIsUploading(false);
        return;
      }

      if (selectedFile) {
        setIsUploading(true);
        const controller = new AbortController();
        uploadAbortControllerRef.current = controller;

        // 🛡️ Client-side image compression to save cloud bandwidth
        let fileToSend = selectedFile;
        if (selectedFile.type.startsWith("image/") && selectedFile.type !== "image/gif") {
          try {
            fileToSend = await compressImage(selectedFile);
          } catch (compressErr) {
            console.error("Compression failed, uploading original:", compressErr);
          }
        }

        await sendMedia(id, fileToSend, replyingTo?._id, controller.signal);
        clearPreview();
        setReplyingTo(null);
      } else {
        const textToSend = input.trim();
        if (!textToSend) return;

        // 🛡️ Optimistic UI implementation: Add pending message to state instantly
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const myUserString = localStorage.getItem("user");
        const myUserObj = myUserString ? JSON.parse(myUserString) : {};
        
        // 🛡️ Normalize sender: guarantee _id is always currentUserId so isOwnMessage = true
        // localStorage user may store id as '_id', 'id', or have no field at all
        const normalizedSender = {
          ...myUserObj,
          _id: currentUserId,  // Always override with the authoritative userId
        };
        
        const optimisticMsg = {
          _id: tempId,
          content: textToSend,
          sender: normalizedSender,
          createdAt: new Date().toISOString(),
          messageType: "text",
          status: "pending",
          deliveredTo: [],
          readBy: [],
          replyTo: replyingTo ? {
            _id: replyingTo._id,
            content: replyingTo.content,
            sender: replyingTo.sender,
            messageType: replyingTo.messageType,
            fileUrl: replyingTo.fileUrl,
            fileName: replyingTo.fileName,
            isDeleted: replyingTo.isDeleted
          } : null
        };

        setInput("");
        setReplyingTo(null);
        setMessages(prev => [...prev, optimisticMsg]);

        try {
          const sentData = await sendMessage({ content: textToSend, chatId: id, replyTo: optimisticMsg.replyTo?._id || null });
          // Swap temp optimistic message with actual DB message
          setMessages(prev => prev.map(m => m._id === tempId ? { ...sentData, status: "sent" } : m));
        } catch (apiErr) {
          console.error("Optimistic send failed:", apiErr);
          setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed" } : m));
          
          // Save to offline queue for auto-retry
          const queue = await localforage.getItem(`offline_queue_${id}`) || [];
          queue.push({
            tempId,
            content: textToSend,
            chatId: id,
            replyToId: optimisticMsg.replyTo?._id || null
          });
          await localforage.setItem(`offline_queue_${id}`, queue);

          throw apiErr; // Let the outer catch handle the toast or standard logging
        }
      }
      
      const socket = getSocket();
      if (socket) {
        socket.emit("stop_typing", { chatId: id });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      lastTypedTimeRef.current = 0;

    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        console.log("Upload aborted.");
        return;
      }
      if (err.response?.status === 403) {
        toast.error(err.response.data.message, { duration: 4000 });
        if (err.response.data.message.includes("You have blocked")) {
          setIsBlockedByMe(true); 
        }
      } else {
        toast.error("Failed to send message");
        console.error("Send Message/Media Error:", err);
      }
    } finally {
      uploadAbortControllerRef.current = null;
      setIsUploading(false);
    }
  };

  const handleRetry = async (failedMsg) => {
    // Mark status as pending
    setMessages(prev => prev.map(m => m._id === failedMsg._id ? { ...m, status: "pending" } : m));

    try {
      const sentData = await sendMessage({ 
        content: failedMsg.content, 
        chatId: id, 
        replyTo: failedMsg.replyTo?._id || null 
      });
      // Replace the failed message with the sent data
      setMessages(prev => prev.map(m => m._id === failedMsg._id ? { ...sentData, status: "sent" } : m));
    } catch (err) {
      console.error("Retry send failed:", err);
      setMessages(prev => prev.map(m => m._id === failedMsg._id ? { ...m, status: "failed" } : m));
      toast.error("Failed to resend message. Check your connection.");
    }
  };

  const handleReaction = async (messageId, emoji) => { 
    await reactToMessage(messageId, emoji); 
  };
  
  const handleDelete = (messageId) => { 
    confirm({
      title: "Delete Message",
      message: "Are you sure you want to delete this message for everyone?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteMessage(messageId); 
          toast.success("Message deleted");
        } catch (error) {
          toast.error("Failed to delete message");
        }
      }
    });
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await editMessage(messageId, newContent);
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) ? { ...m, content: newContent, isEdited: true, editedAt: new Date() } : m
      ));
      toast.success("Message edited");
    } catch (error) {
      toast.error("Failed to edit message");
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const res = await pinMessage(messageId);
      const isPinned = res.isPinned;
      setMessages((prev) => prev.map((m) => {
        if (String(m._id) === String(messageId)) {
          return { ...m, isPinned };
        }
        if (isPinned && m.isPinned) {
          return { ...m, isPinned: false };
        }
        return m;
      }));
      toast.success(isPinned ? "Message pinned" : "Message unpinned");
    } catch (error) {
      toast.error("Failed to pin message");
    }
  };

  const handleStarMessage = async (messageId) => {
    try {
      await starMessage(messageId);
      setMessages((prev) => prev.map((m) => {
        if (String(m._id) === String(messageId)) {
          const alreadyStarred = (m.isStarred || []).some(u => String(u._id || u) === String(currentUserId));
          const updatedStarred = alreadyStarred 
            ? (m.isStarred || []).filter(u => String(u._id || u) !== String(currentUserId))
            : [...(m.isStarred || []), currentUserId];
          return { ...m, isStarred: updatedStarred };
        }
        return m;
      }));
    } catch (error) {
      toast.error("Failed to star message");
    }
  };

  const handleForwardConfirm = async (targetChatIds, msg) => {
    try {
      for (const targetChatId of targetChatIds) {
        const payload = {
          chatId: targetChatId,
          content: msg.content,
          messageType: msg.messageType || "text",
          fileUrl: msg.fileUrl || null,
          fileName: msg.fileName || null,
          duration: msg.duration || null,
          isForwarded: true
        };
        const sentData = await sendMessage(payload);

        // If current active chat, append it to messages list
        if (String(targetChatId) === String(id)) {
          setMessages(prev => [...prev, sentData]);
        }
      }
      toast.success("Message forwarded successfully");
    } catch (err) {
      console.error("Error forwarding message:", err);
      toast.error("Failed to forward message");
      throw err;
    }
  };


  const handleJumpToMessage = async (targetMessage) => {
    const element = document.getElementById(`msg-${targetMessage._id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-accent/20"); 
      setTimeout(() => {
        if (element && document.body.contains(element)) {
          element.classList.remove("bg-accent/20");
        }
      }, 2000);
    } else {
      try {
        const contextMessages = await fetchMessageContext(id, targetMessage._id);
        setMessages(contextMessages);
        setIsViewingHistory(true);
        setIsSearchOpen(false); 
        
        setTimeout(() => {
          const newElement = document.getElementById(`msg-${targetMessage._id}`);
          if (newElement) {
            newElement.scrollIntoView({ behavior: "smooth", block: "center" });
            newElement.classList.add("bg-accent/20"); 
            setTimeout(() => {
              if (newElement && document.body.contains(newElement)) {
                newElement.classList.remove("bg-accent/20");
              }
            }, 2000);
          }
        }, 150); 
      } catch (err) {
        console.error("Failed to fetch message context", err);
      }
    }
  };

  const handleJumpToPresent = async () => {
    try {
      const data = await getMessages(id);
      setMessages(data.messages || []);
      setNextCursor(data.nextCursor || null);
      setIsViewingHistory(false);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error("Failed to return to present", err);
    }
  };

  const handleDeleteChat = () => {
    confirm({
      title: "Delete Chat",
      message: "Are you sure you want to permanently delete this entire chat from your device?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/chat/${id}`);
          toast.success("Chat deleted successfully.");
          setIsUserInfoOpen(false);
          navigate("/"); // Kick them out to the chat list
        } catch (error) {
          toast.error("Failed to delete chat.");
          console.error(error);
        }
      }
    });
  };


  const handleInitiateCall = (type = "audio") => {
    if (!otherUserIdRef.current) return;
    if (!isOnline) {
      toast.error(`${chatName} is offline`);
      return;
    }
    startCall(otherUserIdRef.current, type, chatName, chatImage, id);
  };
  const pinnedMessage = messages.find(m => m.isPinned && !m.isDeleted);
 
  // ─────────────────────────────────────────────
  // JSX RENDER
  // ─────────────────────────────────────────────
  return (
    // 🛡️ THE FIX: 'absolute inset-0' physically pins the chat to the screen boundaries.
    // It overrides all flexbox auto-height stretching bugs.
    <div className="absolute inset-0 flex flex-col bg-background overflow-hidden">
      
      {/* 1. FIXED HEADER: Locked tightly to the top */}
      <div className="flex-none z-30 shadow-sm bg-surface">
        <ChatHeader 
          chatName={chatName} 
          isOnline={isOnline} 
          isGroup={isGroup}
          isBroadcast={isBroadcast}
          chatImage={chatImage}
          participantCount={participantCount}
          onSearchClick={() => setIsSearchOpen(!isSearchOpen)} 
          onInfoClick={() => {
            if (isBroadcast) {
              const names = activeChatData?.users?.map(u => u.name || u.username).join(", ") || "No recipients";
              toast(`Recipients: ${names}`, { icon: "📢", duration: 5000 });
            } else {
              isGroup ? setIsGroupInfoOpen(true) : setIsUserInfoOpen(true);
            }
          }}
          onCallClick={() => handleInitiateCall("audio")}
          onVideoCallClick={() => handleInitiateCall("video")}
          isOtherUserDeleted={isOtherUserDeleted}
        />

        {/* Pinned Message Banner */}
        {pinnedMessage && (
          <div 
            onClick={() => handleJumpToMessage(pinnedMessage)}
            className="flex items-center justify-between px-4 py-2.5 bg-accent/10 border-t border-borderSubtle cursor-pointer hover:bg-accent/15 transition-all select-none text-xs"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-accent text-sm">📌</span>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="font-semibold text-[10px] text-accent uppercase tracking-wider">Pinned Message</span>
                <span className="text-textSecondary truncate max-w-[500px]">
                  {pinnedMessage.content || pinnedMessage.fileName || "Media Attachment"}
                </span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePinMessage(pinnedMessage._id);
              }}
              className="text-[10px] text-textMuted hover:text-danger font-medium ml-4 shrink-0 px-2 py-0.5 bg-background border border-borderSubtle hover:border-danger/25 rounded transition-all"
            >
              Unpin
            </button>
          </div>
        )}
      </div>

      {/* 2. FIXED TYPING INDICATOR */}
      {isTyping && (
        <div className="flex-none px-4 py-1.5 text-xs font-medium text-accent animate-pulse bg-surface/50 border-b border-borderSubtle z-20">
          {chatName} is typing...
        </div>
      )}
      
      {/* 3. SCROLLABLE MESSAGE LIST: Perfectly isolated between the top and bottom */}
      <div className="flex-1 w-full relative min-h-0">
        {isInitialLoading ? (
          <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar">
            <MessageSkeleton />
          </div>
        ) : (
          <>
            {isViewingHistory && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex justify-center">
                <button 
                  onClick={handleJumpToPresent}
                  className="bg-surface border border-borderSubtle text-textPrimary px-4 py-1.5 rounded-full text-sm font-medium shadow-md hover:bg-background transition-colors flex items-center gap-2"
                >
                  ⬇️ Jump to Present
                </button>
              </div>
            )}

            <Virtuoso
              ref={virtuosoRef}
              data={messages}
              firstItemIndex={10000 - messages.length}
              initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
              followOutput="smooth"
              startReached={loadMoreMessages}
              scrollerRef={(element) => {
                scrollContainerRef.current = element;
              }}
              className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
              itemContent={(index, msg) => {
                const firstIndex = 10000 - messages.length;
                const relativeIndex = index - firstIndex;
                const prevMsg = relativeIndex > 0 ? messages[relativeIndex - 1] : null;
                const nextMsg = relativeIndex < messages.length - 1 ? messages[relativeIndex + 1] : null;

                const senderId = msg.sender?._id || msg.sender;
                const prevSenderId = prevMsg ? (prevMsg.sender?._id || prevMsg.sender) : null;
                const nextSenderId = nextMsg ? (nextMsg.sender?._id || nextMsg.sender) : null;

                const TWO_MINUTES = 2 * 60 * 1000;
                const timeDiffPrev = prevMsg && msg.createdAt ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : 0;
                const timeDiffNext = nextMsg && msg.createdAt ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() : 0;

                const isFirstInGroup = !prevMsg || senderId !== prevSenderId || timeDiffPrev > TWO_MINUTES;
                const isLastInGroup = !nextMsg || senderId !== nextSenderId || timeDiffNext > TWO_MINUTES;

                return (
                  <div className="px-4">
                    <MessageBubble 
                      key={msg._id} 
                      msg={msg} 
                      currentUserId={currentUserId}
                      isGroup={isGroup}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      onReply={() => setReplyingTo(msg)}
                      onReact={handleReaction}
                      onDelete={handleDelete}
                      onRetry={handleRetry}
                      onEdit={handleEditMessage}
                      onPin={handlePinMessage}
                      onStar={handleStarMessage}
                      onForward={setForwardingMessage}
                    />
                  </div>
                );
              }}
              components={{
                Header: () => (
                  <div className="pt-4">
                    {nextCursor ? (
                      <div className="w-full h-10 flex items-center justify-center my-2">
                        {isFetchingMore && <span className="text-xs font-medium text-accent animate-pulse">Loading history...</span>}
                      </div>
                    ) : null}
                  </div>
                ),
                Footer: () => <div className="pb-4" />
              }}
            />
          </>
        )}
      </div>
        
      {/* 4. FIXED INPUT AREA: Locked tightly to the bottom */}
      <div className="flex-none z-30 bg-surface">
        {isOtherUserDeleted ? (
          <div className="p-4 bg-surface border-t border-borderSubtle text-center text-textMuted flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium">👤 This user has deleted their account. You can no longer message them.</p>
          </div>
        ) : isBlockedByMe ? (
          <div className="p-4 bg-surface border-t border-borderSubtle text-center text-textMuted flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium">🚫 You have blocked this user. They cannot send you messages.</p>
            <button 
              onClick={handleToggleBlock} 
              className="px-5 py-2 bg-background hover:bg-borderSubtle text-textPrimary rounded-full text-sm font-medium transition-colors border border-borderSubtle shadow-sm"
            >
              Unblock User
            </button>
          </div>
        ) : (
          <MessageInput 
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            isUploading={isUploading}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            handleFileSelect={handleFileSelect}
            clearPreview={clearPreview}
            handleTyping={() => {
              const socket = getSocket();
              if (!socket) return;
              
              const now = Date.now();
              // Emit typing event at most once every 3 seconds
              if (now - lastTypedTimeRef.current > 3000) {
                socket.emit("typing", { chatId: id });
                lastTypedTimeRef.current = now;
              }

              // Debounce stop_typing emission
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              
              typingTimeoutRef.current = setTimeout(() => {
                socket.emit("stop_typing", { chatId: id });
                lastTypedTimeRef.current = 0; // Reset typing time so next keystroke instantly emits
              }, 1500);
            }}
            replyingTo={replyingTo}
            clearReply={() => setReplyingTo(null)}
          />
        )}
      </div>

      {/* MODALS */}
      {isSearchOpen && (
        <MessageSearch 
          chatId={id} 
          onClose={() => setIsSearchOpen(false)} 
          onJumpToMessage={handleJumpToMessage} 
        />
      )}

      <GroupInfoModal 
        isOpen={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
        chat={activeChatData}
        currentUserId={currentUserId}
      />
      
      <UserInfoModal 
        isOpen={isUserInfoOpen}
        onClose={() => setIsUserInfoOpen(false)}
        chat={activeChatData}
        currentUserId={currentUserId}
        isBlockedByMe={isBlockedByMe}
        onToggleBlock={handleToggleBlock}
        onDeleteChat={handleDeleteChat}
      />

      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        onForwardConfirm={handleForwardConfirm}
      />

      <ConfirmDialog {...confirmState} onClose={closeConfirm} />
    </div>
  );

}
export default ChatView;
