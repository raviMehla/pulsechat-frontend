import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import api from "../services/api";
import UserInfoModal from "../components/chat/UserInfoModal";
import { 
  getMessages, 
  sendMessage, 
  markChatAsRead, 
  sendMedia, 
  reactToMessage, 
  deleteMessage, 
  fetchMessageContext 
} from "../services/message.api";
import { getSocket } from "../services/socket";
import { getUserStatus, getMyProfile, toggleBlockUser } from "../services/user.api";
import { getChats } from "../services/chat.api";
import { useChatSocket } from "../hooks/useChatSocket"; 
import { MessageSkeleton } from "../components/chat/MessageSkeleton";
import { useChat } from "../context/ChatContext";
import { useCall } from "../context/CallContext";

import toast from "react-hot-toast";

import ChatHeader from "../components/chat/ChatHeader";
import MessageBubble from "../components/chat/MessageBubble";
import MessageInput from "../components/chat/MessageInput";
import MessageSearch from "../components/chat/MessageSearch";
import GroupInfoModal from "../components/chat/GroupInfoModal";

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);
  const isFetchingMoreRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypedTimeRef = useRef(0);
  const scrollHeightBeforeRef = useRef(0);
  const uploadAbortControllerRef = useRef(null);
  const [chatImage, setChatImage] = useState(null);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const { startCall } = useCall();

  const otherUserIdRef = useRef(null);

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
    const fetchMessages = async () => {
      try {
        setIsInitialLoading(true);
        const data = await getMessages(id);
        setMessages(data.messages || []);
        setNextCursor(data.nextCursor || null); // 🛡️ Capture cursor
        await markChatAsRead(id);
      } catch (err) {
        console.error("Messages fetch error:", err);
      } finally {
        setIsInitialLoading(false); // 🛡️ End skeleton
      }
    };
    fetchMessages();
  }, [id]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const chats = await getChats();
        if (!Array.isArray(chats)) return;

        const currentChat = chats.find((c) => c._id === id);
        if (!currentChat) return;

        setIsGroup(currentChat.isGroup || false);

        if (currentChat.isGroup) {
          setChatName(currentChat.chatName || "Group");
          setParticipantCount(currentChat.users?.length || 0);
          setActiveChatData(currentChat);
          setChatImage(currentChat.groupAvatar || null);
          return;
        }

        const other = currentChat.users.find((u) => u._id !== currentUserId);
        if (!other) return;

        setChatName(other.name || other.username || "User");
        otherUserIdRef.current = other._id;
        setChatImage(other.profilePic || null);
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
      
      const container = scrollContainerRef.current;
      scrollHeightBeforeRef.current = container ? container.scrollHeight : 0;

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

  useLayoutEffect(() => {
    if (scrollHeightBeforeRef.current > 0 && scrollContainerRef.current) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      scrollContainerRef.current.scrollTop = newScrollHeight - scrollHeightBeforeRef.current;
      scrollHeightBeforeRef.current = 0;
    }
  }, [messages]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isFetchingMoreRef.current && !isInitialLoading) {
          loadMoreMessages();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    
    return () => observer.disconnect();
  }, [nextCursor, isInitialLoading, loadMoreMessages]);

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

  // 🛡️ Abort active media uploads on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
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
      if (selectedFile) {
        setIsUploading(true);
        const controller = new AbortController();
        uploadAbortControllerRef.current = controller;

        await sendMedia(id, selectedFile, replyingTo?._id, controller.signal);
        clearPreview();
      } else {
        if (!input.trim()) return;
        await sendMessage({ content: input, chatId: id, replyTo: replyingTo?._id || null });
        setInput("");
      }
      
      setReplyingTo(null); 
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

  const handleReaction = async (messageId, emoji) => { 
    await reactToMessage(messageId, emoji); 
  };
  
  const handleDelete = async (messageId) => { 
    await deleteMessage(messageId); 
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

  const handleDeleteChat = async () => {
  if (window.confirm("Are you sure you want to permanently delete this entire chat from your device?")) {
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
};

  const handleInitiateCall = (type = "audio") => {
    if (!otherUserIdRef.current) return;
    startCall(otherUserIdRef.current, type, chatName, chatImage, id);
  };
 
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
          chatImage={chatImage}
          participantCount={participantCount}
          onSearchClick={() => setIsSearchOpen(!isSearchOpen)} 
          onInfoClick={() => {
            isGroup ? setIsGroupInfoOpen(true) : setIsUserInfoOpen(true);
          }}
          onCallClick={() => handleInitiateCall("audio")}
          onVideoCallClick={() => handleInitiateCall("video")}
        />
      </div>

      {/* 2. FIXED TYPING INDICATOR */}
      {isTyping && (
        <div className="flex-none px-4 py-1.5 text-xs font-medium text-accent animate-pulse bg-surface/50 border-b border-borderSubtle z-20">
          {chatName} is typing...
        </div>
      )}
      
      {/* 3. SCROLLABLE MESSAGE LIST: Perfectly isolated between the top and bottom */}
      <div ref={scrollContainerRef} id="chat-scroll-container" className="flex-1 overflow-y-auto p-4 space-y-0 relative custom-scrollbar flex flex-col w-full" >
        
        {isInitialLoading ? (
          <MessageSkeleton />
        ) : (
          <>
            {nextCursor && (
               <div ref={observerTarget} className="w-full h-10 flex flex-none items-center justify-center my-2">
                  {isFetchingMore && <span className="text-xs font-medium text-accent animate-pulse">Loading history...</span>}
               </div>
            )}

            {isViewingHistory && (
              <div className="sticky top-2 z-10 flex justify-center mb-4">
                <button 
                  onClick={handleJumpToPresent}
                  className="bg-surface border border-borderSubtle text-textPrimary px-4 py-1.5 rounded-full text-sm font-medium shadow-md hover:bg-background transition-colors flex items-center gap-2"
                >
                  ⬇️ Jump to Present
                </button>
              </div>
            )}

            {Array.isArray(messages) && messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

              const senderId = msg.sender?._id || msg.sender;
              const prevSenderId = prevMsg ? (prevMsg.sender?._id || prevMsg.sender) : null;
              const nextSenderId = nextMsg ? (nextMsg.sender?._id || nextMsg.sender) : null;

              const TWO_MINUTES = 2 * 60 * 1000;
              const timeDiffPrev = prevMsg && msg.createdAt ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : 0;
              const timeDiffNext = nextMsg && msg.createdAt ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() : 0;

              const isFirstInGroup = !prevMsg || senderId !== prevSenderId || timeDiffPrev > TWO_MINUTES;
              const isLastInGroup = !nextMsg || senderId !== nextSenderId || timeDiffNext > TWO_MINUTES;

              return (
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
                />
              );
            })}
          </>
        )}
      </div>
        
      {/* 4. FIXED INPUT AREA: Locked tightly to the bottom */}
      <div className="flex-none z-30 bg-surface">
        {isBlockedByMe ? (
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
    </div>
  );
}
export default ChatView;
