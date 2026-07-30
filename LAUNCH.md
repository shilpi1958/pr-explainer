# Launch copy — pr-explainer

## The thesis (use this to frame everything below)

Small, fast-moving teams don't have time for a paper trail. Docs go
stale, Slack threads get reinterpreted, "ask an engineer" doesn't scale
past a handful of people. The one thing that's never stale, never
political, and never needs to be double-checked against someone's
memory is the code itself — it's the actual source of truth, right now,
at this commit.

The problem was never access. Anyone can open a diff. The problem was
translation — reading code is a skill, and most people who need to
understand *what actually happened* don't have it. pr-explainer removes
that barrier: point it at any PR, get a plain explainer pitched at you,
so "just read the code" stops being a thing only engineers can do.

Three ways people are using it:
1. **Understanding any PR in your org** — what did the team actually
   ship, and why, without pinging an engineer to translate.
2. **Reviewing your own team's/organization's PRs** — an engineer
   checking a teammate's work outside their usual area.
3. **Your own personal project** — every time you (or an AI coding
   assistant) pushes a PR, run it to know exactly what you're up to,
   instead of losing track as changes pile up.

---

## Product Hunt

**Tagline (60 char max):**
Code is the source of truth. Now anyone can read it.

**Alt taglines (pick one, or A/B across channels):**
- Understand any GitHub PR, even if you don't write code
- Stop asking, start reading: explain any PR in plain English

**Topics/categories:** Developer Tools, Productivity, Artificial Intelligence

**Description (the long-form PH body):**

> Small teams move fast because they skip the paper trail — but that
> means the only reliable source of truth left is the code itself.
> Docs go stale. Slack answers depend on who you ask. The code, right
> now, is just true.
>
> The problem was never *access* to that truth. It was translation —
> most people who need to know what actually shipped can't read a diff.
> pr-explainer removes that barrier.
>
> Point it at any merged pull request, on any repo:
>
> ```
> pr-explainer https://github.com/some-org/some-repo/pull/123
> ```
>
> You get back a plain-language explainer — what changed, why the team
> did it that way, why it matters to you — followed by a couple of
> quick recall questions so it's something you actually retain, not
> just skim.
>
> **Three ways people are using it:**
> - Understanding any PR across their org, without pinging an engineer
>   to translate it every time
> - Reviewing a teammate's PR outside their usual area
> - Running it on their own personal project's PRs — including ones an
>   AI coding assistant pushed — just to stay on top of what shipped
>
> **How it's different:**
> You describe yourself once — your role, and what you're currently
> trying to understand better — in a one-time profile file. Every
> explainer after that is calibrated to you: skips what you'd already
> know, slows down on what you're stretching into, never assumes
> unexplained jargon.
>
> **No API key required.** If you already have Claude Code installed
> and logged in (subscription or key), pr-explainer rides on that —
> nothing new to sign up for, no separate billing.
>
> Free, open source, self-hosted. `npm install -g pr-explainer`.

**First maker comment (post immediately after launch):**

> Hey PH 👋
>
> I kept noticing the same pattern: on small teams, code is the only
> thing that's actually true — docs rot, Slack answers vary by who you
> ask — but most people who need to know what shipped can't read a
> diff. So "go check the code" was never really an option for them.
>
> pr-explainer is my attempt to close that gap. Point it at any PR, get
> an explanation pitched at you specifically — technical or not.
>
> Two things I'd love feedback on:
> 1. Does the explanation quality hold up on YOUR repos? Try
>    `pr-explainer <any PR URL>` and tell me what it gets wrong.
> 2. The quiz questions at the end are new — trying to figure out if
>    that's genuinely useful or just noise. Curious what you think.
>
> Repo's open source: https://github.com/shilpi1958/pr-explainer

**Gallery assets you'll need before submitting:**
- 1 thumbnail/icon (square, works small)
- 3-5 gallery images or a short screen-recording GIF showing:
  1. The one-line install + command
  2. A real generated explainer (use a well-known open-source PR so
     people recognize the source — e.g. a React or VS Code PR — more
     credible than a random personal repo)
  3. The quiz section specifically (this is your novelty hook, don't bury it)

---

## Twitter / X

**Launch tweet (thread opener):**

> Code is the source of truth on any fast-moving team. Docs go stale,
> Slack answers depend on who you ask — the code, right now, is just
> true.
>
> The problem was never access. It was translation. Built a CLI that
> fixes that: point it at any PR, get a plain-English explainer pitched
> at you.
>
> 🧵

**Thread (reply 2):**

> Three ways to use it:
> — Understand any PR across your org, no engineer required to translate
> — Review a teammate's PR outside your usual area
> — Run it on your own project's PRs (even ones your AI coding
>   assistant pushed) so you actually know what you're up to

**Thread (reply 3 — show, don't tell):**

> [Attach: screenshot or GIF of a real generated explainer + quiz,
> ideally from a recognizable open-source repo's PR]

**Thread (reply 4 — the differentiator):**

> Most PR-summarizer tools need you to bring an API key and pay
> per-call. This one shells out to your local `claude` CLI — so if
> you're already a Claude Code user, it's free to try, right now.
>
> `npm install -g pr-explainer`

**Thread (reply 5 — CTA + link):**

> Open source, self-hosted, MIT licensed.
>
> Repo: https://github.com/shilpi1958/pr-explainer
>
> Live on Product Hunt today — would mean a lot if you check it out:
> [PH link]

**Timing note:** post the Twitter thread the moment PH goes live (12:01am PT),
not before — PH momentum in the first few hours matters most for ranking,
and early Twitter traffic hitting the PH page while it's fresh helps that.

---

## Other channels worth a low-effort post (optional, same core pitch)

- **Hacker News (Show HN):** title format `Show HN: pr-explainer – explain any GitHub PR in plain English, pitched to you`. HN audience is technical-skeptical — lead with the mechanism (shells out to `claude -p`, no separate API key) rather than the "code is source of truth" framing, which can read as overwrought to that crowd. Expect blunt feedback on the quiz feature's usefulness.
- **r/programming or r/ExperiencedDevs:** only if genuinely participating, not just dropping a link — these subreddits penalize drive-by self-promotion.
- **dev.to / Hashnode post:** "Code is the only source of truth that doesn't go stale — here's a tool that makes it readable by anyone" — good place for the longer narrative version of the maker comment, links back to PH/GitHub.
