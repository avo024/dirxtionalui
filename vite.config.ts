import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // When running `npm run dev` on EC2 (or anywhere Flask is reachable on
    // localhost:5000), proxy /api/* requests to the local Flask backend.
    // This matches what nginx does in production (strips the /api prefix).
    // Avoids CORS entirely — browser sees same-origin requests.
    //
    // To use: set VITE_API_URL=/api when running dev, e.g.
    //   VITE_API_URL=/api npm run dev -- --host 0.0.0.0 --port 8080
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Flask is behind Talisman (force_https=True). In production, nginx
        // sets X-Forwarded-Proto=https so Talisman accepts the request as
        // already-secure. Without it, Flask 302-redirects every request to
        // https://localhost:5000/... which bypasses the proxy and fails.
        headers: {
          'X-Forwarded-Proto': 'https',
        },
        // Safety net: rewrite any absolute https://localhost:5000/... Location
        // header that Flask might still send back, so the browser follows the
        // redirect through the proxy instead of trying to hit Flask directly.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const loc = proxyRes.headers.location;
            if (typeof loc === 'string') {
              proxyRes.headers.location = loc
                .replace(/^https?:\/\/localhost:5000/, '/api')
                .replace(/^https?:\/\/127\.0\.0\.1:5000/, '/api');
            }
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: process.env.VITE_OUT_DIR || 'dist',
    emptyOutDir: true,
  },
}));
