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
