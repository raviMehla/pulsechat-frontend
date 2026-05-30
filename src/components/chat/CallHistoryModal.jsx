import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FocusLock from "react-focus-lock";
import localforage from "localforage";
import { Avatar } from "../ui/Avatar";
import { getAvatarUrl } from "../../utils/getAvatarUrl";
import { useCall } from "../../context/CallContext";

function CallHistoryModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startCall } = useCall();

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await localforage.getItem("call_logs");
      setLogs(data || []);
    } catch (err) {
      console.error("Error loading call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const handleClearAll = async () => {
    try {
      await localforage.removeItem("call_logs");
      setLogs([]);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const handleRedial = (log) => {
    if (!log.user?.id) return;
    startCall(log.user.id, log.type || "audio", log.user.name, log.user.image);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <FocusLock>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-surface border border-borderSubtle rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[60vh] max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-borderSubtle">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-1.5">
              <span>📞</span> Call History
            </h2>
            <div className="flex items-center gap-3">
              {logs.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold px-2 py-0.5 rounded border border-red-500/20 hover:bg-red-500/5 transition-all"
                >
                  Clear History
                </button>
              )}
              <button onClick={onClose} className="text-textMuted hover:text-white text-xl font-bold p-1">×</button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-textMuted gap-2">
                <span className="text-3xl">📞</span>
                <p className="text-sm font-medium">No calls logged yet</p>
                <p className="text-xs max-w-xs text-center leading-relaxed">
                  Call logs of your live conversations (audio & video calls) will appear here.
                </p>
              </div>
            ) : (
              logs.map((log) => {
                const dateStr = new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
                const timeStr = new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                
                // Set direction details
                let DirIcon = "↗️";
                let dirColor = "text-blue-400";
                if (log.direction === "incoming") {
                  DirIcon = "↙️";
                  dirColor = "text-green-400";
                } else if (log.direction === "missed") {
                  DirIcon = "↙️";
                  dirColor = "text-red-500";
                }

                return (
                  <div
                    key={log._id}
                    onClick={() => handleRedial(log)}
                    className="p-3 bg-surface hover:bg-surface/85 border border-borderSubtle hover:border-accent/20 rounded-xl cursor-pointer transition-all flex items-center justify-between select-none group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={getAvatarUrl(log.user?.image)} alt={log.user?.name} size="sm" />
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-textPrimary">{log.user?.name || "Unknown"}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-xs ${dirColor}`}>{DirIcon}</span>
                          <span className="text-[10px] text-textMuted capitalize">
                            {log.direction} call • {log.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-textMuted">{dateStr}</span>
                      <span className="text-[10px] text-textMuted">{timeStr}</span>
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

export default CallHistoryModal;
