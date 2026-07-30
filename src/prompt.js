export function buildPrompt({ profile, pr, diff }) {
  return `You explain merged pull requests to a specific reader, who may or \
may not have written the PR themselves and may or may not be technical. You \
will be given that reader's profile, the PR's description, and its diff. \
Write ONE learning-log entry in Markdown, in plain language pitched \
precisely at this reader.

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

Output only the Markdown entry, structured as:
# <one-line title stating what matters about this change, not the ticket>

**Ships:** <one-sentence summary of what shipped. Closes #${pr.number}.>

## What changed
...

## Why it was done this way
...

## Why it matters
...
`;
}
