import { useState } from "react";
import { searchUsers } from "../../services/user.api";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

function SearchUserModal({ isOpen, onClose, onChatCreated }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const navigate = useNavigate();

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery.trim());

  const handleInviteEmail = async () => {
    try {
      setIsInviting(true);
      await api.post("/users/invite", { email: searchQuery.trim() });
      toast.success(`Invitation email sent to ${searchQuery.trim()}!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleShareInvite = () => {
    const inviteMessage = `Hey, join me on PulseChat! It's a secure real-time messaging app. Register here: https://go-pulsechat.vercel.app/landing`;
    if (navigator.share) {
      navigator.share({
        title: 'Join PulseChat',
        text: inviteMessage,
        url: `https://go-pulsechat.vercel.app/landing`
      }).then(() => {
        toast.success("Shared invitation!");
      }).catch((err) => {
        console.log("Error sharing:", err);
      });
    } else {
      navigator.clipboard.writeText(inviteMessage);
      toast.success("Invitation link copied to clipboard!");
    }
  };

  // Escape key light-dismiss
  useKeyboardShortcuts([
    { key: "Escape", callback: onClose }
  ]);

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
      toast.error(error.response?.data?.message || "Could not start chat");
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
             <div className="p-4 text-center">
               <p className="text-sm text-gray-500 mb-3">No users found.</p>
               {isEmail && (
                 <button
                   onClick={handleInviteEmail}
                   disabled={isInviting}
                   className="w-full bg-accent/20 hover:bg-accent/30 text-accent font-semibold py-2 px-4 rounded-md text-xs border border-accent/30 transition-colors mb-2 disabled:opacity-50"
                 >
                   {isInviting ? "Sending Invite..." : `Invite ${searchQuery.trim()} via Email`}
                 </button>
               )}
               <button
                 onClick={handleShareInvite}
                 className="w-full bg-gray-800 hover:bg-gray-700 text-textPrimary font-semibold py-2 px-4 rounded-md text-xs border border-gray-700 transition-colors"
               >
                 Share Invite Link
               </button>
             </div>
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