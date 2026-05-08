import { useEffect, useState } from "react";
import ChatItem from "../components/chat/ChatItem"; 
import ChatListHeader from "../components/chat/ChatListHeader";
import CreateGroupModal from "../components/chat/CreateGroupModal";
import SearchUserModal from "../components/chat/SearchUserModal"; // 🛡️ Import Search Modal
import { getChats } from "../services/chat.api";
import { getSocket } from "../services/socket"; 

function ChatList() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // 🛡️ Search State
  
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

  // Handle both Group Creation and 1-on-1 Chat Creation
  const handleChatCreated = (newChat) => {
    setChats((prevChats) => {
      // Prevent duplicates if the user clicked an existing chat in search
      const exists = prevChats.find((c) => String(c._id) === String(newChat._id));
      if (exists) return prevChats;
      return [newChat, ...prevChats];
    });
  };

  return (
    <div className="h-full flex flex-col relative bg-surface border-r border-borderSubtle">
      <ChatListHeader 
        onOpenGroupModal={() => setIsGroupModalOpen(true)} 
        onOpenSearchModal={() => setIsSearchModalOpen(true)} 
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <p className="p-4 text-textMuted text-sm animate-pulse">Loading conversations...</p>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <span className="text-4xl mb-4">👋</span>
            <p className="text-textPrimary font-semibold mb-2">Welcome to PulseChat!</p>
            <p className="text-textMuted text-sm mb-6">You have no active conversations.</p>
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
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

      {/* 🛡️ Inject Search Modal */}
      <SearchUserModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}

export default ChatList;