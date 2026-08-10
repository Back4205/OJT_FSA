import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Helper: create a proxy entry that forwards the original host/proto headers
// so Spring Boot can reconstruct the correct base URL (important for OAuth2 redirect URIs).
// When using ngrok, the request already carries X-Forwarded-Host / X-Forwarded-Proto set by
// the ngrok tunnel. We preserve those; for plain LAN access we fall back to the Host header.
function backendProxy() {
  return {
    target: "http://localhost:8080",
    changeOrigin: true,
    configure: (proxy: import("http-proxy").Server) => {
      proxy.on(
        "proxyReq",
        (
          proxyReq: import("http").ClientRequest,
          req: import("http").IncomingMessage
        ) => {
          // Prefer the forwarded host already set by ngrok; otherwise use the raw Host header.
          const host =
            (req.headers["x-forwarded-host"] as string) ||
            req.headers["host"] ||
            "";
          const proto =
            (req.headers["x-forwarded-proto"] as string) || "http";

          if (host) proxyReq.setHeader("X-Forwarded-Host", host);
          proxyReq.setHeader("X-Forwarded-Proto", proto);
          // Remove port hint so Spring does not append ":80" / ":443" to redirect URIs.
          proxyReq.removeHeader("X-Forwarded-Port");
        }
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      // All backend API calls
      "/taskmanager/api": backendProxy(),
      // OAuth2 authorization initiation (Google / GitHub redirect)
      "/taskmanager/oauth2": backendProxy(),
      // OAuth2 callback from Google / GitHub
      "/taskmanager/login/oauth2": backendProxy(),
    },
  },
});
