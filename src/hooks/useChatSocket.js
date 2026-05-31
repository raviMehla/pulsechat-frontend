import { useEffect, useRef } from "react";
import { getSocket } from "../services/socket";
import { markChatAsRead } from "../services/message.api";
import { getUserStatus } from "../services/user.api";
import toast from "react-hot-toast";

export const useChatSocket = ({
  chatId,
  currentUserId,
  otherUserIdRef,
  setMessages,
  setIsTyping,
  setIsOnline,
  setChatName,
  setParticipantCount,
  setActiveChatData,
  navigate,
  decryptMessagePayload
}) => {
  const readReceiptTimeoutRef = useRef(null);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Technical Standard 1(c) & 1(f): Room Management & Resilience
    const joinRoom = () => {
      if (chatId && !chatId.startsWith("broadcast_")) {
        socket.emit("join_chat", chatId);
      }
    };
    
    joinRoom();
    socket.on("connect", joinRoom);

    // ==========================================
    // Real-Time Listeners
    // ==========================================
    const onMessageReceived = async (msg) => {
      const msgChatId = msg.chat?._id || msg.chat;
      if (String(msgChatId) !== String(chatId)) return;

      // Decrypt message client-side
      const decryptedMsg = await decryptMessagePayload(msg);

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(decryptedMsg._id));
        if (exists) return prev;

        // 🛡️ Optimistic UI Deduplication: If the message is from ourselves, see if we can replace a pending message
        const senderId = decryptedMsg.sender?._id || decryptedMsg.sender;
        if (String(senderId) === String(currentUserId)) {
          const pendingIdx = prev.findIndex(m => m.status === "pending" && m.content === decryptedMsg.content);
          if (pendingIdx !== -1) {
            return prev.map((m, idx) => idx === pendingIdx ? decryptedMsg : m);
          }
        }
        return [...prev, decryptedMsg];
      });

      if (String(decryptedMsg.sender?._id) !== String(currentUserId)) {
        if (readReceiptTimeoutRef.current) {
          clearTimeout(readReceiptTimeoutRef.current);
        }
        readReceiptTimeoutRef.current = setTimeout(() => {
          markChatAsRead(chatId);
          readReceiptTimeoutRef.current = null;
        }, 500); // 🛡️ Debounce 500ms
      }
    };

    const onTyping = ({ userId }) => {
      if (String(userId) !== String(currentUserId)) setIsTyping(true);
    };

    const onStopTyping = ({ userId }) => {
      if (String(userId) !== String(currentUserId)) setIsTyping(false);
    };

    const onUserOnline = (userId) => {
      if (String(userId) === String(otherUserIdRef.current)) setIsOnline(true);
    };

    const onUserOffline = (userId) => {
      if (String(userId) === String(otherUserIdRef.current)) {
        setTimeout(() => setIsOnline(false), 800);
      }
    };

    const onReconnect = async () => {
      joinRoom();
      const otherId = otherUserIdRef.current;
      if (!otherId) return;
      try {
        const data = await getUserStatus(otherId);
        setIsOnline(data.isOnline);
      } catch (err) {
        console.error("Reconnect status fetch error:", err);
      }
    };

    const onMessagesDelivered = ({ chatId: eventChatId, userId }) => {
      if (String(eventChatId) !== String(chatId)) return;
      // Only update messages sent by ME (the current user) — not messages by others
      // Also skip if userId is the current user themselves (sender joined their own room)
      if (String(userId) === String(currentUserId)) return;
      setMessages((prev) => prev.map((m) => {
        if (String(m.sender?._id || m.sender) !== String(currentUserId)) return m;
        // Don't append if already delivered to this user
        const alreadyDelivered = (m.deliveredTo || []).some(d => String(d) === String(userId));
        if (alreadyDelivered) return m;
        return { ...m, deliveredTo: [...(m.deliveredTo || []), userId] };
      }));
    };

    const onMessagesRead = ({ chatId: eventChatId, userId }) => {
      if (String(eventChatId) !== String(chatId)) return;
      if (String(userId) === String(currentUserId)) return;
      setMessages((prev) => prev.map((m) => {
        if (String(m.sender?._id || m.sender) !== String(currentUserId)) return m;
        const alreadyRead = (m.readBy || []).some(r => String(r) === String(userId));
        if (alreadyRead) return m;
        return { ...m, readBy: [...(m.readBy || []), userId] };
      }));
    };

    const onMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) ? { ...m, reactions } : m
      ));
    };

    const onMessageEdited = ({ messageId, content }) => {
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) ? { ...m, content, isEdited: true, editedAt: new Date() } : m
      ));
    };

    const onMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) ? { ...m, isPinned } : m
      ));
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) 
          ? { ...m, isDeleted: true, content: "", fileUrl: null, fileName: null, reactions: [] } 
          : m
      ));
    };

    const onGroupUpdated = (updatedChat) => {
      if (String(updatedChat._id) !== String(chatId)) return;
      setChatName(updatedChat.chatName);
      setParticipantCount(updatedChat.users?.length || 0);
      setActiveChatData(updatedChat);
    };

    const onKickedFromGroup = ({ chatId: eventChatId }) => {
      if (String(eventChatId) === String(chatId)) {
        alert("You have been removed from this group by the admin.");
        navigate("/"); 
      }
    };

    const onGroupDeleted = ({ chatId: eventChatId }) => {
      if (String(eventChatId) === String(chatId)) {
        alert("This group has been deleted by the admin.");
        navigate("/"); 
      }
    };

    const onAdminRevoked = ({ chatId: eventChatId }) => {
      if (String(eventChatId) === String(chatId)) {
        toast.error("Your admin privileges for this group have been revoked.");
      }
    };

    // Register Listeners
    socket.on("message_received",  onMessageReceived);
    socket.on("typing",            onTyping);
    socket.on("stop_typing",       onStopTyping);
    socket.on("user_online",       onUserOnline);
    socket.on("user_offline",      onUserOffline);
    socket.on("connect",           onReconnect);
    socket.on("messages_delivered", onMessagesDelivered);
    socket.on("messages_read",      onMessagesRead);
    socket.on("message_reacted",   onMessageReacted);
    socket.on("message_deleted",   onMessageDeleted);
    socket.on("message_edited",    onMessageEdited);
    socket.on("message_pinned",    onMessagePinned);
    socket.on("group_updated",     onGroupUpdated); 
    socket.on("kicked_from_group", onKickedFromGroup); 
    socket.on("group_deleted",     onGroupDeleted); 
    socket.on("chat_terminated",   onGroupDeleted);
    socket.on("admin_revoked",     onAdminRevoked);

    // Cleanup
    return () => {
      if (chatId && !chatId.startsWith("broadcast_")) {
        socket.emit("leave_chat", chatId); // 🛡️ Prevent ghost room emissions
      }

      if (readReceiptTimeoutRef.current) {
        clearTimeout(readReceiptTimeoutRef.current);
        readReceiptTimeoutRef.current = null;
      }

      socket.off("connect",          joinRoom);
      socket.off("connect",          onReconnect);
      socket.off("message_received", onMessageReceived);
      socket.off("typing",           onTyping);
      socket.off("stop_typing",      onStopTyping);
      socket.off("user_online",      onUserOnline);
      socket.off("user_offline",     onUserOffline);
      socket.off("messages_delivered", onMessagesDelivered);
      socket.off("messages_read",      onMessagesRead);
      socket.off("message_reacted",  onMessageReacted);
      socket.off("message_deleted",  onMessageDeleted);
      socket.off("message_edited",   onMessageEdited);
      socket.off("message_pinned",   onMessagePinned);
      socket.off("group_updated",    onGroupUpdated); 
      socket.off("kicked_from_group", onKickedFromGroup); 
      socket.off("group_deleted",     onGroupDeleted); 
      socket.off("chat_terminated",  onGroupDeleted);
      socket.off("admin_revoked",    onAdminRevoked);
    };
  }, [
    chatId, currentUserId, navigate, setMessages, setIsTyping, 
    setIsOnline, setChatName, setParticipantCount, setActiveChatData, otherUserIdRef,
    decryptMessagePayload
  ]); 
};