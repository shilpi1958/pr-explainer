#!/usr/bin/env node
/**
 * Dev helper for iterating on buildRepoPrompt without the full CLI.
 * Prefer: node src/cli.js repo --no-quiz
 * Kept for prompt experiments (see issue #13).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { buildRepoPrompt } from "../src/prompt.js";
import { getRepoIdentity, getRecentMergedPRs } from "../src/github.js";
import { runClaude } from "../src/claude.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function truncate(text, max, label) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max) + `\n\n... (${label} truncated at ${max} chars)`;
}

function formatRecentPrs(prs, budget = 7000) {
  if (!prs.length) return "(no recent merged PRs found)";
  const parts = [];
  let used = 0;
  for (const pr of prs) {
    const body = truncate((pr.body || "").trim() || "(no description)", 600, `PR #${pr.number}`);
    const block = `#${pr.number} ${pr.title}\n${body}`;
    if (used + block.length > budget && parts.length) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}

async function godNodesSummary(repoRoot) {
  try {
    const { stdout } = await execFileAsync(
      "graphify",
      ["god-nodes", "--top", "10", "--graph", path.join(repoRoot, "graphify-out/graph.json")],
      { cwd: repoRoot }
    );
    return stdout.trim();
  } catch (err) {
    return `(god-nodes unavailable: ${err.message})`;
  }
}

async function loadProfile() {
  const candidates = [
    process.env.LEARNING_PROFILE,
    path.join(ROOT, "learning-profile.md"),
    path.join(os.homedir(), ".pr-explainer/learning-profile.md"),
    path.join(ROOT, "templates/learning-profile.example.md"),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return { path: p, text: await readFile(p, "utf8") };
  }
  throw new Error("No learning profile found");
}

async function main() {
  const reportPath = path.join(ROOT, "graphify-out/GRAPH_REPORT.md");
  if (!existsSync(reportPath)) {
    throw new Error(`Missing ${reportPath}. Run: graphify update .`);
  }

  const profile = await loadProfile();
  const identity = await getRepoIdentity(ROOT);
  const prs = await getRecentMergedPRs(ROOT, 8);
  const report = truncate(await readFile(reportPath, "utf8"), 20_000, "GRAPH_REPORT");
  const graphSummary = truncate(await godNodesSummary(ROOT), 4_000, "god-nodes");

  const prompt = buildRepoPrompt({
    profile: profile.text,
    identity,
    graphifyReport: report,
    graphSummary,
    recentPrs: formatRecentPrs(prs),
  });

  const outDir = path.join(ROOT, "graphify-out");
  await mkdir(outDir, { recursive: true });
  const promptPath = path.join(outDir, "repo-prompt-test.txt");
  await writeFile(promptPath, prompt, "utf8");
  console.error(`Wrote prompt (${prompt.length} chars) → ${promptPath}`);
  console.error(`Profile: ${profile.path}`);
  console.error("Calling claude…");

  const entry = await runClaude(prompt);
  const resultPath = path.join(outDir, "repo-explainer-sample.md");
  await writeFile(resultPath, entry + "\n", "utf8");
  console.error(`Wrote explainer → ${resultPath}`);
  console.log(entry);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
