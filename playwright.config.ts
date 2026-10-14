import { defineConfig } from "@playwright/test";
import chromium, { inflate } from "@sparticuz/chromium";
let launchOptions = {};
if (process.env.SANDBOX_CHROMIUM === "1") {
  await inflate("node_modules/@sparticuz/chromium/bin/al2023.tar.br");
  process.env.LD_LIBRARY_PATH = "/tmp/al2023/lib";
  launchOptions = {
    executablePath: await chromium.executablePath(),
    args: chromium.args.filter(
      (a) => !["--disable-web-security", "--single-process"].includes(a),
    ),
  };
}
export default defineConfig({
  testDir: "tests",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    launchOptions,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
