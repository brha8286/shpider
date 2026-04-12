import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://motifmovement.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
