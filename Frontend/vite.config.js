import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/API": "https://business-management-and-analysis.onrender.com/",
    },
  },
  plugins: [react()],
});
