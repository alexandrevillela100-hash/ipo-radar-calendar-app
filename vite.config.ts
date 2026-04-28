import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — minimal. The React plugin enables JSX/TSX,
// fast refresh in dev, and the production build pipeline.
//
// We set `base: "/"` explicitly so the site works at the
// Vercel-supplied root URL. If we ever host this under a sub-path
// (e.g. iporadar.com/calendar) we'd change this.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
