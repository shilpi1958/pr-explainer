import { execFile } from "node:child_process";

function friendlyClaudeError(detail) {
  const text = detail || "";
  const lower = text.toLowerCase();

  if (/spending cap|usage limit|rate limit|quota/i.test(text)) {
    return (
      `${text.trim()}\n\n` +
      `Your Claude Code plan has hit its usage limit. Wait for the reset, ` +
      `raise the cap in your Claude account, or try again later.`
    );
  }
  if (/not logged in|unauthorized|authentication|please run.*login|login required/i.test(lower)) {
    return (
      `${text.trim()}\n\n` +
      `Run \`claude\` once in your terminal to log in, then retry.`
    );
  }
  return text.trim() || "unknown error from claude CLI";
}

export function runClaude(prompt, { model } = {}) {
  const args = ["-p", "--output-format", "text"];
  if (model) args.push("--model", model);

  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      args,
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          if (err.code === "ENOENT") {
            reject(
              new Error(
                "Claude Code CLI not found. Install it from https://claude.com/claude-code " +
                  "and run `claude` once to log in (subscription or API key), then try again."
              )
            );
            return;
          }
          const detail = [stderr, stdout]
            .map((s) => s?.trim())
            .filter(Boolean)
            .join("\n");
          reject(new Error(`claude -p failed: ${friendlyClaudeError(detail || err.message)}`));
          return;
        }

        const out = (stdout || "").trim();
        // Some limit/auth failures exit 0 but only print a short status line.
        if (!out || (/spending cap|usage limit|rate limit|quota|not logged in/i.test(out) && !/^#\s/m.test(out))) {
          reject(new Error(`claude -p failed: ${friendlyClaudeError(out || "empty response")}`));
          return;
        }
        resolve(out);
      }
    );
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
