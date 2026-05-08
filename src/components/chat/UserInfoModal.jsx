import { createPortal } from "react-dom";
import { Avatar } from "../ui/Avatar"; // Assuming you have an Avatar component

function UserInfoModal({ isOpen, onClose, chat, currentUserId, isBlockedByMe, onToggleBlock, onDeleteChat }) {
  console.log("UserInfoModal Render Check:", { isOpen, chatExists: !!chat, isGroup: chat?.isGroup });
  if (!isOpen || !chat || chat.isGroup) return null;

  // Extract the target user's details
  const targetUser = chat.users.find(u => String(u._id) !== String(currentUserId));
  if (!targetUser) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface border border-borderSubtle p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col items-center">
        
        {/* Header / Close */}
        <div className="w-full flex justify-end mb-2">
          <button onClick={onClose} className="text-textMuted hover:text-white text-xl font-bold">×</button>
        </div>

        {/* Profile Info */}
        <Avatar src={targetUser.profilePic} alt={targetUser.name} size="xl" className="w-24 h-24 mb-4 text-4xl" />
        <h2 className="text-2xl font-bold text-textPrimary mb-1">{targetUser.name}</h2>
        <p className="text-sm text-accent mb-4">@{targetUser.username}</p>

        <div className="w-full bg-background rounded-lg p-4 mb-6 border border-borderSubtle">
          <div className="mb-3">
            <span className="text-xs text-textMuted uppercase tracking-wider block mb-1">Email</span>
            <span className="text-sm text-textPrimary">{targetUser.email}</span>
          </div>
          {targetUser.phone && (
            <div className="mb-3">
              <span className="text-xs text-textMuted uppercase tracking-wider block mb-1">Phone</span>
              <span className="text-sm text-textPrimary">{targetUser.phone}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-textMuted uppercase tracking-wider block mb-1">Bio</span>
            <span className="text-sm text-textPrimary italic">
              {targetUser.bio || "Hey there! I am using PulseChat."}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={() => onToggleBlock(targetUser._id)}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
              isBlockedByMe 
                ? "bg-background text-textPrimary border-borderSubtle hover:bg-borderSubtle" 
                : "bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500 hover:text-white"
            }`}
          >
            {isBlockedByMe ? "Unblock User" : "Block User"}
          </button>

          <button 
            onClick={onDeleteChat}
            className="w-full py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Delete Chat
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default UserInfoModal;