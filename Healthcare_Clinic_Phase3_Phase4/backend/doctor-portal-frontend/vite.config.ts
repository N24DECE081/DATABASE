import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/static/doctor-portal/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../app/static/doctor-portal",
    emptyOutDir: true,
  },
});
