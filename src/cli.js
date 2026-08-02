#!/usr/bin/env node
import { readFile, writeFile, mkdir, appendFile, copyFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getPR, getPRDiff } from "./github.js";
import { buildPrompt, buildRepoPrompt } from "./prompt.js";
import { runClaude } from "./claude.js";
import { printExplainerSummary } from "./display.js";
import { runInteractiveQuiz } from "./quiz.js";
import { gatherRepoContext } from "./repo-context.js";
import { capture, captureAiGeneration, getDeviceId, shutdown } from "./posthog.js";

const MAX_DIFF_CHARS = 60_000;
const HOME = os.homedir();
const NEW_CONFIG_DIR = path.join(HOME, ".code-explainer");
const LEGACY_CONFIG_DIR = path.join(HOME, ".pr-explainer");
const LOCAL_PROFILE = "learning-profile.md";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "learning-profile.example.md"
);

const invokedAs = path.basename(process.argv[1] || "code-explainer").replace(
  /\.(js|mjs|cjs)$/i,
  ""
);
const CLI_NAME =
  invokedAs === "pr-explainer" || invokedAs === "code-explainer"
    ? invokedAs
    : "code-explainer";
const isLegacyBin = CLI_NAME === "pr-explainer";

function resolveConfigDir() {
  if (existsSync(NEW_CONFIG_DIR)) return NEW_CONFIG_DIR;
  if (existsSync(LEGACY_CONFIG_DIR)) return LEGACY_CONFIG_DIR;
  return NEW_CONFIG_DIR;
}

function configPaths() {
  const configDir = resolveConfigDir();
  return {
    configDir,
    globalProfile: path.join(configDir, "learning-profile.md"),
    globalExplainers: path.join(configDir, "explainers"),
  };
}

function usage() {
  console.error(
    `Usage: ${CLI_NAME} init [--force]
       ${CLI_NAME} pr <PR> [--no-quiz]
       ${CLI_NAME} repo [path] [--no-quiz]
${
  isLegacyBin
    ? `       ${CLI_NAME} <PR> [--no-quiz]          (legacy shorthand for pr)\n`
    : ""
}
Explain merged pull requests — or a whole repository — in plain language,
tailored to your learning profile. Ends with a multiple-choice Quick check.

  init   create ~/.code-explainer/learning-profile.md from the template
         (falls back to ~/.pr-explainer/ if you already have one)
  pr     explain a merged PR: number ("42"), URL, or "owner/repo#42"
         (a bare number resolves against the repo in your current directory)
  repo   explain what a local git checkout does (default: current directory).
         Requires Graphify:  uv tool install graphifyy

Requires:
  - Claude Code CLI ("claude") installed and logged in
  - GitHub CLI ("gh") authenticated
  - For repo mode: Graphify CLI ("graphify")

Env:
  LEARNING_PROFILE      optional path to profile file
  EXPLAINER_DIR         optional output dir
  PR_EXPLAINER_NO_QUIZ  set to 1 to skip the interactive quiz
  PR_EXPLAINER_QUIET    set to 1 to skip printing the summary to stderr

Install:
  npm install -g @shilpi1958/code-explainer
  # repo mode also needs:
  uv tool install graphifyy
`
  );
}

function parseArgs(argv) {
  const flags = { noQuiz: false, force: false, help: false };
  const positionals = [];
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") flags.help = true;
    else if (arg === "--no-quiz") flags.noQuiz = true;
    else if (arg === "--force") flags.force = true;
    else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}\nRun ${CLI_NAME} --help for usage.`);
    } else positionals.push(arg);
  }
  return { flags, positionals };
}

function looksLikePrRef(arg) {
  if (!arg) return false;
  if (/^\d+$/.test(arg)) return true;
  if (/^https?:\/\//i.test(arg)) return true;
  if (/^[^/\s]+\/[^#\s]+#\d+$/.test(arg)) return true;
  return false;
}

function resolveProfilePath() {
  const { globalProfile } = configPaths();
  if (process.env.LEARNING_PROFILE) return process.env.LEARNING_PROFILE;
  if (existsSync(LOCAL_PROFILE)) return path.resolve(LOCAL_PROFILE);
  return globalProfile;
}

async function loadProfile() {
  const profilePath = resolveProfilePath();
  if (!existsSync(profilePath)) {
    if (process.env.LEARNING_PROFILE) {
      throw new Error(
        `No profile found at LEARNING_PROFILE=${profilePath}.\n` +
          `Fix that path, or unset LEARNING_PROFILE and run \`${CLI_NAME} init\`.`
      );
    }
    const { globalProfile } = configPaths();
    throw new Error(
      `No profile found. Run \`${CLI_NAME} init\`, then edit ` +
        `${globalProfile} to describe yourself.`
    );
  }
  const profile = await readFile(profilePath, "utf8");
  if (!profile.trim()) {
    throw new Error(
      `Profile at ${profilePath} is empty. Add your role and what you're ` +
        `trying to understand, then retry.`
    );
  }
  return profile;
}

async function initProfile(force = false) {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }
  // Prefer creating under the new config dir going forward
  const configDir = existsSync(LEGACY_CONFIG_DIR) && !existsSync(NEW_CONFIG_DIR) && !force
    ? LEGACY_CONFIG_DIR
    : NEW_CONFIG_DIR;
  const globalProfile = path.join(configDir, "learning-profile.md");

  await mkdir(configDir, { recursive: true });
  if (existsSync(globalProfile) && !force) {
    console.error(
      `Profile already exists at ${globalProfile}\n` +
        `Edit it in place, or re-run with --force to overwrite from the template.`
    );
    const deviceId = await getDeviceId();
    capture("profile_initialized", deviceId, { force: false, created: false });
    return;
  }
  await copyFile(TEMPLATE_PATH, globalProfile);
  console.error(`Created ${globalProfile}`);
  console.error(
    `Edit that file to describe your role, then run \`${CLI_NAME} pr <PR>\` or \`${CLI_NAME} repo\`.`
  );
  const deviceId = await getDeviceId();
  capture("profile_initialized", deviceId, { force, created: true });
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

function repoSlug(identity, repoRoot) {
  const raw =
    identity?.nameWithOwner ||
    identity?.name ||
    path.basename(repoRoot);
  return slugify(String(raw).replace(/\//g, "-")) || "repo";
}

function defaultExplainerDir() {
  return process.env.EXPLAINER_DIR || configPaths().globalExplainers;
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

async function appendToRepoIndex(outDir, { filename, title, identity }) {
  const indexPath = path.join(outDir, "index.md");
  if (!existsSync(indexPath)) {
    await writeFile(
      indexPath,
      "# Repo explainers\n\nRepositories explained so far, most recent first.\n\n" +
        "| Date | Repo | Title | Entry |\n|---|---|---|---|\n",
      "utf8"
    );
  }
  const date = new Date().toISOString().slice(0, 10);
  const repoLabel = identity?.nameWithOwner || identity?.name || "repo";
  const repoLink = identity?.url || "";
  const repoCell = repoLink ? `[${repoLabel}](${repoLink})` : repoLabel;
  const row = `| ${date} | ${repoCell} | ${title} | [${filename}](${filename}) |\n`;
  await appendFile(indexPath, row, "utf8");
}

async function explainPR(prRef, flags, profile) {
  const pr = await getPR(prRef);
  let diff = await getPRDiff(prRef);
  if (diff.length > MAX_DIFF_CHARS) {
    diff =
      diff.slice(0, MAX_DIFF_CHARS) +
      `\n\n... (diff truncated at ${MAX_DIFF_CHARS} chars)`;
  }

  console.error(`Generating explainer for PR #${pr.number}: ${pr.title}`);

  const prompt = buildPrompt({ profile, pr, diff });
  const deviceId = await getDeviceId();
  capture("explainer_generation_started", deviceId, {
    mode: "pr",
    pr_number: pr.number,
    diff_truncated: diff.length >= MAX_DIFF_CHARS,
  });
  const started = Date.now();
  let entry;
  try {
    entry = await runClaude(prompt);
  } catch (err) {
    captureAiGeneration(deviceId, {
      prompt,
      output: "",
      latencySec: (Date.now() - started) / 1000,
      mode: "pr",
      error: err.message,
      properties: {
        pr_number: pr.number,
        diff_truncated: diff.length >= MAX_DIFF_CHARS,
      },
    });
    throw err;
  }
  const latencySec = (Date.now() - started) / 1000;

  const titleMatch = entry.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : pr.title;

  const outDir = defaultExplainerDir();
  await mkdir(outDir, { recursive: true });
  const num = nextEntryNumber(outDir);
  const filename = `${num}-${slugify(title)}.md`;
  const outPath = path.join(outDir, filename);

  await writeFile(outPath, entry + "\n", "utf8");
  await appendToIndex(outDir, { filename, title, pr });
  console.log(outPath);

  captureAiGeneration(deviceId, {
    prompt,
    output: entry,
    latencySec,
    mode: "pr",
    properties: {
      pr_number: pr.number,
      diff_truncated: diff.length >= MAX_DIFF_CHARS,
    },
  });
  capture("explainer_generated", deviceId, {
    mode: "pr",
    pr_number: pr.number,
    quiz_enabled: !flags.noQuiz,
    diff_truncated: diff.length >= MAX_DIFF_CHARS,
    latency_sec: latencySec,
  });
  capture("pr_explained", deviceId, {
    pr_number: pr.number,
    quiz_enabled: !flags.noQuiz,
    diff_truncated: diff.length >= MAX_DIFF_CHARS,
    latency_sec: latencySec,
  });

  printExplainerSummary(entry);
  await runInteractiveQuiz(entry, flags, outPath);
}

async function explainRepo(repoPath, flags, profile) {
  const root = path.resolve(repoPath || process.cwd());
  if (!existsSync(root)) {
    throw new Error(`Path not found: ${root}`);
  }

  console.error(`Gathering repo context for ${root}…`);
  const ctx = await gatherRepoContext(root);
  const label = ctx.identity?.nameWithOwner || ctx.identity?.name || path.basename(root);
  console.error(`Generating repo explainer for ${label}…`);

  const prompt = buildRepoPrompt({
    profile,
    identity: ctx.identity,
    graphifyReport: ctx.report,
    graphSummary: ctx.graphSummary,
    recentPrs: ctx.recentPrs,
  });
  const deviceId = await getDeviceId();
  capture("explainer_generation_started", deviceId, {
    mode: "repo",
    repo_name: ctx.identity?.nameWithOwner ?? ctx.identity?.name ?? null,
  });
  const started = Date.now();
  let entry;
  try {
    entry = await runClaude(prompt);
  } catch (err) {
    captureAiGeneration(deviceId, {
      prompt,
      output: "",
      latencySec: (Date.now() - started) / 1000,
      mode: "repo",
      error: err.message,
      properties: {
        repo_name: ctx.identity?.nameWithOwner ?? ctx.identity?.name ?? null,
      },
    });
    throw err;
  }
  const latencySec = (Date.now() - started) / 1000;

  const titleMatch = entry.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : label;

  const outDir = path.join(defaultExplainerDir(), "repos");
  await mkdir(outDir, { recursive: true });
  const num = nextEntryNumber(outDir);
  const filename = `${num}-${repoSlug(ctx.identity, root)}.md`;
  const outPath = path.join(outDir, filename);

  await writeFile(outPath, entry + "\n", "utf8");
  await appendToRepoIndex(outDir, {
    filename,
    title,
    identity: ctx.identity,
  });
  console.log(outPath);

  captureAiGeneration(deviceId, {
    prompt,
    output: entry,
    latencySec,
    mode: "repo",
    properties: {
      repo_name: ctx.identity?.nameWithOwner ?? ctx.identity?.name ?? null,
    },
  });
  capture("explainer_generated", deviceId, {
    mode: "repo",
    repo_name: ctx.identity?.nameWithOwner ?? ctx.identity?.name ?? null,
    quiz_enabled: !flags.noQuiz,
    latency_sec: latencySec,
  });
  capture("repo_explained", deviceId, {
    repo_name: ctx.identity?.nameWithOwner ?? ctx.identity?.name ?? null,
    quiz_enabled: !flags.noQuiz,
    latency_sec: latencySec,
  });

  printExplainerSummary(entry);
  await runInteractiveQuiz(entry, flags, outPath);
}

async function main() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];

  if (flags.help || !command) {
    usage();
    process.exitCode = flags.help ? 0 : 1;
    return;
  }

  if (command === "init") {
    await initProfile(flags.force);
    return;
  }

  const profile = await loadProfile();

  if (command === "repo") {
    const repoPath = positionals[1] || process.cwd();
    await explainRepo(repoPath, flags, profile);
    return;
  }

  if (command === "pr") {
    const prRef = positionals[1];
    if (!prRef) {
      console.error(`Missing PR reference.\nRun ${CLI_NAME} --help for usage.`);
      process.exitCode = 1;
      return;
    }
    await explainPR(prRef, flags, profile);
    return;
  }

  // Legacy: `pr-explainer <PR>` without the `pr` subcommand
  if (isLegacyBin && looksLikePrRef(command)) {
    await explainPR(command, flags, profile);
    return;
  }

  // Helpful nudge for the new UX
  if (looksLikePrRef(command)) {
    throw new Error(
      `Pass the PR after the \`pr\` subcommand:\n` +
        `  ${CLI_NAME} pr ${command}\n\n` +
        `Or run \`${CLI_NAME} --help\`.`
    );
  }

  throw new Error(
    `Unknown command: ${command}\nRun ${CLI_NAME} --help for usage.`
  );
}

main()
  .catch(async (err) => {
    try {
      const deviceId = await getDeviceId();
      capture("cli_error", deviceId, { error_type: err.constructor?.name ?? "Error" });
    } catch {
      // analytics failure must not alter exit behavior
    }
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdown();
  });
