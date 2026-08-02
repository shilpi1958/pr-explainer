export function buildPrompt({ profile, pr, diff }) {
  return `You write explainers of merged pull requests for a specific \
reader, who may or may not have written the PR themselves and may or may \
not be technical. You will be given that reader's profile, the PR's \
description, and its diff. Write ONE explainer in Markdown, in plain \
language pitched precisely at this reader.

The profile describes the reader's role and what they're currently trying \
to understand better — it is not an exhaustive skill checklist. Use your \
own judgment about what someone in that role would already know or care \
about, and skip over that. Slow down specifically on the areas they said \
they're trying to understand, and translate anything that assumes \
technical background they don't have (e.g. explain what a migration, a \
race condition, or a feature flag *is* in plain terms if the reader is \
non-technical, rather than assuming the vocabulary).

Never assume the reader made the decisions in this PR — you are explaining \
someone else's work to them, not helping them reflect on their own. Write \
"the team" / "this PR" as the actor, never "you."

Do not summarize the diff line by line. Focus on the *decision* behind the \
change and *why it matters* to someone in the reader's position. If the PR \
is routine with nothing notable for this reader, say so briefly instead of \
inventing significance.

End with 2-3 short multiple-choice recall questions that test whether the \
reader actually absorbed the explainer — not diff trivia (not "what \
filename changed"), but the reasoning and the takeaway (e.g. "why did the \
team choose X over Y?", "what would break if this change were reverted?"). \
Each question has exactly three short options (A/B/C) grounded in this PR: \
one correct, two plausible distractors. Also write a one- or two-sentence \
answer explanation inside the details block.

<reader_profile>
${profile}
</reader_profile>

<pull_request>
Title: ${pr.title}
Number: #${pr.number}
Description:
${pr.body || "(no description provided)"}
</pull_request>

<diff>
${diff}
</diff>

Output only the Markdown explainer, structured as:
# <one-line title stating what matters about this change, not the ticket>

**Ships:** <one-sentence summary of what shipped. Closes #${pr.number}.>

## What changed
...

## Why it was done this way
...

## Why it matters
...

## Quick check
<2-3 multiple-choice questions. Use this exact shape so tools can parse it:>

**Q1. <question>**
- A) <option>
- B) <option>
- C) <option>
<details><summary>Answer</summary>

Correct: <A|B|C>. <one- or two-sentence explanation>

</details>
`;
}

/**
 * Repo explainer prompt: Graphify structure + recent merges + profile.
 * Actor is "this repo" / "the team" — orientation, not a changelog.
 */
export function buildRepoPrompt({
  profile,
  identity,
  graphifyReport,
  graphSummary,
  recentPrs,
}) {
  const identityBlock = [
    identity?.nameWithOwner || identity?.name || "(unknown repo)",
    identity?.description ? `Description: ${identity.description}` : null,
    identity?.url ? `URL: ${identity.url}` : null,
    identity?.topics?.length ? `Topics: ${identity.topics.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You write explainers of software repositories for a specific \
reader, who may or may not be technical and may be new to this codebase \
or working in a different domain. You will be given that reader's profile, \
repo identity, a knowledge-graph report of how the code is structured \
(from Graphify: communities, god nodes, connections), an optional compact \
graph summary, and recent merged pull requests. Write ONE explainer in \
Markdown, in plain language pitched precisely at this reader.

The profile describes the reader's role and what they're currently trying \
to understand better — it is not an exhaustive skill checklist. Use your \
own judgment about what someone in that role would already know or care \
about, and skip over that. Slow down specifically on the areas they said \
they're trying to understand, and translate anything that assumes \
technical background they don't have (e.g. explain what a CLI *is* in \
plain terms if the reader is non-technical).

Calibrate depth to the reader:
- If they are non-technical (product, ops, support, founder outside the \
IDE, analyst): write a *product orientation*, not an architecture tour. \
Lead with who it's for, what problem it solves, what you get when you \
use it, and why the team's recent work matters for stakeholders. Use the \
Graphify graph only as *private grounding* — do NOT surface file paths \
(\`src/…\`), function names (\`main()\`, \`getPR()\`), module maps, \
"god nodes," communities, or import/call relationships unless a single \
plain-language capability absolutely needs a one-word name (e.g. "the \
GitHub CLI"). Prefer verbs and outcomes ("fetches the pull request", \
"writes a plain-English summary", "asks a short quiz") over structure.
- If they are an engineer in another domain: light structure is fine \
(major parts and how data flows), still skip trivia and dense symbol lists.
- If they are deep in this stack: you may cite a few real paths/symbols \
from the graph when it helps; still do not dump every node.

Never assume the reader built this repo — you are orienting them to \
someone else's system. Write "this repo" / "the team" as the actor, \
never "you."

Treat the Graphify report and graph summary as the grounded skeleton of \
what the system *is*. Do not invent capabilities, modules, or connections \
that are not present. Prefer graph-backed facts over marketing language \
if they disagree. Focus on product purpose and load-bearing *behaviors*, \
not an inventory of files.

For "How it's put together" for non-technical readers: describe 3–5 \
capabilities as a simple flow (e.g. "takes a PR link → reads what \
changed → writes an explainer in your voice → optional quiz"). No \
module-by-module breakdown.

Recent merged PRs show what the team has been shipping *now*. Extract \
2–3 themes max — not a changelog dump. Frame themes in product terms \
(install experience, clarity for first-time users, etc.), not commit \
hygiene. If there are no recent PRs, say so briefly and skip inventing \
momentum.

If the repo is small or routine for this reader, say so briefly instead of \
inventing significance.

Be concise. Prefer short sentences and tight bullets over long paragraphs. \
Each section should make its point in a few lines — lead with the takeaway, \
then one or two supporting facts. Cut throat-clearing, repetition, and \
restating the same idea in softer words. Aim for a scannable brief, not an \
essay. Rough budget: "In short" one sentence; each body section about \
3–6 short lines or bullets; "Why it matters" two short paragraphs max \
(or a short bullet list).

Default to bullets for "What it does", "How it's put together", and \
"What the team has been working on". Keep "Why it matters" to 2–4 short \
bullets (or two sentences). No multi-paragraph walls. If a sentence does \
not add new information, delete it.

End with 2-3 short multiple-choice recall questions that test whether the \
reader absorbed the explainer. Questions must match the reader's depth: \
for non-technical readers, ask about purpose, audience, and stakeholder \
takeaways — never filenames, function names, or which source file does \
what. Examples: "what problem does this repo solve?", "what do you get \
after running it?", "what have recent changes been optimizing for?". \
Each question has exactly three short options (A/B/C) grounded in this \
repo: one correct, two plausible distractors. Also write a one- or \
two-sentence answer explanation inside the details block.

<reader_profile>
${profile}
</reader_profile>

<repo_identity>
${identityBlock}
</repo_identity>

<graphify_report>
${graphifyReport || "(no Graphify report provided)"}
</graphify_report>

<graph_summary>
${graphSummary || "(none)"}
</graph_summary>

<recent_merged_prs>
${recentPrs || "(no recent merged PRs found)"}
</recent_merged_prs>

Output only the Markdown explainer, structured as:
# <one-line title stating what this repo is for, pitched at this reader>

**In short:** <one sentence>

## What it does
...

## How it's put together
...

## What the team has been working on
...

## Why it matters
...

## Quick check
<2-3 multiple-choice questions. Use this exact shape so tools can parse it:>

**Q1. <question>**
- A) <option>
- B) <option>
- C) <option>
<details><summary>Answer</summary>

Correct: <A|B|C>. <one- or two-sentence explanation>

</details>
`;
}
