import { useState } from "react";
import { searchUsers } from "../../services/user.api";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function SearchUserModal({ isOpen, onClose, onChatCreated }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async (userId) => {
    try {
      // Direct API call to access/create the 1-on-1 chat
      const response = await api.post("/chat", { userId });
      
      // Inject the new/existing chat into the ChatList state
      onChatCreated(response.data);
      
      // Navigate directly into the chat room
      navigate(`/chat/${response.data._id}`);
      
      // Clean up
      setSearchQuery("");
      setSearchResults([]);
      onClose();
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert(error.response?.data?.message || "Could not start chat");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-textPrimary mb-4">Find Someone to Chat With</h2>
        
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by name, email, username, or phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-surface border border-gray-700 rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
            autoFocus
          />
          {isSearching && (
            <span className="absolute right-3 top-2.5 text-xs text-accent animate-pulse">
              Searching...
            </span>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto bg-surface border border-gray-800 rounded-md shadow-inner">
          {searchResults.length === 0 && searchQuery && !isSearching && (
             <p className="p-4 text-center text-sm text-gray-500">No users found.</p>
          )}
          {searchResults.map((user) => (
            <div 
              key={user._id}
              onClick={() => handleStartChat(user._id)}
              className="p-3 hover:bg-gray-800 cursor-pointer flex items-center justify-between border-b border-gray-800/50 last:border-0 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm text-textPrimary font-medium">{user.name}</span>
                <span className="text-xs text-gray-500">@{user.username} • {user.phone || user.email}</span>
              </div>
              <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">Chat</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchUserModal;