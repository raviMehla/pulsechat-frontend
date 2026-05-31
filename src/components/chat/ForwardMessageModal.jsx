import { useState, useEffect } from "react";
import localforage from "localforage";
import api from "../../services/api";
import toast from "react-hot-toast";

function ForwardMessageModal({ isOpen, message, onClose, onForwardConfirm }) {
  const [chats, setChats] = useState([]);
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadChats = async () => {
      try {
        const cachedChats = await localforage.getItem("chats");
        if (cachedChats && Array.isArray(cachedChats)) {
          setChats(cachedChats);
        } else {
          const res = await api.get("/chat");
          setChats(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load chats for forwarding:", err);
      }
    };
    loadChats();
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.chatName;
    const currentUserId = localStorage.getItem("userId");
    const otherUser = chat.users?.find(u => String(u._id || u) !== String(currentUserId));
    return otherUser?.name || "Unknown User";
  };

  const getChatUsername = (chat) => {
    if (chat.isGroup) return `Group • ${chat.users?.length || 0} members`;
    const currentUserId = localStorage.getItem("userId");
    const otherUser = chat.users?.find(u => String(u._id || u) !== String(currentUserId));
    return otherUser?.username ? `@${otherUser.username}` : "";
  };

  const toggleSelectChat = (chatId) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId) 
        : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChatIds.length === 0) return;
    try {
      setIsForwarding(true);
      await onForwardConfirm(selectedChatIds, message);
      setSelectedChatIds([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      console.error("Failed to forward:", err);
      toast.error("Forwarding failed");
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const name = getChatName(chat).toLowerCase();
    const username = getChatUsername(chat).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        <h2 className="text-xl font-bold text-textPrimary mb-4">Forward Message</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-gray-700 rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
            autoFocus
          />
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-surface border border-gray-800 rounded-md shadow-inner mb-4 max-h-60 custom-scrollbar">
          {filteredChats.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">No chats found.</p>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChatIds.includes(chat._id);
              return (
                <div 
                  key={chat._id}
                  onClick={() => toggleSelectChat(chat._id)}
                  className="p-3 hover:bg-gray-800 cursor-pointer flex items-center justify-between border-b border-gray-800/50 last:border-0 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-textPrimary font-medium truncate">{getChatName(chat)}</span>
                    <span className="text-xs text-gray-500 truncate">{getChatUsername(chat)}</span>
                  </div>
                  
                  {/* Custom Checkbox */}
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    isSelected 
                      ? "bg-accent border-accent text-white" 
                      : "border-gray-600 hover:border-accent"
                  }`}>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <button 
            onClick={onClose} 
            disabled={isForwarding}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedChatIds.length === 0 || isForwarding}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-accent text-white hover:bg-accent/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isForwarding ? "Forwarding..." : `Forward (${selectedChatIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForwardMessageModal;
