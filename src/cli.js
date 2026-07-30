#!/usr/bin/env node
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { getPR, getPRDiff } from "./github.js";
import { buildPrompt } from "./prompt.js";
import { runClaude } from "./claude.js";

const MAX_DIFF_CHARS = 60_000;

function usage() {
  console.error(
    `Usage: pr-explainer <PR>

Explains a merged pull request in plain language, tailored to your
learning-profile.md — however technical or non-technical you are, and
whether or not you wrote the PR yourself. Ends with a couple of quick
recall questions so it's something you retain, not just read.

  PR   a PR number ("42"), a PR URL, or "owner/repo#42"
       (a bare number resolves against the repo in your current directory)

Requires the Claude Code CLI ("claude") installed and logged in
(subscription or API key — whatever you already use for \`claude\`), and
the GitHub CLI ("gh") authenticated.

Env:
  LEARNING_PROFILE   optional path to profile file (default: ./learning-profile.md)
  EXPLAINER_DIR      optional output dir (default: ./docs/explainers)
`
  );
}

async function loadProfile() {
  const profilePath = process.env.LEARNING_PROFILE || "learning-profile.md";
  if (!existsSync(profilePath)) {
    throw new Error(
      `No profile found at ${profilePath}. Copy templates/learning-profile.example.md ` +
        `into your repo as learning-profile.md and fill it in.`
    );
  }
  return readFile(profilePath, "utf8");
}

function nextEntryNumber(dir) {
  if (!existsSync(dir)) return "01";
  const files = readdirSync(dir);
  const nums = files
    .map((f) => f.match(/^(\d+)-/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(2, "0");
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function appendToIndex(outDir, { filename, title, pr }) {
  const indexPath = path.join(outDir, "index.md");
  if (!existsSync(indexPath)) {
    await writeFile(
      indexPath,
      "# Explainers\n\nEvery PR explained so far, most recent first.\n\n" +
        "| Date | PR | Title | Entry |\n|---|---|---|---|\n",
      "utf8"
    );
  }
  const date = new Date().toISOString().slice(0, 10);
  const prLink = pr.url || `#${pr.number}`;
  const row = `| ${date} | [#${pr.number}](${prLink}) | ${title} | [${filename}](${filename}) |\n`;
  await appendFile(indexPath, row, "utf8");
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg === "-h" || arg === "--help") {
    usage();
    process.exitCode = arg ? 0 : 1;
    return;
  }

  const profile = await loadProfile();

  const pr = await getPR(arg);
  let diff = await getPRDiff(arg);
  if (diff.length > MAX_DIFF_CHARS) {
    diff =
      diff.slice(0, MAX_DIFF_CHARS) +
      `\n\n... (diff truncated at ${MAX_DIFF_CHARS} chars)`;
  }

  console.error(`Generating explainer for PR #${pr.number}: ${pr.title}`);

  const prompt = buildPrompt({ profile, pr, diff });
  const entry = await runClaude(prompt);

  const titleMatch = entry.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : pr.title;

  const outDir = process.env.EXPLAINER_DIR || path.join("docs", "explainers");
  await mkdir(outDir, { recursive: true });
  const num = nextEntryNumber(outDir);
  const filename = `${num}-${slugify(title)}.md`;
  const outPath = path.join(outDir, filename);

  await writeFile(outPath, entry + "\n", "utf8");
  await appendToIndex(outDir, { filename, title, pr });
  console.log(outPath);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
