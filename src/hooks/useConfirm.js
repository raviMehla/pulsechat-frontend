import { useState, useCallback } from "react";

export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger"
  });

  const confirm = useCallback(({ title, message, onConfirm, confirmText, cancelText, variant }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText: confirmText || "Confirm",
      cancelText: cancelText === null ? null : (cancelText || "Cancel"),
      variant: variant || "danger"
    });
  }, []);

  const close = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { confirmState, confirm, close };
}
