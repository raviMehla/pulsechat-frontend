/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { searchUsers } from "../../services/user.api";
import FocusLock from "react-focus-lock";
import { 
  updateGroupDetails, 
  addUserToGroup, 
  removeUserFromGroup, 
  leaveGroupChat,
  deleteChat,
  rotateGroupKeys
} from "../../services/chat.api";
import { Avatar } from "../ui/Avatar"; 
import { useChat } from "../../context/ChatContext";
import { getAvatarUrl } from "../../utils/getAvatarUrl";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";


function GroupInfoModal({ isOpen, onClose, chat, currentUserId }) {
  const { encryptGroupKeyForUser, rotateGroupKeyPayload, cacheGroupKey } = useChat();
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupAvatarFile, setGroupAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const navigate = useNavigate();
  const { confirmState, confirm, close: closeConfirm } = useConfirm();

  // Escape key light-dismiss
  useKeyboardShortcuts([
    { key: "Escape", callback: onClose }
  ]);


  // Sync local state when the chat prop updates via sockets
  useEffect(() => {
    if (chat) {
      setGroupName(chat.chatName || "");
      setGroupDesc(chat.description || "");
      setGroupAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
    }
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat]);

  if (!isOpen || !chat) return null;

  // 🛡️ Strict Identity Check
  const isAdmin = String(chat.groupAdmin?._id || chat.groupAdmin) === String(currentUserId);

  // =====================================
  // HANDLERS
  // =====================================
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Max size is 5MB.");
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setGroupAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpdateDetails = async () => {
    if (!groupName.trim()) return;
    try {
      setIsLoading(true);
      await updateGroupDetails(chat._id, { chatName: groupName, description: groupDesc }, groupAvatarFile);
      setGroupAvatarFile(null);
      toast.success("Group details updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group details");
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
      toast.error("User is already in the group!");
      return;
    }
    try {
      setIsLoading(true);

      // 🔒 E2EE Encryption for the new user's slot
      let encryptedKey = null;
      let iv = null;
      let keyVersion = null;
      try {
        const slot = await encryptGroupKeyForUser(chat, user);
        encryptedKey = slot.encryptedKey;
        iv = slot.iv;
        keyVersion = slot.keyVersion;
      } catch (e2eeErr) {
        console.error("Failed to encrypt group key for new user:", e2eeErr);
      }

      await addUserToGroup(chat._id, user._id, encryptedKey, iv, keyVersion);
      setSearchQuery("");
      setSearchResults([]);
      toast.success(`${user.name} added successfully`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = (user) => {
    confirm({
      title: "Remove Member",
      message: `Are you sure you want to remove ${user.name}?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await removeUserFromGroup(chat._id, user._id);

          // 🔒 E2EE Key Rotation after user removal
          try {
            const rotation = await rotateGroupKeyPayload(chat, user._id);
            await rotateGroupKeys(chat._id, rotation.encryptedGroupKeys);
            await cacheGroupKey(chat._id, rotation.groupKeyHex);
          } catch (e2eeErr) {
            console.error("Failed to rotate group key after user removal:", e2eeErr);
          }

          toast.success(`${user.name} removed successfully`);
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to remove user");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleLeaveGroup = () => {
    confirm({
      title: "Leave Group",
      message: "Are you sure you want to leave this group?",
      confirmText: "Leave",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await leaveGroupChat(chat._id);
          onClose();
          navigate("/");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to leave group");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleDeleteGroup = () => {
    confirm({
      title: "Delete Group",
      message: "⚠️ CRITICAL WARNING: This will permanently delete this group and all its message history for ALL members. This action cannot be undone. Proceed?",
      confirmText: "Delete Group",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await deleteChat(chat._id);
          toast.success("Group deleted successfully");
          onClose();
          navigate("/");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete group");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };


  // =====================================
  // RENDER
  // =====================================
  return (
    <FocusLock>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-borderSubtle p-6 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-textPrimary">Group Info</h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-6">
          
          {/* GROUP DETAILS SECTION */}
          <div className="flex flex-col items-center pb-4 border-b border-borderSubtle">
            <div className="relative mb-4 group w-16 h-16">
              <Avatar src={avatarPreview || getAvatarUrl(chat.groupAvatar)} alt={chat.chatName} size="xl" />
              {isAdmin && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity border border-borderSubtle">
                  <span className="text-white text-[10px] uppercase font-bold tracking-wider">Edit</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>
            
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
                  disabled={isLoading || (groupName === chat.chatName && groupDesc === chat.description && !groupAvatarFile)}
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
                        <Avatar src={getAvatarUrl(user.profilePic)} alt={user.name} size="sm" />
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
                      <Avatar src={getAvatarUrl(user.profilePic)} alt={user.name} size="sm" isOnline={user.isOnline} />
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
        <div className="mt-4 pt-4 border-t border-borderSubtle flex flex-col sm:flex-row gap-3 justify-end items-center">
          {isAdmin && (
            <button 
              onClick={handleDeleteGroup}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-red-600/10 text-red-600 border border-red-600/30 rounded-md text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
            >
              Delete Group
            </button>
          )}
          {isAdmin && chat.users?.length === 1 ? (
            <div className="relative group w-full sm:w-auto">
              <button 
                disabled
                className="w-full sm:w-auto px-4 py-2 bg-danger/10 text-danger/50 border border-danger/20 rounded-md text-sm font-medium cursor-not-allowed"
              >
                Leave Group
              </button>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-black/90 text-white text-[11px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-lg">
                You're the only member. Delete the group instead.
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLeaveGroup}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-danger/10 text-danger border border-danger/30 rounded-md text-sm font-medium hover:bg-danger hover:text-white transition-colors"
            >
              Leave Group
            </button>
          )}
        </div>

      </div>
      <ConfirmDialog {...confirmState} onClose={closeConfirm} />
    </div>
    </FocusLock>

  );
}

export default GroupInfoModal;