import { stderr } from "node:process";

const useColor = Boolean(stderr.isTTY);
const WRAP = 88;
const MAX_SECTION_CHARS = 2400;

function paint(code, text) {
  if (!useColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

const dim = (t) => paint("2", t);
const bold = (t) => paint("1", t);
const cyan = (t) => paint("36", t);

function softWrap(text, width = WRAP) {
  const paragraphs = text.split(/\n+/);
  const lines = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= width) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function stripMdLite(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function extractSection(markdown, heading) {
  const re = new RegExp(
    `##\\s+${heading}\\b([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i"
  );
  const m = markdown.match(re);
  return m ? m[1].trim() : "";
}

function truncateBody(body) {
  if (body.length <= MAX_SECTION_CHARS) return { text: body, truncated: false };
  const cut = body.slice(0, MAX_SECTION_CHARS);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  const trimmed = (
    lastBreak > MAX_SECTION_CHARS * 0.5
      ? cut.slice(0, lastBreak + (cut[lastBreak] === "." ? 1 : 0))
      : cut
  ).trimEnd();
  return { text: trimmed, truncated: true };
}

function writeSection(heading, body) {
  if (!body) return;
  stderr.write("\n");
  stderr.write(cyan(bold(heading)) + "\n");
  if (useColor) {
    stderr.write(dim("─".repeat(Math.min(40, WRAP))) + "\n");
  }
  const { text, truncated } = truncateBody(body);
  const plain = stripMdLite(text);
  for (const line of softWrap(plain)) {
    stderr.write(line + "\n");
  }
  if (truncated) {
    stderr.write(
      dim("(truncated — see saved file for full section)") + "\n"
    );
  }
}

/**
 * Print a readable summary to stderr before the quiz.
 * Auto-detects PR vs repo explainer from headings.
 * Honors PR_EXPLAINER_QUIET=1.
 */
export function printExplainerSummary(markdown) {
  if (process.env.PR_EXPLAINER_QUIET === "1") return;
  if (!markdown || !String(markdown).trim()) return;

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? stripMdLite(titleMatch[1]) : null;

  const isRepo =
    /##\s+What it does\b/i.test(markdown) ||
    /\*\*In short:\*\*/i.test(markdown);

  stderr.write("\n");
  if (title) {
    stderr.write(bold(title) + "\n");
  }

  if (isRepo) {
    const inShortMatch = markdown.match(/\*\*In short:\*\*\s*(.+)/i);
    const inShort = inShortMatch ? stripMdLite(inShortMatch[1]) : null;
    if (inShort) {
      stderr.write(dim("In short: ") + inShort + "\n");
    }
    writeSection("What it does", extractSection(markdown, "What it does"));
    writeSection(
      "How it's put together",
      extractSection(markdown, "How it's put together")
    );
    writeSection(
      "What the team has been working on",
      extractSection(markdown, "What the team has been working on")
    );
    writeSection("Why it matters", extractSection(markdown, "Why it matters"));
  } else {
    const shipsMatch = markdown.match(/\*\*Ships:\*\*\s*(.+)/i);
    const ships = shipsMatch ? stripMdLite(shipsMatch[1]) : null;
    if (ships) {
      stderr.write(dim("Ships: ") + ships + "\n");
    }
    writeSection("What changed", extractSection(markdown, "What changed"));
    writeSection(
      "Why it was done this way",
      extractSection(markdown, "Why it was done this way")
    );
    writeSection("Why it matters", extractSection(markdown, "Why it matters"));
  }

  const quizSection = extractSection(markdown, "Quick check");
  if (quizSection) {
    const qCount = (quizSection.match(/\*\*Q\d+\./gi) || []).length;
    stderr.write("\n");
    stderr.write(
      dim(
        qCount
          ? `Quick check: ${qCount} question${qCount === 1 ? "" : "s"} (coming up)`
          : "Quick check: see saved file"
      ) + "\n"
    );
  }

  stderr.write("\n");
}
