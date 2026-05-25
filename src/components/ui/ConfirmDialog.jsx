import { createPortal } from "react-dom";
import FocusLock from "react-focus-lock";
import { motion, AnimatePresence } from "framer-motion";

function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  variant = "danger" 
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-danger/10 text-danger border-danger/30 hover:bg-danger hover:text-white";
      case "success":
        return "bg-success/10 text-success border-success/30 hover:bg-success hover:text-white";
      case "warning":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500 hover:text-white";
      case "info":
      default:
        return "bg-accent/10 text-accent border-accent/30 hover:bg-accent hover:text-white";
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={onClose}
        >
          <FocusLock returnFocus>
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface border border-borderSubtle rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-desc"
            >
              <h3 id="confirm-dialog-title" className="text-xl font-bold text-textPrimary mb-3">{title}</h3>
              <p id="confirm-dialog-desc" className="text-sm text-textMuted mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
              <div className="flex gap-3 justify-end">
                {cancelText && (
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-background border border-borderSubtle text-textPrimary rounded-lg font-medium hover:bg-surface transition-colors text-sm"
                  >
                    {cancelText}
                  </button>
                )}
                <button 
                  onClick={() => { 
                    if (onConfirm) onConfirm(); 
                    onClose(); 
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm border ${getVariantStyles()}`}
                  autoFocus
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </FocusLock>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ConfirmDialog;
