import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import UserInfoModal from "../components/chat/UserInfoModal";
import localforage from "localforage";
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
  const virtuosoRef = useRef(null);
  const isFetchingMoreRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypedTimeRef = useRef(0);
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
    // Reset initial loading state asynchronously to prevent ESLint cascading render warning
    Promise.resolve().then(() => {
      setIsInitialLoading(true);
    });

    const fetchMessages = async () => {
      try {
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

  // Persist messages to cache on any update (socket arrivals, reactions, deletions, retry queue updates)
  useEffect(() => {
    if (!isInitialLoading && id) {
      localforage.setItem(`messages_${id}`, {
        messages,
        nextCursor
      }).catch((err) => {
        console.error("Failed to persist messages to IndexedDB:", err);
      });
    }
  }, [messages, nextCursor, id, isInitialLoading]);

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
        const tempId = `temp-${Date.now()}`;
        const myUserString = localStorage.getItem("user");
        const myUserObj = myUserString ? JSON.parse(myUserString) : { _id: currentUserId, name: "Me" };
        
        const optimisticMsg = {
          _id: tempId,
          content: textToSend,
          sender: myUserObj,
          createdAt: new Date().toISOString(),
          messageType: "text",
          status: "pending",
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
    if (!isOnline) {
      toast.error(`${chatName} is offline`);
      return;
    }
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
