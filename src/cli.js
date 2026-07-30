#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { getPR, getPRDiff, getCurrentBranchPR } from "./github.js";
import { buildPrompt } from "./prompt.js";

const MAX_DIFF_CHARS = 60_000;

function usage() {
  console.error(
    `Usage: pr-learning-log [PR_NUMBER]

Generates a learning-log entry for a merged PR, tailored to your
learning-profile.md.

  PR_NUMBER   optional; defaults to the PR for the current branch

Env:
  ANTHROPIC_API_KEY   required
  LEARNING_PROFILE    optional path to profile file (default: ./learning-profile.md)
  LEARNING_LOG_DIR    optional output dir (default: ./docs/learning-log)
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

async function main() {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help") {
    usage();
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set.");
    usage();
    process.exitCode = 1;
    return;
  }

  const profile = await loadProfile();

  const pr = arg ? await getPR(arg) : await getCurrentBranchPR();
  let diff = await getPRDiff(pr.number);
  if (diff.length > MAX_DIFF_CHARS) {
    diff =
      diff.slice(0, MAX_DIFF_CHARS) +
      `\n\n... (diff truncated at ${MAX_DIFF_CHARS} chars)`;
  }

  console.error(`Generating learning-log entry for PR #${pr.number}: ${pr.title}`);

  const client = new Anthropic();
  const prompt = buildPrompt({ profile, pr, diff });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const entry = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const titleMatch = entry.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : pr.title;

  const outDir = process.env.LEARNING_LOG_DIR || path.join("docs", "learning-log");
  await mkdir(outDir, { recursive: true });
  const num = nextEntryNumber(outDir);
  const filename = `${num}-${slugify(title)}.md`;
  const outPath = path.join(outDir, filename);

  await writeFile(outPath, entry + "\n", "utf8");
  console.log(outPath);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
