import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Only prefix paths with /portfolioGame/ for production builds (GitHub Pages).
  // Local dev/preview should run at the root so HMR's WebSocket connects correctly.
  base: command === "build" ? "/portfolioGame/" : "/",
}));