import { defineConfig } from "vite";

// base: "./" keeps asset URLs relative so the built app works both from
// GitHub Pages (served from a sub-path) and packaged inside the Capacitor
// Android app (served from a local file/asset root).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    exclude: ["node_modules/**", "src/tests/e2e/**"],
  },
});
