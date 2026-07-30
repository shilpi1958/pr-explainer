export function buildPrompt({ profile, pr, diff }) {
  return `You write personal engineering learning-log entries. You will be given \
a developer's profile, a merged pull request's description, and its diff. \
Write ONE learning-log entry in Markdown that explains what this PR teaches, \
pitched precisely at this developer's level — skip explaining things they \
already know well, and slow down on things they're actively learning.

Do not summarize the diff line by line. Focus on the *decision* behind the \
change and the *lesson* a developer at this level would take from it. If the \
PR is routine with no real lesson, say so briefly instead of inventing one.

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
