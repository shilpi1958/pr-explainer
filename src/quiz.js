import readline from "node:readline/promises";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output, stderr } from "node:process";

const useColor = Boolean(stderr.isTTY);

function paint(code, text) {
  if (!useColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

const dim = (t) => paint("2", t);
const bold = (t) => paint("1", t);
const green = (t) => paint("32", t);
const red = (t) => paint("31", t);
const cyan = (t) => paint("36", t);

/**
 * Pull quiz items from a "## Quick check" section.
 * Multiple-choice (preferred): **Q1. …** then - A)/B)/C) options and a
 * <details> Answer block with "Correct: A|B|C".
 * Freeform (legacy): same Q + details without options → Enter-to-reveal.
 */
export function parseQuiz(markdown) {
  const section = markdown.match(/##\s+Quick check\b([\s\S]*?)(?=\n##\s+|$)/i);
  if (!section) return [];

  const body = section[1];
  const items = [];
  const re =
    /\*\*Q\d+\.\s*([\s\S]*?)\*\*\s*([\s\S]*?)<details>\s*<summary>\s*Answer\s*<\/summary>\s*([\s\S]*?)<\/details>/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const question = match[1].replace(/\s+/g, " ").trim();
    const between = match[2];
    const answerBody = match[3].trim();
    if (!question || !answerBody) continue;

    const options = parseOptions(between);
    const correctLetter = parseCorrectLetter(answerBody);
    const explanation = stripCorrectPrefix(answerBody);

    if (options.length === 3 && correctLetter) {
      const correctIndex = correctLetter.charCodeAt(0) - 65;
      items.push({
        type: "mc",
        question,
        options,
        correctIndex,
        explanation,
      });
    } else {
      items.push({
        type: "freeform",
        question,
        answer: answerBody,
      });
    }
  }
  return items;
}

function parseOptions(text) {
  const options = [];
  const re = /^[ \t]*[-*]?\s*[A-Ca-c][).:\]]\s*(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    options.push(m[1].replace(/\s+/g, " ").trim());
    if (options.length === 3) break;
  }
  return options;
}

function parseCorrectLetter(answerBody) {
  const m = answerBody.match(/^\s*Correct:\s*([A-Ca-c])\b/i);
  return m ? m[1].toUpperCase() : null;
}

function stripCorrectPrefix(answerBody) {
  return answerBody.replace(/^\s*Correct:\s*[A-Ca-c]\.?\s*/i, "").trim();
}

function shouldRunQuiz(flags) {
  if (flags.noQuiz) return false;
  if (process.env.PR_EXPLAINER_NO_QUIZ === "1") return false;
  return Boolean(input.isTTY && output.isTTY);
}

function letterOf(index) {
  return String.fromCharCode(65 + index);
}

function parseChoice(raw, optionCount) {
  const s = raw.trim().toLowerCase();
  if (!s) return "skip";
  if (s === "q") return "quit";
  if (/^[abc]$/.test(s)) {
    const idx = s.charCodeAt(0) - 97;
    return idx < optionCount ? idx : null;
  }
  if (/^[123]$/.test(s)) {
    const idx = Number(s) - 1;
    return idx < optionCount ? idx : null;
  }
  return null;
}

async function openExplainer(outPath) {
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (editor) {
    await new Promise((resolve, reject) => {
      const child = spawn(editor, [outPath], {
        stdio: "inherit",
        shell: true,
      });
      child.on("error", reject);
      child.on("close", () => resolve());
    });
    return;
  }
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  await new Promise((resolve) => {
    const child = spawn(cmd, [outPath], {
      stdio: "ignore",
      shell: process.platform === "win32",
      detached: true,
    });
    child.on("error", () => resolve());
    child.unref();
    resolve();
  });
}

/**
 * Interactive Quick check: multiple-choice when options are present,
 * Enter-to-reveal for legacy freeform Q&A. Pass outPath to offer opening
 * the saved explainer afterward.
 */
export async function runInteractiveQuiz(markdown, flags = {}, outPath) {
  if (!shouldRunQuiz(flags)) return;

  const items = parseQuiz(markdown);
  if (!items.length) {
    stderr.write(
      "No Quick check questions found in the explainer; skipping quiz.\n"
    );
    return;
  }

  const rl = readline.createInterface({ input, output: stderr });
  const n = items.length;

  let quitEarly = false;

  try {
    await rl.question(dim("Press Enter for CHECK IT STUCK… "));

    stderr.write("\n");
    stderr.write(cyan(bold("CHECK IT STUCK")) + "\n");
    stderr.write(
      dim(
        `Quick check · ${n} question${n === 1 ? "" : "s"} · ` +
          `a/b/c or 1/2/3 · Enter skip · q quit\n`
      )
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const progress = dim(`${i + 1} of ${n}`);

      stderr.write(`\n${progress}\n`);
      stderr.write(bold(item.question) + "\n");

      if (item.type === "mc") {
        for (let j = 0; j < item.options.length; j++) {
          stderr.write(
            `  ${dim(letterOf(j) + ")")} ${item.options[j]}\n`
          );
        }
        const raw = await rl.question(dim("Your choice: "));
        const choice = parseChoice(raw, item.options.length);

        if (choice === "quit") {
          quitEarly = true;
          stderr.write(dim("(quiz quit)\n"));
          break;
        }
        if (choice === "skip") {
          stderr.write(dim("(skipped)\n"));
          const correct = item.options[item.correctIndex];
          stderr.write(
            green("✓ correct") +
              ` ${dim(letterOf(item.correctIndex) + ")")} ${correct}\n`
          );
          if (item.explanation) {
            stderr.write(dim(item.explanation) + "\n");
          }
          continue;
        }
        if (choice === null) {
          stderr.write(dim("Pick A/B/C (or 1/2/3), Enter to skip, q to quit.\n"));
          i -= 1;
          continue;
        }

        if (choice === item.correctIndex) {
          stderr.write(
            green(bold("✓ correct")) +
              `  ${letterOf(choice)}) ${item.options[choice]}\n`
          );
        } else {
          stderr.write(
            red("✗") +
              `  ${letterOf(choice)}) ${item.options[choice]}\n`
          );
          stderr.write(
            green("✓ correct") +
              `  ${letterOf(item.correctIndex)}) ${item.options[item.correctIndex]}\n`
          );
        }
        if (item.explanation) {
          stderr.write(dim(item.explanation) + "\n");
        }
      } else {
        stderr.write(
          dim("Type an answer, Enter to reveal, or q to quit.\n")
        );
        const attempt = (await rl.question(dim("Your answer: "))).trim();
        if (attempt.toLowerCase() === "q") {
          quitEarly = true;
          stderr.write(dim("(quiz quit)\n"));
          break;
        }
        if (attempt) {
          stderr.write(`You said: ${attempt}\n`);
        } else {
          stderr.write(dim("(skipped)\n"));
        }
        stderr.write(green("Answer: ") + item.answer + "\n");
      }
    }

    if (!quitEarly) {
      stderr.write(
        "\n" +
          dim(
            `${n} of ${n} · generated from this PR's actual diff\n`
          )
      );
    } else {
      stderr.write("\n");
    }

    if (outPath) {
      const openAns = (
        await rl.question(dim("Open explainer? [y/N] "))
      )
        .trim()
        .toLowerCase();
      if (openAns === "y" || openAns === "yes") {
        try {
          await openExplainer(outPath);
        } catch (err) {
          stderr.write(
            `Could not open explainer: ${err.message}\n`
          );
        }
      }
    }
  } finally {
    rl.close();
  }
}
