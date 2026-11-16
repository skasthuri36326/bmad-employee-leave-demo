import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const credentialsPath = process.env.DEMO_CREDENTIALS_FILE;
dotenv.config(credentialsPath
  ? { path: credentialsPath, override: true, quiet: true }
  : { path: resolve(process.cwd(), ".env.local"), quiet: true });
const manifestPath = process.env.E2E_MANIFEST_FILE;
if (manifestPath) process.env.E2E_MANIFEST = readFileSync(manifestPath, "utf8");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "off",
  },
});
