function ChatListHeader({ onOpenGroupModal, onOpenSearchModal, onOpenBroadcastModal }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <h1 className="text-xl font-semibold text-textPrimary">
        PulseChat
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