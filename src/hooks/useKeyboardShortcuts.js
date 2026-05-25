import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      shortcuts.forEach(({ key, ctrl, meta, alt, shift, callback }) => {
        const isCtrl = ctrl === undefined || e.ctrlKey === ctrl;
        const isMeta = meta === undefined || e.metaKey === meta;
        const isAlt = alt === undefined || e.altKey === alt;
        const isShift = shift === undefined || e.shiftKey === shift;
        
        // Match modifier combinations. For shortcut key combo of 'k':
        // If meta (Cmd) is required, e.metaKey must match. If ctrl is required, e.ctrlKey must match.
        const modifierMatch = 
          (ctrl !== undefined ? e.ctrlKey === ctrl : true) &&
          (meta !== undefined ? e.metaKey === meta : true) &&
          (alt !== undefined ? e.altKey === alt : true) &&
          (shift !== undefined ? e.shiftKey === shift : true);

        if (e.key.toLowerCase() === key.toLowerCase() && modifierMatch) {
          e.preventDefault();
          callback(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
