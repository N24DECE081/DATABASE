import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/static/admin-portal/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../app/static/admin-portal",
    emptyOutDir: true,
  },
});
