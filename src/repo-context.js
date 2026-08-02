import path from "node:path";
import { ensureGraphifyContext } from "./graphify.js";
import { getRepoIdentity, getRecentMergedPRs } from "./github.js";

const BUDGET = {
  recentPrs: 7_000,
  packTotal: 55_000,
};

function truncate(text, max, label) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max) + `\n\n... (${label} truncated at ${max} chars)`;
}

function formatRecentPrs(prs, budget = BUDGET.recentPrs) {
  if (!prs.length) return "(no recent merged PRs found)";
  const parts = [];
  let used = 0;
  for (const pr of prs) {
    const body = truncate(
      (pr.body || "").trim() || "(no description)",
      600,
      `PR #${pr.number}`
    );
    const block = `#${pr.number} ${pr.title}\n${body}`;
    if (used + block.length > budget && parts.length) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}

function packSize({ identity, report, graphSummary, recentPrs }) {
  return (
    JSON.stringify(identity || {}).length +
    (report || "").length +
    (graphSummary || "").length +
    (recentPrs || "").length
  );
}

/**
 * Graphify-backed context pack for repo explainers.
 * Local checkout with a GitHub remote expected.
 */
export async function gatherRepoContext(repoPath = process.cwd()) {
  const repoRoot = path.resolve(repoPath);

  const graphify = await ensureGraphifyContext(repoRoot);

  let identity;
  try {
    identity = await getRepoIdentity(repoRoot);
  } catch (err) {
    identity = {
      name: path.basename(repoRoot),
      nameWithOwner: null,
      description: null,
      url: null,
      topics: [],
      error: err.message,
    };
  }

  let recentPrList = [];
  try {
    recentPrList = await getRecentMergedPRs(repoRoot, 8);
  } catch {
    recentPrList = [];
  }

  let report = graphify.report;
  let graphSummary = graphify.graphSummary;
  let recentPrs = truncate(
    formatRecentPrs(recentPrList),
    BUDGET.recentPrs,
    "recent PRs"
  );

  // Prefer cutting PR bodies / report before god-nodes summary.
  let total = packSize({ identity, report, graphSummary, recentPrs });
  if (total > BUDGET.packTotal) {
    recentPrs = truncate(recentPrs, 1_500, "recent PRs");
    total = packSize({ identity, report, graphSummary, recentPrs });
  }
  if (total > BUDGET.packTotal) {
    report = truncate(report, 8_000, "GRAPH_REPORT");
    total = packSize({ identity, report, graphSummary, recentPrs });
  }
  if (total > BUDGET.packTotal) {
    graphSummary = truncate(graphSummary, 1_500, "god-nodes");
  }

  return {
    repoRoot,
    identity,
    report,
    graphSummary,
    recentPrs,
    recentPrMeta: recentPrList.map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
    })),
  };
}

export { BUDGET };
