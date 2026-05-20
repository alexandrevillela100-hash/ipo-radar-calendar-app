import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Vite config — minimal. The React plugin enables JSX/TSX,
// fast refresh in dev, and the production build pipeline.
//
// We set `base: "/"` explicitly so the site works at the
// Vercel-supplied root URL. If we ever host this under a sub-path
// (e.g. iporadar.com/calendar) we'd change this.
//
// `resolve.alias` for "@" maps every @/... import to ./src/...
// (matches the tsconfig.json paths config). This is required for
// any of the new pages that use @/components/... or @/lib/... or
// @/pages/... imports.

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
