import readline from "node:readline/promises";
import { stdin as input, stdout as output, stderr } from "node:process";

/**
 * Pull Q&A pairs from a "## Quick check" section written with
 * **Q1. …** and <details><summary>Answer</summary>…</details>.
 */
export function parseQuiz(markdown) {
  const section = markdown.match(/##\s+Quick check\b([\s\S]*?)(?=\n##\s+|$)/i);
  if (!section) return [];

  const body = section[1];
  const pairs = [];
  const re =
    /\*\*Q\d+\.\s*([\s\S]*?)\*\*\s*<details>\s*<summary>\s*Answer\s*<\/summary>\s*([\s\S]*?)<\/details>/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const question = match[1].replace(/\s+/g, " ").trim();
    const answer = match[2].trim();
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

function shouldRunQuiz(flags) {
  if (flags.noQuiz) return false;
  if (process.env.PR_EXPLAINER_NO_QUIZ === "1") return false;
  return Boolean(input.isTTY && output.isTTY);
}

/**
 * Ask each question in the terminal, then reveal the stored answer.
 * Does not grade the response — the point is recall, not scoring.
 */
export async function runInteractiveQuiz(markdown, flags = {}) {
  if (!shouldRunQuiz(flags)) return;

  const items = parseQuiz(markdown);
  if (!items.length) {
    stderr.write(
      "No Quick check questions found in the explainer; skipping quiz.\n"
    );
    return;
  }

  const rl = readline.createInterface({ input, output: stderr });
  stderr.write(
    `\nQuick check — ${items.length} question${items.length === 1 ? "" : "s"}. ` +
      `Type an answer, then Enter (blank to skip).\n`
  );

  try {
    for (let i = 0; i < items.length; i++) {
      const { question, answer } = items[i];
      stderr.write(`\nQ${i + 1}. ${question}\n`);
      const attempt = (await rl.question("Your answer: ")).trim();
      if (attempt) {
        stderr.write(`You said: ${attempt}\n`);
      } else {
        stderr.write("(skipped)\n");
      }
      stderr.write(`Answer: ${answer}\n`);
    }
    stderr.write("\n");
  } finally {
    rl.close();
  }
}
