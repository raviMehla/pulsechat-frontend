import { useState, useEffect } from "react";
import { searchUsers } from "../../services/user.api";
import { 
  updateGroupDetails, // 🛡️ Ensure you create this API wrapper!
  addUserToGroup, 
  removeUserFromGroup, 
  leaveGroupChat 
} from "../../services/chat.api";
import { Avatar } from "../ui/Avatar"; // 🛡️ Utilizing our standard primitive

function GroupInfoModal({ isOpen, onClose, chat, currentUserId }) {
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state when the chat prop updates via sockets
  useEffect(() => {
    if (chat) {
      setGroupName(chat.chatName || "");
      setGroupDesc(chat.description || ""); // Assuming 'description' is in your DB schema
    }
  }, [chat]);

  if (!isOpen || !chat) return null;

  // 🛡️ Strict Identity Check
  const isAdmin = String(chat.groupAdmin?._id || chat.groupAdmin) === String(currentUserId);

  // =====================================
  // HANDLERS
  // =====================================
  const handleUpdateDetails = async () => {
    if (!groupName.trim()) return;
    try {
      setIsLoading(true);
      // 🛡️ Passing both name and description to the backend
      await updateGroupDetails(chat._id, { chatName: groupName, description: groupDesc });
      // The backend emits "group_updated", socket listener handles the rest.
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update group details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleAddUser = async (user) => {
    if (chat.users.some(u => String(u._id) === String(user._id))) {
      alert("User is already in the group!");
      return;
    }
    try {
      setIsLoading(true);
      await addUserToGroup(chat._id, user._id);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (user) => {
    if (window.confirm(`Are you sure you want to remove ${user.name}?`)) {
      try {
        setIsLoading(true);
        await removeUserFromGroup(chat._id, user._id);
      } catch (error) {
        alert(error.response?.data?.message || "Failed to remove user");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      try {
        setIsLoading(true);
        await leaveGroupChat(chat._id);
        onClose();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to leave group");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // =====================================
  // RENDER
  // =====================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-borderSubtle p-6 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-textPrimary">Group Info</h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-6">
          
          {/* GROUP DETAILS SECTION */}
          <div className="flex flex-col items-center pb-4 border-b border-borderSubtle">
            <Avatar src={chat.groupAvatar} alt={chat.chatName} size="xl" className="mb-4" />
            
            {isAdmin ? (
              <div className="w-full space-y-3">
                <div>
                  <label className="text-xs text-textMuted uppercase tracking-wider mb-1 block">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-background border border-borderSubtle rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-textMuted uppercase tracking-wider mb-1 block">Description / Bio</label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    rows="2"
                    placeholder="Add a group description..."
                    className="w-full bg-background border border-borderSubtle rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
                <button 
                  onClick={handleUpdateDetails}
                  disabled={isLoading || (groupName === chat.chatName && groupDesc === chat.description)}
                  className="w-full py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accentHover disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="text-center w-full">
                <h1 className="text-2xl font-bold text-textPrimary">{chat.chatName}</h1>
                {chat.description && (
                  <p className="text-sm text-textMuted mt-2 bg-background p-3 rounded-lg border border-borderSubtle text-left">
                    {chat.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ADD USER SECTION (Admin Only) */}
          {isAdmin && (
            <div>
              <label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">Add Members</label>
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-background border border-borderSubtle rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors mb-2"
              />
              
              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-background border border-borderSubtle rounded-md shadow-inner">
                  {searchResults.map((user) => (
                    <div 
                      key={user._id}
                      onClick={() => handleAddUser(user)}
                      className="p-2 hover:bg-surface cursor-pointer flex items-center justify-between border-b border-borderSubtle last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={user.profilePic} alt={user.name} size="sm" />
                        <div>
                          <span className="text-sm text-textPrimary block">{user.name}</span>
                          <span className="text-xs text-textMuted">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded">Add ➕</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PARTICIPANTS LIST */}
          <div>
            <label className="text-xs text-textMuted uppercase tracking-wider mb-2 block">
              Participants ({chat.users?.length})
            </label>
            <div className="space-y-2">
              {chat.users?.map((user) => {
                const isUserAdmin = String(chat.groupAdmin?._id || chat.groupAdmin) === String(user._id);
                const isMe = String(currentUserId) === String(user._id);

                return (
                  <div key={user._id} className="flex justify-between items-center bg-background p-2 rounded-md border border-borderSubtle">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.profilePic} alt={user.name} size="sm" isOnline={user.isOnline} />
                      <div className="flex flex-col">
                        <span className="text-sm text-textPrimary font-medium">
                          {user.name} {isMe && <span className="text-textMuted text-xs italic">(You)</span>}
                        </span>
                        <span className="text-xs text-textMuted">{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isUserAdmin && (
                        <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 font-bold uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                      
                      {isAdmin && !isMe && (
                        <button 
                          onClick={() => handleRemoveUser(user)}
                          disabled={isLoading}
                          className="text-danger hover:text-red-300 text-xs font-medium transition-colors p-1"
                          title="Remove user"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-4 pt-4 border-t border-borderSubtle flex justify-end">
          <button 
            onClick={handleLeaveGroup}
            disabled={isLoading}
            className="px-4 py-2 bg-danger/10 text-danger border border-danger/30 rounded-md text-sm font-medium hover:bg-danger hover:text-white transition-colors"
          >
            Leave Group
          </button>
        </div>

      </div>
    </div>
  );
}

export default GroupInfoModal;