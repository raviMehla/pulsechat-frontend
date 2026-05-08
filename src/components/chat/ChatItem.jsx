import { useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { Avatar } from "../ui/Avatar"; // 🛡️ ARCHITECTURAL UPGRADE: Standard UI Primitive

function ChatItem({ chat }) {
  const navigate = useNavigate();
  const { activeChat, setActiveChat } = useChat();

  // Determine active state via your Context payload
  const isActive = activeChat === String(chat.id);

  const handleClick = () => {
    setActiveChat(String(chat.id));
    navigate(`/chat/${chat.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 border-b last:border-b-0 ${
        isActive 
          ? "bg-accent/10 border-accent/20 border-b-transparent" // Semantic active highlight
          : "border-borderSubtle hover:bg-background" // Semantic hover state & divider
      }`}
    >
      {/* 🛡️ Avatar: Added 'flex-shrink-0' to prevent the circle from squishing on small screens */}
      <Avatar
        src={chat.image}
        alt={chat.name}
        size="lg"
        className="w-12 h-12 flex-shrink-0 shadow-sm"
      />

      {/* 🛡️ Content: Added 'min-w-0' to enforce strict text truncation for long messages */}
      <div className="flex-1 min-w-0">
        
        <div className="flex justify-between items-baseline mb-0.5">
          <h2 className={`font-semibold text-sm truncate pr-2 ${isActive ? "text-accent" : "text-textPrimary"}`}>
            {chat.name}
          </h2>

          {chat.time && (
            <span className={`text-[10px] flex-shrink-0 ${chat.unread > 0 ? "text-accent font-medium" : "text-textMuted"}`}>
              {chat.time}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-1 gap-2">
          <p className={`text-xs truncate ${chat.unread > 0 ? "text-textPrimary font-medium" : "text-textMuted"}`}>
            {chat.lastMessage}
          </p>

          {/* Unread Badge */}
          {chat.unread > 0 && (
            <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-sm">
              {chat.unread}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

export default ChatItem;