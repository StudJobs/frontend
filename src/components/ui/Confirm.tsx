import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Centralised confirm-dialog. Заменяет нативный window.confirm() — у того нет
// контроля стиля и нельзя подсветить «опасное» действие. Хук возвращает Promise,
// чтобы код вызова оставался синхронным (await confirm(...)). На бэке ничего
// не меняется — модалка просто блокирует UI до решения пользователя.

export type ConfirmOptions = {
  title: string;
  // Описание действия. Можно подсветить имя сущности / сделать многострочным.
  description?: ReactNode;
  // Текст подтверждающей кнопки. По умолчанию «Удалить».
  confirmText?: string;
  // Текст кнопки отмены. По умолчанию «Отмена».
  cancelText?: string;
  // danger=true — кнопка подтверждения красная (необратимые операции).
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

type ConfirmContextValue = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  // Fallback на нативный confirm, если ConfirmProvider не подключён (тесты, etc.).
  return ctx ?? (async (opts) => window.confirm(opts.title));
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const ask = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    []
  );

  const close = useCallback(
    (ok: boolean) => {
      if (state) state.resolve(ok);
      setState(null);
    },
    [state]
  );

  // ESC закрывает как «Отмена», Enter подтверждает — стандартное поведение модалок.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {state ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              padding: "22px 26px",
              maxWidth: 460,
              width: "100%",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              id="confirm-title"
              style={{
                fontSize: 18,
                fontWeight: 800,
                marginBottom: state.description ? 10 : 18,
                fontFamily: "var(--font-display)",
              }}
            >
              {state.title}
            </div>
            {state.description ? (
              <div
                style={{
                  color: "var(--ink-muted)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  marginBottom: 18,
                }}
              >
                {state.description}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => close(false)}
                autoFocus
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface-soft)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {state.cancelText || "Отмена"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: state.danger
                    ? "1px solid var(--danger, #d76262)"
                    : "1px solid var(--brand)",
                  background: state.danger
                    ? "var(--danger, #d76262)"
                    : "var(--brand)",
                  color: state.danger ? "#fff" : "var(--ink-on-brand)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {state.confirmText || (state.danger ? "Удалить" : "Подтвердить")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
