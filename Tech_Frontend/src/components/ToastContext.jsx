import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setNotifier } from "../utils/notify";

const ToastContext = createContext(null);

// Variant styles for toasts
const variantStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-gray-200 bg-white text-gray-900",
};

// Renders the toast list + handles exit animation before removal
const ToastViewport = ({ toasts, requestClose }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto w-[320px] max-w-[90vw] border rounded-xl shadow-lg p-3 ${variantStyles[t.variant] || variantStyles.info} ${t.exiting ? "toast-exit" : "toast-enter"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm leading-snug">{t.message}</div>
            <button type="button" className="text-xs px-2 py-1 rounded hover:bg-black/5" onClick={() => requestClose(t.id)} aria-label="Close notification">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ToastProvider = ({ children, maxToasts = 3, defaultDuration = 2500 }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  // Dismiss a toast by ID
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    const timers = timersRef.current;
    const timer = timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.delete(id);
    }
  }, []);

  // Request close with exit animation
  const requestClose = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation duration (180ms)
    window.setTimeout(() => dismiss(id), 180);
  }, [dismiss]);

  // Show a new toast
  const show = useCallback(
    (message, variant = "info", duration) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const ms = typeof duration === "number" ? duration : defaultDuration;

      setToasts((prev) => {
        const next = [...prev, { id, message, variant, exiting: false }];
        // keep only last maxToasts
        return next.slice(-maxToasts);
      });

      // Set auto-dismiss timer
      const timer = window.setTimeout(() => requestClose(id), ms);
      timersRef.current.set(id, timer);

      return id;
    },
    [defaultDuration, maxToasts, requestClose]
  );

  // Memoize the API to avoid unnecessary re-renders
  const api = useMemo(
    () => ({
      show,
      success: (msg, duration) => show(msg, "success", duration),
      error: (msg, duration) => show(msg, "error", duration),
      info: (msg, duration) => show(msg, "info", duration),
      dismiss: requestClose,
      clear: () => {
        // dismiss all
        setToasts((prev) => {
          prev.forEach((t) => requestClose(t.id));
          return [];
        });
      },
    }),
    [requestClose, show]
  );

  useEffect(() => {
    setNotifier(api); // Set the notifier for use in non-React code
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} requestClose={requestClose} />
    </ToastContext.Provider>
  );
};

// Custom hook to use the toast context
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};