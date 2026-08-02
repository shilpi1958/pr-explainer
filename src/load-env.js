/**
 * Minimal .env loader (no dotenv dependency).
 * Loads KEY=VALUE lines into process.env without overriding existing values.
 * Searches cwd then package root (parent of src/).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, "..");

function parseEnvFile(contents) {
  const out = {};
  for (const raw of contents.split(/\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadEnvFiles() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(PACKAGE_ROOT, ".env"),
  ];
  const seen = new Set();
  for (const file of candidates) {
    const resolved = path.resolve(file);
    if (seen.has(resolved) || !existsSync(resolved)) continue;
    seen.add(resolved);
    let parsed;
    try {
      parsed = parseEnvFile(readFileSync(resolved, "utf8"));
    } catch {
      continue;
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}
