import { useCallback, useMemo, useState } from "react";
import { LuBell, LuCircleAlert, LuCircleCheck, LuX } from "react-icons/lu";
import { ToastContext } from "../../context/contexts";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = crypto.randomUUID();
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === "error" ? 6000 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
            {t.type === "error" ? <LuCircleAlert size={18} aria-hidden="true" /> : t.type === "info" ? <LuBell size={18} aria-hidden="true" /> : <LuCircleCheck size={18} aria-hidden="true" />}
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><LuX size={16} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
