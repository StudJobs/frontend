import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "src/assets"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
    },
  },

  server: {
    port: 5173,

    // *** Главное — прокси API ***
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000", // API Gateway backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
