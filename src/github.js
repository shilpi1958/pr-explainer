import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function gh(args) {
  try {
    const { stdout } = await execFileAsync("gh", args);
    return stdout;
  } catch (err) {
    throw new Error(
      `gh command failed: gh ${args.join(" ")}\n${err.stderr || err.message}`
    );
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
    throw new Error(`PR ${prRef} is not merged yet.`);
  }
  return pr;
}

export async function getPRDiff(prRef) {
  return gh(["pr", "diff", String(prRef)]);
}
