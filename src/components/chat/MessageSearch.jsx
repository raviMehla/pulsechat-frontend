import { useState, useEffect } from "react";
import { searchChatMessages } from "../../services/message.api";
import { motion } from "framer-motion"; // 🛡️ UPGRADE: Framer Motion

function MessageSearch({ chatId, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 🛡️ PRESERVED: Your excellent debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await searchChatMessages(chatId, query);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, chatId]);

  return (
    // 🛡️ THE FIX: Strictly absolute right drawer with Spring Physics. No sm:static!
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 w-full sm:w-80 h-full bg-surface border-l border-borderSubtle z-50 flex flex-col shadow-2xl"
    >
      {/* 1. Search Header */}
      <div className="flex items-center justify-between p-4 border-b border-borderSubtle bg-background/50 backdrop-blur-md">
        <h2 className="font-semibold text-textPrimary tracking-tight">Search Messages</h2>
        
        {/* 🛡️ UPGRADE: 44x44dp Accessible Close Button */}
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full text-textMuted hover:text-danger hover:bg-black/20 transition-colors"
          title="Close Search"
        >
          ✕
        </button>
      </div>

      {/* 2. Search Input */}
      <div className="p-4 border-b border-borderSubtle bg-surface">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in chat..."
            className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent transition-colors pr-10"
            autoFocus
          />
          {isSearching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent animate-pulse">
              ...
            </span>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted opacity-70">
              🔍
            </span>
          )}
        </div>
      </div>

      {/* 3. Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {results.length === 0 && query && !isSearching && (
          // 🛡️ NOIR GLASS UPGRADE: Elevated Empty State
          <div className="flex flex-col items-center justify-center h-40 text-center px-4 mt-10">
            <span className="text-3xl mb-3 opacity-80">📭</span>
            <p className="text-sm text-textMuted">No messages found matching<br/> <span className="text-textPrimary font-medium">"{query}"</span></p>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {results.map((msg) => (
            <div 
              key={msg._id}
              onClick={() => onJumpToMessage(msg)}
              className="p-3 bg-background/40 hover:bg-card border border-transparent hover:border-borderSubtle rounded-lg cursor-pointer transition-colors group"
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-accent tracking-wide">
                  {msg.sender?.name || msg.sender?.username || "User"}
                </span>
                <span className="text-[10px] text-textMuted font-medium">
                  {new Date(msg.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-textPrimary line-clamp-2 leading-relaxed">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default MessageSearch;