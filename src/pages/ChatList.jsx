import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatItem from "../components/chat/ChatItem"; 
import { getAvatarUrl } from "../utils/getAvatarUrl";
import ChatListHeader from "../components/chat/ChatListHeader";
import CreateGroupModal from "../components/chat/CreateGroupModal";
import SearchUserModal from "../components/chat/SearchUserModal"; 
import BroadcastListModal from "../components/chat/BroadcastListModal";
import { getChats } from "../services/chat.api";
import { getSocket } from "../services/socket"; 
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import localforage from "localforage"; 


function ChatList() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); 
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  const currentUserId = localStorage.getItem("userId");
  const location = useLocation();
  
  const activeChatRef = useRef(null);

  // Auto-scroll to active chat
  useEffect(() => {
    if (activeChatRef.current) {
      activeChatRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
      });
    }
  }, [location.pathname]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      callback: () => setIsSearchModalOpen(true)
    },
    {
      key: "k",
      meta: true,
      callback: () => setIsSearchModalOpen(true)
    },
    {
      key: "g",
      ctrl: true,
      callback: () => setIsGroupModalOpen(true)
    },
    {
      key: "g",
      meta: true,
      callback: () => setIsGroupModalOpen(true)
    }
  ]);


  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await getChats();
        const chatsData = Array.isArray(data) ? data : [];
        const broadcastLists = await localforage.getItem("broadcast_lists") || [];
        setChats([...broadcastLists, ...chatsData]);
        await localforage.setItem("chats", chatsData);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadCachedChats = async () => {
      try {
        const cachedChats = await localforage.getItem("chats");
        const broadcastLists = await localforage.getItem("broadcast_lists") || [];
        if (cachedChats && Array.isArray(cachedChats)) {
          setChats([...broadcastLists, ...cachedChats]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load cached chats:", error);
      }
      fetchChats();
    };

    loadCachedChats();

    // 🛡️ Page visibility auto-refresh catches up with background-throttled updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("🟢 Tab visible again. Fetching latest chats and checking socket connection...");
        fetchChats();
        const socket = getSocket();
        if (socket && socket.disconnected) {
          socket.connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Sync broadcast lists when modal is closed
  useEffect(() => {
    if (!isBroadcastModalOpen) {
      const syncBroadcasts = async () => {
        try {
          const broadcastLists = await localforage.getItem("broadcast_lists") || [];
          setChats((prev) => {
            const backendChats = prev.filter((c) => !c.isBroadcast);
            return [...broadcastLists, ...backendChats];
          });
        } catch (err) {
          console.error("Failed to sync broadcast lists:", err);
        }
      };
      syncBroadcasts();
    }
  }, [isBroadcastModalOpen]);

  // Persist local chats to cache on any update (socket arrivals, deletions, edits)
  useEffect(() => {
    if (!loading) {
      const backendChats = chats.filter(c => !c.isBroadcast);
      localforage.setItem("chats", backendChats).catch((err) => {
        console.error("Failed to persist chats to IndexedDB:", err);
      });
    }
  }, [chats, loading]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Extract active chatId from URL path if any
    const activeChatId = location.pathname.startsWith("/chat/") 
      ? location.pathname.split("/chat/")[1] 
      : null;

    const handleNewMessage = (newMessage) => {
      setChats((prevChats) => {
        const chatId = String(newMessage.chat._id || newMessage.chat);
        const chatExists = prevChats.find((c) => String(c._id) === chatId);
        const isCurrentChat = activeChatId === chatId;

        if (chatExists) {
          const updatedChat = { 
            ...chatExists, 
            lastMessage: newMessage,
            unreadCount: isCurrentChat ? 0 : (chatExists.unreadCount || 0) + 1
          };
          return [updatedChat, ...prevChats.filter((c) => String(c._id) !== chatId)];
        } else if (newMessage.chat && typeof newMessage.chat === "object") {
          const newChat = { 
            ...newMessage.chat, 
            lastMessage: newMessage,
            unreadCount: isCurrentChat ? 0 : 1
          };
          return [newChat, ...prevChats];
        }
        return prevChats;
      });
    };

    const handleGroupUpdated = (updatedChat) => {
      setChats((prevChats) =>
        prevChats.map((c) =>
          String(c._id) === String(updatedChat._id)
            ? { ...c, ...updatedChat }
            : c
        )
      );
    };

    const handleGroupDeletedOrKicked = ({ chatId: eventChatId }) => {
      setChats((prevChats) => prevChats.filter((c) => String(c._id) !== String(eventChatId)));
    };

    socket.on("message_received", handleNewMessage);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("group_deleted", handleGroupDeletedOrKicked);
    socket.on("kicked_from_group", handleGroupDeletedOrKicked);
    socket.on("chat_terminated", handleGroupDeletedOrKicked);

    return () => {
      socket.off("message_received", handleNewMessage);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("group_deleted", handleGroupDeletedOrKicked);
      socket.off("kicked_from_group", handleGroupDeletedOrKicked);
      socket.off("chat_terminated", handleGroupDeletedOrKicked);
    };
  }, [location.pathname]);

  const handleChatCreated = (newChat) => {
    setChats((prevChats) => {
      const exists = prevChats.find((c) => String(c._id) === String(newChat._id));
      if (exists) return prevChats;
      return [newChat, ...prevChats];
    });
  };

  const getLastMessagePreview = (lastMessage) => {
    if (!lastMessage) return "No messages yet";
    const isMe = String(lastMessage.sender?._id || lastMessage.sender) === String(currentUserId);
    const prefix = isMe ? "You: " : "";
    if (lastMessage.isDeleted) return `${prefix}This message was deleted`;
    switch (lastMessage.messageType) {
      case "image":
        return `${prefix}📷 Photo`;
      case "video":
        return `${prefix}🎥 Video`;
      case "file":
        return `${prefix}📎 File`;
      case "system":
        return lastMessage.content || "";
      default:
        return `${prefix}${lastMessage.content || ""}`;
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-surface border-r border-borderSubtle">
      
      <ChatListHeader 
        onOpenGroupModal={() => setIsGroupModalOpen(true)} 
        onOpenSearchModal={() => setIsSearchModalOpen(true)} 
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 space-y-4">
            {/* Noir Glass Skeleton Loaders */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-borderSubtle rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-borderSubtle rounded w-1/3"></div>
                  <div className="h-2 bg-borderSubtle rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <span className="text-4xl mb-4">👋</span>
            <p className="text-textPrimary font-semibold mb-2">Welcome to PulseChat!</p>
            <p className="text-textMuted text-sm mb-6">You have no active conversations.</p>
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-accent hover:bg-accentHover text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Find someone to chat with
            </button>
          </div>
        ) : (
          chats.map((chat) => {
            // 🛡️ HARD-DELETE RESILIENCE: Guard against null entries in chat.users.
            // Mongoose sets populated references to null when the source document is gone.
            const otherUser = (chat.isGroup || chat.isBroadcast)
              ? null
              : chat.users.find(u => u && String(u._id) !== String(currentUserId));

            const isDeletedAccount = !chat.isGroup && !chat.isBroadcast && (chat.otherUserDeleted || !otherUser);

            const chatName = chat.isBroadcast
              ? `📢 ${chat.chatName}`
              : (chat.isGroup
                ? chat.chatName
                : (otherUser?.name || otherUser?.username || "Deleted Account"));

            const chatImage = chat.isBroadcast ? null : (chat.isGroup ? getAvatarUrl(chat.groupAvatar) : getAvatarUrl(otherUser?.profilePic));
            const isActive = location.pathname.includes(chat._id);

            return (
              <div
                key={chat._id}
                ref={isActive ? activeChatRef : null}
              >
                <ChatItem
                  chat={{
                    id: chat._id,
                    isGroup: chat.isGroup,
                    isBroadcast: chat.isBroadcast,
                    name: chatName,
                    image: chatImage,
                    lastMessage: getLastMessagePreview(chat.lastMessage),
                    time: chat.lastMessage?.createdAt 
                      ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : "",
                    unread: chat.unreadCount || 0,
                    isDeletedAccount,
                  }}
                />
              </div>
            );
          })

        )}
      </div>

      <CreateGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={handleChatCreated}
      />

      <SearchUserModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onChatCreated={handleChatCreated}
      />

      <BroadcastListModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSelectBroadcast={(list) => navigate(`/chat/${list._id}`)}
      />
    </div>
  );
}

export default ChatList;
