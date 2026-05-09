import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

export type ToastVariant = "default" | "success" | "warning" | "danger";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastEntry = ToastInput & {
  id: string;
  leaving?: boolean;
};

type ToastContextValue = {
  push: (t: ToastInput) => void;
  success: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  danger: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      success: () => {},
      warning: () => {},
      danger: () => {},
    };
  }
  return ctx;
}

const ICONS: Record<ToastVariant, string> = {
  default: "i",
  success: "✓",
  warning: "!",
  danger: "×",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const push = useCallback(
    (t: ToastInput) => {
      counterRef.current += 1;
      const id = `t${Date.now()}-${counterRef.current}`;
      const entry: ToastEntry = { id, variant: "default", ...t };
      setToasts((prev) => [...prev, entry]);
      const ms = t.durationMs ?? 4500;
      window.setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      push({ title, description, variant: "success" }),
    [push]
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      push({ title, description, variant: "warning" }),
    [push]
  );
  const danger = useCallback(
    (title: string, description?: string) =>
      push({ title, description, variant: "danger" }),
    [push]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastInput | undefined;
      if (detail) push(detail);
    };
    window.addEventListener("studjobs:toast", handler);
    return () => window.removeEventListener("studjobs:toast", handler);
  }, [push]);

  return (
    <ToastContext.Provider value={{ push, success, warning, danger }}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite">
        {toasts.map((t) => {
          const variant: ToastVariant = t.variant ?? "default";
          return (
            <div
              key={t.id}
              className={`toast toast--${variant}${t.leaving ? " toast--leaving" : ""}`}
            >
              <span className="toast-icon" aria-hidden="true">
                {ICONS[variant]}
              </span>
              <div className="toast-body">
                <div className="toast-title">{t.title}</div>
                {t.description ? (
                  <div className="toast-desc">{t.description}</div>
                ) : null}
              </div>
              <button
                className="toast-close"
                aria-label="Закрыть"
                onClick={() => remove(t.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Импэртивный вызов из мест без React-контекста (например, axios-интерцептор). */
export function fireToast(t: ToastInput) {
  window.dispatchEvent(new CustomEvent("studjobs:toast", { detail: t }));
}
