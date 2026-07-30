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

export async function getPR(prNumber) {
  const json = await gh([
    "pr",
    "view",
    String(prNumber),
    "--json",
    "number,title,body,mergedAt",
  ]);
  const pr = JSON.parse(json);
  if (!pr.mergedAt) {
    throw new Error(`PR #${prNumber} is not merged yet.`);
  }
  return pr;
}

export async function getPRDiff(prNumber) {
  return gh(["pr", "diff", String(prNumber)]);
}

export async function getCurrentBranchPR() {
  const json = await gh([
    "pr",
    "view",
    "--json",
    "number,title,body,mergedAt",
  ]);
  return JSON.parse(json);
}
