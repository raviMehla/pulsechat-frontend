import { useState } from "react";
import { motion } from "framer-motion"; // 🛡️ ARCHITECTURAL UPGRADE: The Physics Engine

function MessageBubble({ 
  msg, 
  currentUserId, 
  isGroup, 
  isFirstInGroup = true, 
  isLastInGroup = true, 
  onReply, 
  onReact, 
  onDelete 
}) {
  const senderId = msg.sender?._id || msg.sender;
  const isOwnMessage = String(senderId) === String(currentUserId);
  const [showPicker, setShowPicker] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮'];

  const handleReactionSelect = (emoji) => {
    onReact(msg._id, emoji);
    setShowPicker(false);
  };

  const handleDeleteClick = () => {
    if (window.confirm("Delete this message for everyone?")) {
      onDelete(msg._id);
    }
  };

  const handleDownload = async (e, url, filename) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `download-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const bubbleShape = isOwnMessage 
    ? `bg-accent text-white rounded-2xl ${!isFirstInGroup ? 'rounded-tr-[4px]' : ''} rounded-br-[4px]` 
    : `bg-card text-textPrimary rounded-2xl ${!isFirstInGroup ? 'rounded-tl-[4px]' : ''} rounded-bl-[4px]`;

  // 🛡️ THE LIQUID MOTION SYSTEM: Entry Animations
  const entryVariants = {
    hidden: isOwnMessage 
      ? { opacity: 0, scale: 0.8, originX: 1, originY: 1 } // Sent: Pop in from bottom-right
      : { opacity: 0, x: -20 },                            // Recv: Slide from left
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      transition: { duration: 0.25, ease: [0.0, 0.0, 0.2, 1] } // Noir Glass standard ease-out
    }
  };

  if (msg.isDeleted) {
    return (
      <motion.div 
        layout 
        initial="hidden" 
        animate="visible" 
        variants={entryVariants}
        className={`flex w-full ${isLastInGroup ? "mb-4 mt-1" : "mb-1"} ${isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        <div className={`px-3 py-2 text-sm text-textMuted italic bg-surface border border-borderSubtle ${bubbleShape} max-w-[75%] sm:max-w-[60%]`}>
          🚫 This message was deleted
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout // This makes bubbles seamlessly slide up when new ones arrive
      initial="hidden"
      animate="visible"
      variants={entryVariants}
      id={`msg-${msg._id}`}
      className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"} group relative ${isLastInGroup ? "mb-4" : "mb-1"} flex-shrink-0`}
    >
      
      {showPicker && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`absolute -top-12 z-20 flex gap-1 bg-surface border border-borderSubtle p-1.5 rounded-full shadow-lg ${isOwnMessage ? "right-0" : "left-0"}`}
        >
          {EMOJIS.map((emoji) => (
            <button 
              key={emoji} 
              onClick={() => handleReactionSelect(emoji)}
              className="w-10 h-10 flex items-center justify-center hover:scale-125 transition-transform text-lg"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      <div className={`flex flex-col relative max-w-[75%] sm:max-w-[60%] ${isOwnMessage ? "items-end" : "items-start"}`}>
        
        <div className={`absolute bottom-0 opacity-0 group-hover:opacity-100 flex items-center transition-opacity ${isOwnMessage ? "right-full pr-1" : "left-full pl-1"}`}>
          {!isOwnMessage ? (
            <>
              <button onClick={() => setShowPicker(!showPicker)} className="w-11 h-11 flex items-center justify-center text-textMuted hover:text-accent" title="React">🙂</button>
              <button onClick={onReply} className="w-11 h-11 flex items-center justify-center text-textMuted hover:text-accent" title="Reply">↩️</button>
            </>
          ) : (
            <>
              <button onClick={onReply} className="w-11 h-11 flex items-center justify-center text-textMuted hover:text-accent" title="Reply">↩️</button>
              <button onClick={() => setShowPicker(!showPicker)} className="w-11 h-11 flex items-center justify-center text-textMuted hover:text-accent" title="React">🙂</button>
              <button onClick={handleDeleteClick} className="w-11 h-11 flex items-center justify-center text-textMuted hover:text-danger" title="Delete">🗑️</button>
            </>
          )}
        </div>

        {isGroup && !isOwnMessage && isFirstInGroup && (
          <span className="text-[11px] font-bold text-accent mb-0.5 ml-1 block tracking-wide">
            {msg.sender?.name || msg.sender?.username || "Unknown"}
          </span>
        )}

        {/* 🛡️ THE LIQUID MOTION SYSTEM: Swipe-to-Reply Physics */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }} // Rubber band effect: snaps back to center
          dragElastic={0.15} // Adds tension to the pull
          onDragEnd={(e, info) => {
            // Trigger reply if pulled far enough
            if (info.offset.x > 50 || info.offset.x < -50) {
              onReply();
            }
          }}
          onDoubleClick={onReply}
          className={`min-w-[60px] w-full px-3 py-2 text-sm shadow-sm break-words cursor-grab active:cursor-grabbing ${bubbleShape}`}
        >
          <div className="flex flex-col pointer-events-none"> {/* Prevent drag interference */}
            
            {msg.replyTo && (
              <div className="bg-black/10 rounded p-2 mb-2 text-xs border-l-4 border-white/40 opacity-90">
                <span className="font-bold block mb-0.5">
                  {msg.replyTo.sender?.name || msg.replyTo.sender?.username || "User"}
                </span>
                <p className="truncate max-w-[200px] italic opacity-80">
                  {msg.replyTo.isDeleted 
                    ? "🚫 This message was deleted" 
                    : msg.replyTo.messageType === "image" ? "📷 Image" 
                    : msg.replyTo.messageType === "video" ? "🎥 Video" 
                    : msg.replyTo.messageType === "file" ? "📄 File" 
                    : msg.replyTo.content}
                </p>
              </div>
            )}

            <div className="pointer-events-auto"> {/* Re-enable clicks for media buttons */}
              {msg.messageType === "image" ? (
                <div className="flex flex-col mt-1">
                  <img src={msg.fileUrl} alt="attachment" className="max-w-full rounded-md border border-black/10 object-contain pointer-events-none" />
                  <button onClick={(e) => handleDownload(e, msg.fileUrl, msg.fileName || 'image.jpg')} className="mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-black/20 hover:bg-black/30 rounded-md text-xs font-semibold transition-colors">
                    {isDownloading ? "Downloading..." : "⬇️ Save Image"}
                  </button>
                </div>
              ) : msg.messageType === "video" ? (
                <div className="flex flex-col mt-1">
                  <video src={msg.fileUrl} controls className="max-w-full rounded-md border border-black/10" />
                  <button onClick={(e) => handleDownload(e, msg.fileUrl, msg.fileName || 'video.mp4')} className="mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-black/20 hover:bg-black/30 rounded-md text-xs font-semibold transition-colors">
                    {isDownloading ? "Downloading..." : "⬇️ Save Video"}
                  </button>
                </div>
              ) : msg.messageType === "audio" ? (
                <div className="flex flex-col mt-1 min-w-[200px]">
                  <audio src={msg.fileUrl} controls className="w-full h-10" />
                  <button onClick={(e) => handleDownload(e, msg.fileUrl, msg.fileName || 'audio.mp3')} className="mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-black/20 hover:bg-black/30 rounded-md text-xs font-semibold transition-colors">
                    {isDownloading ? "Downloading..." : "⬇️ Save Audio"}
                  </button>
                </div>
              ) : msg.messageType === "file" ? (
                <div className="flex flex-col bg-black/10 border border-white/10 rounded-lg p-3 mt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">📄</div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate font-semibold text-sm">{msg.fileName || "Document"}</span>
                      <span className="text-[10px] opacity-75 uppercase tracking-wider">File Attachment</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDownload(e, msg.fileUrl, msg.fileName || 'document')} className="flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 transition-colors py-2 rounded-md text-xs font-bold w-full">
                    {isDownloading ? "Downloading..." : "⬇️ Download File"}
                  </button>
                </div>
              ) : (
                <span className="whitespace-pre-wrap leading-relaxed">{msg.content || "Unsupported message type"}</span>
              )}
            </div>
            
            {isLastInGroup && (
               <div className="flex items-center gap-1.5 self-end mt-1.5 opacity-80 pointer-events-none">
                  <span className={`text-[10px] font-medium tracking-wide ${isOwnMessage ? 'text-white/90' : 'text-[#7A7890]'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isOwnMessage && (
                    <div className="text-[11px] font-bold tracking-tighter">
                      {msg.readBy?.length > 0 ? <span>✓✓</span> : 
                      msg.deliveredTo?.length > 0 ? <span>✓✓</span> : <span>✓</span>}
                    </div>
                  )}
               </div>
            )}
          </div>
        </motion.div>

        {msg.reactions && msg.reactions.length > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-3 flex flex-wrap gap-1 z-10 ${isOwnMessage ? "right-2" : "left-2"}`}
          >
            {msg.reactions.map((r, idx) => {
              const hasReacted = r.users.includes(currentUserId);
              return (
                <button 
                  key={idx}
                  onClick={() => onReact(msg._id, r.emoji)} 
                  className={`relative flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shadow-sm transition-colors ${
                    hasReacted 
                      ? 'bg-accent border-accent text-white' 
                      : 'bg-surface border-borderSubtle text-textMuted hover:bg-background'
                  }`}
                >
                  <span className="absolute -inset-2"></span>
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.users.length}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default MessageBubble;