import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/styles/base.css";
import "./assets/styles/components.css";
import { ToastProvider } from "./components/ui/Toast";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
