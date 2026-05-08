function MessageInput({ 
  input, setInput, handleSend, isUploading, 
  selectedFile, previewUrl, handleFileSelect, clearPreview, handleTyping, replyingTo, clearReply 
}) {
  return (
    <div className="relative flex-shrink-0">

      {/* Previews Container */}
      <div className="absolute bottom-[100%] left-0 w-full flex flex-col z-10">
        
        {/* Reply Preview Overlay */}
        {replyingTo && (
          <div className="p-3 bg-surface border-t border-borderSubtle flex items-center justify-between border-l-4 border-l-accent w-full shadow-lg">
            <div className="flex flex-col text-sm min-w-0">
              <span className="font-bold text-accent truncate">
                Replying to {replyingTo.sender?.name || "User"}
              </span>
              <span className="text-textMuted truncate max-w-[250px] sm:max-w-[400px]">
                {replyingTo.messageType === "image" ? "📷 Image" : 
                 replyingTo.messageType === "video" ? "🎥 Video" : 
                 replyingTo.messageType === "file" ? "📄 File" : 
                 replyingTo.content}
              </span>
            </div>
            <button onClick={clearReply} className="text-textMuted hover:text-danger p-2 transition-colors flex-shrink-0">
              ✕
            </button>
          </div>
        )}

        {/* Media Preview Overlay */}
        {selectedFile && (
          <div className="p-3 bg-surface border-t border-borderSubtle flex items-center justify-between w-full shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              {selectedFile.type.startsWith("image/") ? (
                <img src={previewUrl} alt="preview" className="h-12 w-12 object-cover rounded border border-borderSubtle flex-shrink-0" />
              ) : selectedFile.type.startsWith("video/") ? (
                <video src={previewUrl} className="h-12 w-12 object-cover rounded border border-borderSubtle flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 bg-background flex items-center justify-center rounded text-xl border border-borderSubtle flex-shrink-0">📄</div>
              )}
              <div className="flex flex-col text-sm text-textPrimary min-w-0">
                <span className="truncate max-w-[150px] sm:max-w-[300px]">{selectedFile.name}</span>
                <span className="text-xs text-textMuted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            <button 
              onClick={clearPreview}
              disabled={isUploading} 
              className="text-danger hover:bg-danger/10 p-2 rounded-full transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Input Area */}
      <div className="p-4 border-t border-borderSubtle flex gap-2 items-center bg-surface">
        <label className="cursor-pointer text-textMuted hover:text-accent p-2 transition-colors flex-shrink-0">
          <input 
            type="file" 
            className="hidden" 
            accept="image/jpeg, image/png, image/webp, video/mp4, application/pdf" 
            onChange={handleFileSelect} 
            disabled={isUploading}
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        </label>

        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={selectedFile ? "Press Send to upload..." : "Type a message..."}
          className="flex-1 p-2.5 rounded-lg bg-background text-textPrimary outline-none placeholder-textMuted border border-transparent focus:border-borderSubtle disabled:opacity-50 transition-colors"
          disabled={isUploading || selectedFile !== null}
        />

        <button
          onClick={handleSend}
          className="bg-accent hover:bg-accentHover px-5 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 transition-colors flex-shrink-0"
          disabled={isUploading || (!input.trim() && !selectedFile)}
        >
          {isUploading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default MessageInput;