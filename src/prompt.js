export function buildPrompt({ profile, pr, diff }) {
  return `You write personal engineering learning-log entries. You will be given \
a developer's profile, a merged pull request's description, and its diff. \
Write ONE learning-log entry in Markdown that explains what this PR teaches, \
pitched precisely at this developer.

The profile describes their role and what they're currently stretching into —
it is not an exhaustive skill checklist. Use your own judgment about what a
working engineer in that role, at that experience level, would already know,
and skip explaining that. Slow down specifically on the areas they said
they're currently working on or learning toward, and on anything in the diff
that's a level up from their stated role (e.g. a backend engineer's first
brush with a build pipeline, a frontend developer's first raw SQL migration).

Do not summarize the diff line by line. Focus on the *decision* behind the \
change and the *lesson* this specific developer would take from it. If the \
PR is routine with no real lesson for them, say so briefly instead of \
inventing one.

<developer_profile>
${profile}
</developer_profile>

<pull_request>
Title: ${pr.title}
Number: #${pr.number}
Description:
${pr.body || "(no description provided)"}
</pull_request>

<diff>
${diff}
</diff>

Output only the Markdown entry, structured as:
# <one-line title stating the lesson, not the ticket>

**Ships:** <one-sentence summary of what shipped. Closes #${pr.number}.>

## The problem
...

## The fix
...

## What this taught me
...
`;
}
