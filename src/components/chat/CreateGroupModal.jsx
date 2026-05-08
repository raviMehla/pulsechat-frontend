import { useState } from "react";
import { createPortal } from "react-dom"; // 🛡️ ARCHITECTURAL UPGRADE
import { createGroupChat } from "../../services/chat.api";
import { searchUsers } from "../../services/user.api";

function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  // =====================================
  // HANDLERS
  // =====================================
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

  const handleSelectUser = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) return;
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) {
      alert("Please provide a group name and select at least 1 user.");
      return;
    }
    try {
      setIsLoading(true);
      const userIds = selectedUsers.map(u => u._id);
      const newGroup = await createGroupChat(groupName, userIds);
      onGroupCreated(newGroup);
      setGroupName("");
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
      onClose();
    } catch (error) {
      console.error("Failed to create group:", error);
      alert(error.response?.data?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // RENDER (Wrapped in a React Portal)
  // =====================================
  return createPortal(
    // 🛡️ Raised to z-[100] to ensure absolute dominance over all app layers
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-textPrimary mb-4">Create Group Chat</h2>
        
        {/* Group Name Input */}
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full bg-surface border border-gray-700 rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors mb-4"
        />

        {/* Selected Users Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedUsers.map(user => (
            <span key={user._id} className="bg-accent/20 text-accent px-2 py-1 rounded-md text-xs flex items-center gap-1">
              {user.name}
              <button onClick={() => handleRemoveUser(user._id)} className="hover:text-white ml-1 font-bold">×</button>
            </span>
          ))}
        </div>

        {/* User Search Input */}
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-surface border border-gray-700 rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
          />
          {isSearching && (
            <span className="absolute right-3 top-2.5 text-xs text-accent animate-pulse">
              Searching...
            </span>
          )}
        </div>

        {/* Search Results Dropdown/List */}
        {searchResults.length > 0 && (
          <div className="max-h-40 overflow-y-auto bg-surface border border-gray-800 rounded-md mb-4 shadow-inner">
            {searchResults.map((user) => {
              if (selectedUsers.some((u) => u._id === user._id)) return null;
              return (
                <div 
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="p-2 hover:bg-gray-800 cursor-pointer flex flex-col border-b border-gray-800/50 last:border-0 transition-colors"
                >
                  <span className="text-sm text-textPrimary font-medium">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>,
    document.body // 🛡️ Injects HTML directly into the root body tag
  );
}

export default CreateGroupModal;