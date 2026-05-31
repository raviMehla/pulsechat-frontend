function ChatListHeader({ onOpenGroupModal, onOpenSearchModal, onOpenBroadcastModal }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-borderSubtle bg-surface">
      <h1 className="text-xl font-bold text-textPrimary tracking-tight flex items-center gap-2.5">
        <div className="w-8 h-8 bg-accent text-white rounded-lg flex items-center justify-center font-extrabold text-base shadow-sm select-none">
          P
        </div>
        <span>PulseChat</span>
      </h1>
      <div className="flex gap-4 text-textSecondary items-center">
        <button 
          onClick={onOpenGroupModal}
          className="hover:text-white transition-colors"
          title="Create New Group"
        >
          👥
        </button>
        <button 
          onClick={onOpenBroadcastModal}
          className="hover:text-white transition-colors"
          title="Broadcast Lists"
        >
          📢
        </button>
        {/* 🛡️ Wire up the Search Button */}
        <button onClick={onOpenSearchModal} className="hover:text-white transition-colors" title="Search Users">
          🔍
        </button>
      </div>
    </div>
  );
}
export default ChatListHeader;