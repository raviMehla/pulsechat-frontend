import { useEffect } from "react";
import { getSocket } from "../services/socket";
import { markChatAsRead } from "../services/message.api";
import { getUserStatus } from "../services/user.api";

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
  navigate
}) => {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Technical Standard 1(c) & 1(f): Room Management & Resilience
    const joinRoom = () => socket.emit("join_chat", chatId);
    
    joinRoom();
    socket.on("connect", joinRoom);

    // ==========================================
    // Real-Time Listeners
    // ==========================================
    const onMessageReceived = (msg) => {
      const msgChatId = msg.chat?._id || msg.chat;
      if (String(msgChatId) !== String(chatId)) return;

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(msg._id));
        return exists ? prev : [...prev, msg];
      });

      if (String(msg.sender?._id) !== String(currentUserId)) {
        markChatAsRead(chatId);
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
      setMessages((prev) => prev.map((m) => 
        String(m.sender?._id) === String(currentUserId) 
          ? { ...m, deliveredTo: [...(m.deliveredTo || []), userId] } 
          : m
      ));
    };

    const onMessagesRead = ({ chatId: eventChatId, userId }) => {
      if (String(eventChatId) !== String(chatId)) return;
      setMessages((prev) => prev.map((m) => 
        String(m.sender?._id) === String(currentUserId) 
          ? { ...m, readBy: [...(m.readBy || []), userId] } 
          : m
      ));
    };

    const onMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => 
        String(m._id) === String(messageId) ? { ...m, reactions } : m
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
    socket.on("group_updated",     onGroupUpdated); 
    socket.on("kicked_from_group", onKickedFromGroup); 

    // Cleanup
    return () => {
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
      socket.off("group_updated",    onGroupUpdated); 
      socket.off("kicked_from_group", onKickedFromGroup); 
    };
  }, [
    chatId, currentUserId, navigate, setMessages, setIsTyping, 
    setIsOnline, setChatName, setParticipantCount, setActiveChatData, otherUserIdRef
  ]); 
};