import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FocusLock from "react-focus-lock";
import { getStarredMessages } from "../../services/message.api";
import { Avatar } from "../ui/Avatar";
import { getAvatarUrl } from "../../utils/getAvatarUrl";

function StarredMessagesModal({ isOpen, onClose, onStarredMessageClick }) {
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchStarred = async () => {
      try {
        setLoading(true);
        const data = await getStarredMessages();
        const list = data.messages || data.data || data || [];
        setStarred(list);
      } catch (err) {
        console.error("Error fetching starred messages:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStarred();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <FocusLock>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-surface border border-borderSubtle rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[70vh] max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-borderSubtle">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-1.5">
              <span className="text-yellow-400">⭐</span> Starred Messages
            </h2>
            <button onClick={onClose} className="text-textMuted hover:text-white text-xl font-bold p-1">×</button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : starred.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-textMuted gap-2">
                <span className="text-3xl">⭐</span>
                <p className="text-sm font-medium">No starred messages yet</p>
                <p className="text-xs max-w-xs text-center leading-relaxed">
                  Hover over messages in your chats and click the star icon to save important content here.
                </p>
              </div>
            ) : (
              starred.map((msg) => {
                const sender = msg.sender || {};
                const chat = msg.chat || {};
                const dateStr = new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
                const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <div
                    key={msg._id}
                    onClick={() => {
                      onStarredMessageClick(chat._id, msg);
                      onClose();
                    }}
                    className="p-3 bg-surface hover:bg-surface/85 border border-borderSubtle hover:border-accent/20 rounded-xl cursor-pointer transition-all flex flex-col gap-2 select-none group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={getAvatarUrl(sender.profilePic)} alt={sender.name} size="sm" />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-textPrimary">{sender.name || "Unknown"}</span>
                          <span className="text-[10px] text-textMuted font-medium">in {chat.chatName || "Direct Chat"}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-textMuted">{dateStr} at {timeStr}</span>
                    </div>
                    <div className="pl-10 text-xs text-textSecondary text-left leading-relaxed break-words font-sans">
                      {msg.messageType === "image" ? "📷 Image attachment"
                       : msg.messageType === "video" ? "🎥 Video attachment"
                       : msg.messageType === "audio" || msg.messageType === "voice" ? "🎵 Audio message"
                       : msg.messageType === "file" ? "📄 File attachment"
                       : msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </FocusLock>,
    document.body
  );
}

export default StarredMessagesModal;
