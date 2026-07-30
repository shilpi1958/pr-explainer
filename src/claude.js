import { execFile } from "node:child_process";

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
          reject(new Error(`claude -p failed: ${stderr || err.message}`));
          return;
        }
        resolve(stdout.trim());
      }
    );
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
