import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/styles/base.css";
import "./assets/styles/components.css";
import { ToastProvider } from "./components/ui/Toast";
import { applyTheme, getStoredTheme } from "./components/ui/ThemeToggle";

// Применяем сохранённую тему ДО первого рендера, чтобы не было flash светлой
// темы на старте при выбранной тёмной (и наоборот).
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
