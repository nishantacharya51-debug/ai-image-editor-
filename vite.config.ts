import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  let secret = publicKey.startsWith("sb_secret_");
  try {
    if (publicKey.split(".").length === 3) {
      const payload = JSON.parse(
        Buffer.from(publicKey.split(".")[1], "base64url").toString(),
      );
      secret ||= payload.role === "service_role";
    }
  } catch {
    /* A malformed public key will fail at authentication, but is not a secret. */
  }
  if (secret)
    throw new Error(
      "Refusing to expose a Supabase secret/service-role key. Use only the PUBLIC publishable/anon key in VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  return {
    root: path.resolve("web"),
    envDir: process.cwd(),
    publicDir: path.resolve("public"),
    build: { outDir: path.resolve("dist"), emptyOutDir: true },
    plugins: [react()],
    base: env.VITE_APP_BASE || "/",
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
      },
    },
    preview: { host: "0.0.0.0", allowedHosts: true },
    test: { root: process.cwd(), environment: "node", include: ["src/**/*.test.ts"] },
  };
});
