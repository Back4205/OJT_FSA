import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    // Added proxy for local development. Remove this when deploying through ngrok because the app will call the backend directly.
    proxy: {
      "/taskmanager/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/taskmanager/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/taskmanager/login/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
