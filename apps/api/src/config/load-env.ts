import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

const envFileCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../../.env"),
];

for (const envFile of envFileCandidates) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
    break;
  }
}
