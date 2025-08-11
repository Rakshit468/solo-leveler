import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy:
      process.env.NODE_ENV === "development"
        ? {
            "/api": {
              target: "http://localhost:5000",
              changeOrigin: true,
            },
          }
        : undefined,
  },
  build: {
    outDir: path.resolve(__dirname, "frontend/dist"),
    emptyOutDir: true, // Ensure the directory is empty before building
  },
});
