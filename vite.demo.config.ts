// Demo build: the real clinic UI running against an in-memory fake backend,
// no login. Entirely separate from vite.config.ts so none of src/demo/** can
// reach the production bundle.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const demo = (f: string) => path.resolve(__dirname, "src/demo", f);

export default defineConfig({
  base: "./",
  publicDir: false, // nothing from public/ (manuals etc.) ships in the demo
  plugins: [
    react(),
    {
      // Static hosts serve index.html at a directory URL, so emit the entry under that name.
      name: "demo-index-html",
      apply: "build",
      closeBundle() {
        const from = path.resolve(__dirname, "dist-demo/demo.html");
        if (fs.existsSync(from)) fs.renameSync(from, path.resolve(__dirname, "dist-demo/index.html"));
      },
    },
  ],
  define: {
    "import.meta.env.VITE_DEMO": JSON.stringify("1"),
    "import.meta.env.VITE_API_URL": JSON.stringify("/demo-api"),
  },
  resolve: {
    alias: [
      { find: /^@\/lib\/cognito$/, replacement: demo("cognito.mock.ts") },
      { find: /^@\/lib\/amplify$/, replacement: demo("amplify.mock.ts") },
      { find: /^aws-amplify\/utils$/, replacement: demo("amplify-utils.mock.ts") },
      { find: /^aws-amplify\/auth$/, replacement: demo("amplify-auth.mock.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    assetsInlineLimit: 0, // sample PDFs must stay real files so "Download" can open them
    rollupOptions: { input: path.resolve(__dirname, "demo.html") },
  },
});
