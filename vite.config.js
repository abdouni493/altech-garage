import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development Vite serves the UI on 5173 and forwards /api to the database
// server on 5180. In production the same server serves both from one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:5180", changeOrigin: true },
    },
  },
});
