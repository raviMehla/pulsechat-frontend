import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/Avatar"; 

function ChatHeader({ chatName, chatImage, isOnline, isGroup, participantCount, onSearchClick, onInfoClick, onCallClick }) {
  const navigate = useNavigate();

  return (
    <div className="p-4 border-b border-borderSubtle flex justify-between items-center bg-surface flex-shrink-0 shadow-sm z-10">
      
      {/* Left Section: Back Button & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate("/")}
          className="md:hidden w-11 h-11 flex items-center justify-center -ml-2 rounded-full text-textMuted hover:text-accent hover:bg-background transition-colors"
          title="Back to Chats"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <div 
          onClick={onInfoClick} 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          title="View Info"
        >
          <Avatar 
            src={chatImage} 
            alt={chatName} 
            isOnline={!isGroup ? isOnline : undefined} 
            size="md" 
          />
          <div>
            <h2 className="font-semibold text-textPrimary tracking-tight">{chatName}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-textMuted font-medium">
                {isGroup ? `${participantCount} participants` : (isOnline ? "Online" : "Offline")}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Section: Actions - 🛡️ UPGRADED to w-11 h-11 (44x44dp) */}
      <div className="flex items-center gap-1">
        {!isGroup && (
          <button 
            onClick={onCallClick}
            className="text-textMuted hover:text-green-500 transition-colors w-11 h-11 flex items-center justify-center rounded-full hover:bg-background"
            title="Start Voice Call"
          >
            📞
          </button>
        )}
        
        <button 
          onClick={onInfoClick}
          className="text-textMuted hover:text-accent transition-colors w-11 h-11 flex items-center justify-center rounded-full hover:bg-background"
          title="Info"
        >
          ℹ️
        </button>
        <button 
          onClick={onSearchClick}
          className="text-textMuted hover:text-accent transition-colors w-11 h-11 flex items-center justify-center rounded-full hover:bg-background"
          title="Search Messages"
        >
          🔍
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;