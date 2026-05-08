import { useEffect, useState } from "react";
import ChatItem from "../components/chat/ChatItem"; 
import ChatListHeader from "../components/chat/ChatListHeader";
import CreateGroupModal from "../components/chat/CreateGroupModal";
import SearchUserModal from "../components/chat/SearchUserModal"; 
import { getChats } from "../services/chat.api";
import { getSocket } from "../services/socket"; 

function ChatList() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); 
  
  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await getChats();
        setChats(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      setChats((prevChats) => {
        const chatId = String(newMessage.chat._id || newMessage.chat);
        const chatExists = prevChats.find((c) => String(c._id) === chatId);

        if (chatExists) {
          const updatedChat = { ...chatExists, lastMessage: newMessage };
          return [updatedChat, ...prevChats.filter((c) => String(c._id) !== chatId)];
        }
        return prevChats;
      });
    };

    socket.on("message_received", handleNewMessage);
    return () => socket.off("message_received", handleNewMessage);
  }, []);

  const handleChatCreated = (newChat) => {
    setChats((prevChats) => {
      const exists = prevChats.find((c) => String(c._id) === String(newChat._id));
      if (exists) return prevChats;
      return [newChat, ...prevChats];
    });
  };

  return (
    <div className="h-full flex flex-col relative bg-surface border-r border-borderSubtle">
      
      {/* 🛡️ ARCHITECTURAL UPGRADE: Native Mobile App Header */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-background border-b border-borderSubtle z-20 shadow-sm">
        <h1 className="text-xl font-bold text-textPrimary tracking-tight flex items-center gap-3">
          <div className="w-8 h-8 bg-accent text-white rounded-lg flex items-center justify-center font-bold shadow-md">
            P
          </div>
          PulseChat
        </h1>
      </div>

      <ChatListHeader 
        onOpenGroupModal={() => setIsGroupModalOpen(true)} 
        onOpenSearchModal={() => setIsSearchModalOpen(true)} 
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
            const otherUser = chat.isGroup ? null : chat.users.find(u => String(u._id) !== String(currentUserId));
            const chatName = chat.isGroup ? chat.chatName : (otherUser?.name || otherUser?.username || "User");
            const chatImage = chat.isGroup ? chat.groupAvatar : otherUser?.profilePic; 

            return (
              <ChatItem
                key={chat._id}
                chat={{
                  id: chat._id,
                  isGroup: chat.isGroup,
                  name: chatName,
                  image: chatImage,
                  lastMessage: chat.lastMessage?.content || (chat.lastMessage?.messageType === "image" ? "📷 Image" : "No messages yet"),
                  time: chat.lastMessage?.createdAt 
                    ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "",
                  unread: chat.unreadCount || 0 
                }}
              />
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
    </div>
  );
}

export default ChatList;