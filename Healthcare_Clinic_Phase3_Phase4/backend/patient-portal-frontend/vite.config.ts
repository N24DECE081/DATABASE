import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/static/patient-portal/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../app/static/patient-portal",
    emptyOutDir: true,
  },
});
