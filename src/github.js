import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function friendlyGhError(args, err) {
  const detail = (err.stderr || err.message || "").trim();
  const lower = detail.toLowerCase();
  const cmd = `gh ${args.join(" ")}`;

  if (err.code === "ENOENT") {
    return (
      "GitHub CLI (`gh`) not found. Install it from https://cli.github.com/ " +
      "and run `gh auth login`, then try again."
    );
  }

  if (/could not resolve to a pullrequest|could not find|no pull requests found|not found/i.test(detail)) {
    return (
      `No pull request found for that reference.\n` +
      `A bare number (e.g. \`42\`) only looks in the repo of your current directory.\n` +
      `From anywhere, pass a URL or \`owner/repo#42\`:\n` +
      `  pr-explainer https://github.com/owner/repo/pull/42\n` +
      `  pr-explainer owner/repo#42\n\n` +
      `(${cmd})\n${detail}`
    );
  }

  if (/not a git repository|failed to run git|no git remotes/i.test(lower)) {
    return (
      `A bare PR number needs a git repo with a GitHub remote in the current directory.\n` +
      `Pass a full URL instead, or \`cd\` into the repo first.\n\n` +
      `(${cmd})\n${detail}`
    );
  }

  if (/auth|login|http 401|http 403|forbidden|bad credentials/i.test(lower)) {
    return (
      `GitHub auth failed. Run \`gh auth login\` and retry.\n\n` +
      `(${cmd})\n${detail}`
    );
  }

  return `gh command failed: ${cmd}\n${detail}`;
}

async function gh(args) {
  try {
    const { stdout } = await execFileAsync("gh", args);
    return stdout;
  } catch (err) {
    throw new Error(friendlyGhError(args, err));
  }
}

// Accepts a bare number ("42"), a PR URL, or "owner/repo#42" — anything
// `gh pr view` itself understands. A URL/owner-repo form works from any
// directory; a bare number resolves against the repo in cwd.
export async function getPR(prRef) {
  const json = await gh([
    "pr",
    "view",
    String(prRef),
    "--json",
    "number,title,body,mergedAt,url",
  ]);
  const pr = JSON.parse(json);
  if (!pr.mergedAt) {
    throw new Error(
      `PR ${prRef} is not merged yet.\n` +
        `pr-explainer only explains merged PRs (past changes that actually shipped).\n` +
        `Pick a merged PR, or wait until this one lands.`
    );
  }
  return pr;
}

export async function getPRDiff(prRef) {
  return gh(["pr", "diff", String(prRef)]);
}

/**
 * Repo metadata for the GitHub remote of a local checkout (or cwd).
 * Runs `gh` with cwd set so bare invocations resolve the right repo.
 */
export async function getRepoIdentity(repoRoot = process.cwd()) {
  const json = await ghIn(repoRoot, [
    "repo",
    "view",
    "--json",
    "name,description,url,repositoryTopics,nameWithOwner,defaultBranchRef",
  ]);
  const data = JSON.parse(json);
  const topics = Array.isArray(data.repositoryTopics)
    ? data.repositoryTopics
        .map((t) => (typeof t === "string" ? t : t?.name))
        .filter(Boolean)
    : [];
  return {
    name: data.name || null,
    nameWithOwner: data.nameWithOwner || null,
    description: data.description || null,
    url: data.url || null,
    topics,
    defaultBranch: data.defaultBranchRef?.name || null,
  };
}

/** Recent merged PRs for orientation — titles + bodies, not diffs. */
export async function getRecentMergedPRs(repoRoot = process.cwd(), limit = 8) {
  const json = await ghIn(repoRoot, [
    "pr",
    "list",
    "--state",
    "merged",
    "--limit",
    String(limit),
    "--json",
    "number,title,body,url,mergedAt",
  ]);
  return JSON.parse(json);
}

async function ghIn(cwd, args) {
  try {
    const { stdout } = await execFileAsync("gh", args, { cwd });
    return stdout;
  } catch (err) {
    throw new Error(friendlyGhError(args, err));
  }
}
