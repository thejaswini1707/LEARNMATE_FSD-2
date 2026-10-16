import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import Button from "./Button";

export default function Modal({ open, onClose, title, description, size, children, footer }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const target = dialogRef.current?.querySelector("[data-autofocus], input, select, textarea") || dialogRef.current;
    target?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} className={`modal ${size ? `modal--${size}` : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="modal__header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" size="sm" iconOnly icon={LuX} onClick={onClose} aria-label="Close dialog" />
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open} onClose={onCancel} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-autofocus>{confirmLabel}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
