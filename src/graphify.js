import { readFile, access } from "node:fs/promises";
import { existsSync, constants as fsConstants } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPORT_BUDGET = 20_000;
const SUMMARY_BUDGET = 4_000;

function truncate(text, max, label) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max) + `\n\n... (${label} truncated at ${max} chars)`;
}

function friendlyGraphifyMissing() {
  return (
    "Graphify CLI (`graphify`) not found.\n" +
    "Repo mode needs Graphify to build a knowledge graph of the checkout.\n" +
    "Install it with:\n" +
    "  uv tool install graphifyy\n" +
    "  # or: pipx install graphifyy\n" +
    "Then retry. Docs: https://graphify.com/docs"
  );
}

async function runGraphify(args, { cwd } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync("graphify", args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout || "", stderr: stderr || "" };
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(friendlyGraphifyMissing());
    }
    const detail = [err.stderr, err.stdout, err.message]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(`graphify ${args.join(" ")} failed:\n${detail}`);
  }
}

/**
 * Ensure Graphify has produced graphify-out/ for this checkout, then
 * return truncated report + compact god-nodes summary for the prompt.
 * Never returns full graph.json.
 */
export async function ensureGraphifyContext(repoRoot, { forceUpdate = false } = {}) {
  const root = path.resolve(repoRoot);
  const outDir = path.join(root, "graphify-out");
  const reportPath = path.join(outDir, "GRAPH_REPORT.md");
  const graphPath = path.join(outDir, "graph.json");

  const hasReport = existsSync(reportPath);
  const hasGraph = existsSync(graphPath);

  if (!hasReport || !hasGraph || forceUpdate) {
    process.stderr.write("Building knowledge graph with Graphify…\n");
    await runGraphify(["update", "."], { cwd: root });
  }

  if (!existsSync(reportPath)) {
    throw new Error(
      `Graphify finished but ${reportPath} is missing.\n` +
        `Try: cd ${root} && graphify update .`
    );
  }

  const report = truncate(
    await readFile(reportPath, "utf8"),
    REPORT_BUDGET,
    "GRAPH_REPORT"
  );

  let graphSummary = "";
  try {
    await access(graphPath, fsConstants.R_OK);
    const { stdout } = await runGraphify(
      ["god-nodes", "--top", "10", "--graph", graphPath],
      { cwd: root }
    );
    graphSummary = truncate(stdout.trim(), SUMMARY_BUDGET, "god-nodes");
  } catch (err) {
    if (err.message?.includes("graphify") && err.message?.includes("not found")) {
      throw err;
    }
    graphSummary = `(god-nodes unavailable: ${err.message})`;
  }

  return {
    outDir,
    reportPath,
    report,
    graphSummary,
  };
}

export { REPORT_BUDGET, SUMMARY_BUDGET };
