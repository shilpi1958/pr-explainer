# Design brief — pr-explainer

For: Claude Design (logo + landing page)
Product repo: https://github.com/shilpi1958/pr-explainer

## What it is, in one sentence

A free CLI tool: point it at any merged GitHub pull request, and it
writes a plain-English explanation of what changed and why it matters
— calibrated to whoever's reading, technical or not — plus a short
quiz to check it stuck.

## The idea behind it (use this for tone/story, not just feature copy)

On a small, fast-moving team, code is the only thing that's actually
true. Docs go stale. Slack answers depend on who you ask and when.
The code, right now, at this commit, is just true — it's the real
source of truth.

The problem was never *access* to that truth. Anyone can open a diff
on GitHub. The problem was *translation*: reading code and understanding
the reasoning behind a change is a skill most people don't have —
product managers, analysts, designers, support leads, even engineers
looking outside their usual area. So "just go read the code" has
always been technically true and practically useless advice for most
people on a team.

pr-explainer removes that barrier. It doesn't summarize the diff line
by line — it explains the *decision* behind the change, in language
pitched at the specific person reading it, so understanding what
shipped stops requiring you to either already know how to code or
interrupt an engineer to translate for you.

## Who uses it (three concrete scenarios — use these as the site's core sections/examples)

1. **Understanding any PR across an organization.** A product analyst
   or PM points it at an engineer's merged PR and gets a
   stakeholder-ready explanation, no jargon, without pinging anyone.
2. **Reviewing a teammate's PR outside your usual area.** An engineer
   uses it to get the reasoning behind a change in an unfamiliar part
   of the codebase, not just the mechanical diff.
3. **Keeping track of your own project.** Run it on your own repo's
   PRs — including ones an AI coding assistant (Claude Code, Cursor,
   etc.) pushed on your behalf — so you always know exactly what
   shipped and why, instead of losing track as an AI ships faster than
   you can review.

## How it actually works (for an accurate "how it works" section — don't invent steps)

1. The user writes a short `learning-profile.md` once — their role,
   and what they're currently trying to understand better. Not a
   skills checklist, just a couple of sentences. (e.g. "Product
   analyst, don't read code, need to explain shipped changes to
   stakeholders" or "Backend engineer, 2 years, new to frontend.")
2. They run one command against any merged PR — a bare number, a full
   GitHub URL, or `owner/repo#123`:
   ```
   pr-explainer https://github.com/some-org/some-repo/pull/123
   ```
3. The tool reads the PR's diff and description via the GitHub CLI,
   combines it with the profile, and asks Claude to write one
   Markdown explainer: what changed, why it was done this way, why it
   matters to this specific reader — followed by 2–3 short recall
   questions (with collapsible answers) that test the reasoning, not
   diff trivia.
4. The explainer is saved locally and added to a running index of
   every PR the user has explained so far — a growing, personal record
   of what they've come to understand.

## The key differentiator (must appear prominently — this is the actual hook)

**No API key, no signup, no billing.** Most AI PR-summarizer tools
require you to bring your own API key and pay per call. pr-explainer
instead shells out to the Claude Code CLI already on the user's
machine — so if they already use Claude Code (subscription or key,
either works), this is free to try immediately. Nothing new to sign up
for.

Secondary differentiators:
- Works on **any repo**, not just ones you own — point it at a URL
  from anywhere.
- **Free and open source** (MIT licensed), self-hosted — no data
  leaves the user's machine except what the `claude` CLI itself sends.
- The **quiz/recall step** is novel versus competitors — this isn't
  just a summarizer, it's built for retention, not just skimming.

## What it is NOT (avoid implying these)

- Not a hosted SaaS / no dashboard, no login, no account system.
- Not a GitHub bot that auto-comments on PRs (it *can* run in CI via a
  GitHub Action to auto-generate entries for a repo's own merges, but
  that's a secondary/optional use case, not the primary pitch).
- Not limited to developers — the primary differentiator is that
  non-technical people can use it too.
- Not a code-review tool (it doesn't critique or approve code, only
  explains merged/past PRs).

## Brand tone

Direct, confident, a little contrarian — "code is the real source of
truth, here's how to actually use it" rather than generic SaaS
cheerfulness. Technical enough to be credible to engineers, plain
enough that a non-technical reader isn't alienated. Avoid: hype
language ("revolutionary," "game-changing"), cutesy AI-assistant
personality, enterprise-SaaS blue-gradient clichés.

## Logo direction

Something that visually bridges "code" and "plain language/reading" —
e.g. a diff/bracket motif resolving into a readable line or speech
mark, or an open book/document shape built from code-like glyphs.
Should work as a small favicon and a GitHub social-preview image.
Avoid generic robot/AI-brain iconography — this product is about
*reading*, not about AI as a character.

## Landing page — sections to include

1. **Hero:** tagline + one-line explanation + the install command
   (`npm install -g pr-explainer`) + primary CTA linking to GitHub repo.
2. **The thesis:** short version of "code is the source of truth, this
   removes the translation barrier" — 2-3 sentences, not a manifesto.
3. **How it works:** the 4 steps above, ideally with a real example
   screenshot/code block showing input command → generated explainer
   (including a bit of the quiz section, since that's the novel part).
4. **Who it's for:** the three scenarios above, as short cards/sections.
5. **Why no API key:** the differentiator, explained briefly.
6. **Install / quickstart:** copy-pasteable commands, matching the
   README (`npm install -g pr-explainer`, copy the profile template,
   run one command).
7. **Footer:** link to GitHub repo, license (MIT), maybe a link to
   Product Hunt listing once live.

## Practical constraints for the build

- This will be hosted as a **GitHub Pages** static site off the
  `pr-explainer` repo — so plain HTML/CSS (or a simple static
  generator output) is preferred over anything requiring a build
  pipeline or backend.
- Needs to look correct in both light and dark mode if possible, since
  a chunk of the audience is developers browsing GitHub-adjacent pages
  in dark mode.
- Reuse the real CLI usage syntax exactly as shown above — don't
  invent flags or commands that don't exist in the actual tool.
