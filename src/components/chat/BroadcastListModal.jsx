import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FocusLock from "react-focus-lock";
import localforage from "localforage";
import { searchUsers } from "../../services/user.api";
import toast from "react-hot-toast";

function BroadcastListModal({ isOpen, onClose, onSelectBroadcast }) {
  const [lists, setLists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadLists = async () => {
    try {
      const stored = await localforage.getItem("broadcast_lists");
      setLists(stored || []);
    } catch (err) {
      console.error("Failed to load broadcast lists:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLists();
      setIsCreating(false);
      setName("");
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

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

  const handleCreateList = async () => {
    if (!name.trim() || selectedUsers.length < 1) {
      toast.error("Please provide a list name and select at least 1 recipient.");
      return;
    }
    try {
      const newList = {
        _id: `broadcast_${Date.now()}`,
        chatName: name.trim(),
        users: selectedUsers,
        isGroup: false, // Treated as a special broadcast list
        isBroadcast: true,
        createdAt: new Date().toISOString()
      };
      const updated = [newList, ...lists];
      await localforage.setItem("broadcast_lists", updated);
      setLists(updated);
      setIsCreating(false);
      setName("");
      setSelectedUsers([]);
      toast.success("Broadcast list created");
      if (onSelectBroadcast) {
        onSelectBroadcast(newList);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create broadcast list:", err);
      toast.error("Error creating broadcast list");
    }
  };

  const handleDeleteList = async (e, listId) => {
    e.stopPropagation();
    try {
      const updated = lists.filter(l => l._id !== listId);
      await localforage.setItem("broadcast_lists", updated);
      setLists(updated);
      toast.success("Broadcast list deleted");
    } catch (err) {
      console.error("Failed to delete broadcast list:", err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <FocusLock>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-surface border border-borderSubtle rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[60vh] max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-borderSubtle">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-1.5">
              <span>📢</span> Broadcast Lists
            </h2>
            <div className="flex items-center gap-3">
              {!isCreating && (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="text-xs text-accent hover:text-accent/80 font-semibold px-2 py-0.5 rounded border border-accent/20 hover:bg-accent/5 transition-all"
                >
                  Create New
                </button>
              )}
              <button onClick={onClose} className="text-textMuted hover:text-white text-xl font-bold p-1">×</button>
            </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-background/50">
            {isCreating ? (
              <div className="flex flex-col gap-4">
                {/* List Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-textPrimary mb-1">List Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Work Announcements"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface border border-borderSubtle rounded-md py-2 px-3 text-xs text-textPrimary outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Selected Users Chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-surface/50 border border-borderSubtle rounded-lg">
                    {selectedUsers.map(user => (
                      <span key={user._id} className="bg-accent/15 text-accent px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                        {user.name}
                        <button onClick={() => handleRemoveUser(user._id)} className="hover:text-white ml-1 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User Search Input */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-textPrimary mb-1">Add Recipients</label>
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-surface border border-borderSubtle rounded-md py-2 px-3 text-xs text-textPrimary outline-none focus:border-accent transition-colors"
                  />
                  {isSearching && (
                    <span className="absolute right-3 top-7 text-[10px] text-accent animate-pulse">
                      Searching...
                    </span>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-surface border border-borderSubtle rounded-md shadow-inner">
                    {searchResults.map((user) => {
                      if (selectedUsers.some((u) => u._id === user._id)) return null;
                      return (
                        <div 
                          key={user._id}
                          onClick={() => handleSelectUser(user)}
                          className="p-2 hover:bg-background cursor-pointer flex flex-col border-b border-borderSubtle/50 last:border-0 transition-colors text-left"
                        >
                          <span className="text-xs text-textPrimary font-semibold">{user.name}</span>
                          <span className="text-[10px] text-textMuted">@{user.username}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4">
                  <button 
                    onClick={() => setIsCreating(false)} 
                    className="px-3 py-1.5 text-xs text-textMuted hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleCreateList} 
                    className="px-4 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent/80 transition-colors font-semibold"
                  >
                    Create List
                  </button>
                </div>
              </div>
            ) : lists.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-textMuted gap-2">
                <span className="text-3xl">📢</span>
                <p className="text-sm font-medium">No broadcast lists yet</p>
                <p className="text-xs max-w-xs text-center leading-relaxed">
                  Create broadcast lists to send announcements to multiple recipients individually at once.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {lists.map((list) => (
                  <div
                    key={list._id}
                    onClick={() => {
                      if (onSelectBroadcast) {
                        onSelectBroadcast(list);
                        onClose();
                      }
                    }}
                    className="p-3 bg-surface hover:bg-surface/85 border border-borderSubtle hover:border-accent/20 rounded-xl cursor-pointer transition-all flex items-center justify-between select-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent/15 border border-accent/20 rounded-full flex items-center justify-center text-accent text-lg">
                        📢
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-textPrimary">{list.chatName}</span>
                        <span className="text-[10px] text-textMuted mt-0.5">
                          {list.users?.length || 0} recipients
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteList(e, list._id)}
                      className="text-[10px] text-textMuted hover:text-danger p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete List"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FocusLock>,
    document.body
  );
}

export default BroadcastListModal;
