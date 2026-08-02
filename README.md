# pr-explainer

Point it at any merged pull request, anywhere on GitHub. Get back a
plain explainer of what it did and why it matters — pitched at *you*,
whoever you are — plus a couple of quick questions to check it stuck.

You don't need to have written the PR, or even read code. A product
analyst can point it at an engineer's PR and get a stakeholder-ready
explanation with zero jargon. An engineer can point it at a teammate's
PR and get the reasoning, not just the diff. Same tool — the only
input that changes is a one-time profile describing who's reading.

## How it works

1. Run `pr-explainer init` once — it creates
   `~/.pr-explainer/learning-profile.md`. Edit it with your role and
   what you're currently trying to understand better. Not a skills
   checklist, just a couple of sentences. That one file applies
   everywhere you run the CLI.
2. Point the CLI at any merged PR — a number, a URL, whatever `gh pr
   view` accepts. It reads the PR's diff and description, combines it
   with your profile, and asks Claude to write one plain-language
   explainer: what changed, why it was done this way, why it matters
   to you — followed by a multiple-choice Quick check.
3. The explainer lands in `~/.pr-explainer/explainers/`, and gets added
   to a running `index.md` of every PR you've explained so far. A readable
   summary (title, Ships, What changed, Why it was done this way, Why it
   matters) prints to the terminal first. In an interactive terminal, press
   Enter for a CHECK IT STUCK quiz (pick A/B/C, Enter to skip, `q` to quit),
   then optionally open the saved file.

## Quick start (CLI)

```bash
npm install -g @shilpi1958/pr-explainer
pr-explainer init
# edit ~/.pr-explainer/learning-profile.md to describe yourself

pr-explainer 42                                          # current repo only
pr-explainer https://github.com/some-org/some-repo/pull/42   # any repo
pr-explainer some-org/some-repo#42
pr-explainer https://github.com/some-org/some-repo/pull/42 --no-quiz

# Explain a whole local checkout (needs Graphify — see below)
pr-explainer repo
pr-explainer repo /path/to/checkout --no-quiz
```

### Repo mode

`pr-explainer repo` orients you to what a **repository** does — for non-engineers
or engineers outside that domain — using the same learning profile as PR mode.

It builds a local [Graphify](https://graphify.com/) knowledge graph of the
checkout (structure, hubs, communities), combines that with recent merged PRs
and your profile, and writes a concise plain-language explainer. Output lands
in `~/.pr-explainer/explainers/repos/`.

Requires a **local git checkout** with a GitHub remote (not a bare `owner/repo`
URL yet), plus Graphify:

```bash
uv tool install graphifyy   # or: pipx install graphifyy
```

If `graphify` is missing, repo mode exits with install instructions.

> **Note:** a bare number resolves against the GitHub repo of your current
> directory. To explain a PR elsewhere, pass the full URL or `owner/repo#N`.
> Only **merged** PRs are supported.

After the explainer is saved, a summary of the key sections prints to stderr
(title, Ships, What changed, Why it was done this way, Why it matters — Quick
check is left for the quiz). In an interactive terminal you’re prompted
`Press Enter for CHECK IT STUCK…`, then the multiple-choice quiz runs
(`a`/`b`/`c` or `1`/`2`/`3`, Enter to skip, `q` to quit early). Correct picks
get a green ✓; wrong picks show the right option. Then you’re offered
`Open explainer? [y/N]`. The Markdown file still keeps the questions with
options and collapsed answers for later. Pass `--no-quiz` (or set
`PR_EXPLAINER_NO_QUIZ=1`) to skip the quiz; it’s also skipped when stdin
isn’t a TTY (CI, pipes). The summary still prints unless
`PR_EXPLAINER_QUIET=1`. The only stdout line is the saved file path (for
scripting).

No API key needed if you already have [Claude Code](https://claude.com/claude-code)
installed and logged in — `pr-explainer` calls the local `claude` CLI, so it
rides on whatever auth you already use there (subscription or key). Run `claude`
once to log in if you haven't.

Also requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
(`gh auth login`).

**Repo mode** additionally requires [Graphify](https://graphify.com/docs)
(`uv tool install graphifyy`).
## GitHub Action (optional)

The CLI is the main way to use this — point it at any PR, any time. The
Action is for the narrower case of auto-generating an explainer for your
*own* repo's PRs as they merge, committed automatically.

CI runners don't have access to your local `claude` login, so the Action
needs a credential. If you have a Claude subscription, generate a
long-lived token once, locally:

```bash
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN
```

Then drop this into `.github/workflows/explainer.yml`:

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  explainer:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}
      - uses: shilpi1958/pr-explainer@v1
        with:
          claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

No subscription? Pass `anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}`
instead (Console API key, billed separately).

Every merge gets you a commit with a fresh explainer. Put a
`learning-profile.md` in the repo root for the Action (or pass
`profile-path`); explainers are written to `docs/explainers/` by default.

## Configuration

Profile lookup (first hit wins):

1. `LEARNING_PROFILE` env
2. `./learning-profile.md` (repo override — useful for the Action)
3. `~/.pr-explainer/learning-profile.md` (default for local CLI)

| Env var | Default | Purpose |
|---|---|---|
| `LEARNING_PROFILE` | `~/.pr-explainer/learning-profile.md` | path to your profile |
| `EXPLAINER_DIR` | `~/.pr-explainer/explainers` | output directory |
| `PR_EXPLAINER_NO_QUIZ` | unset | set to `1` to skip the interactive quiz |
| `PR_EXPLAINER_QUIET` | unset | set to `1` to skip printing the summary to stderr |
| `POSTHOG_API_KEY` | unset | enables product analytics + `$ai_generation` for [PostHog AI Evals](https://posthog.com/docs/ai-evals). Alias: `POSTHOG_PROJECT_TOKEN` |
| `POSTHOG_HOST` | PostHog default | e.g. `https://us.i.posthog.com` |
| `POSTHOG_DEBUG` | unset | set to `1` to log when PostHog is unconfigured |

Copy [`.env.example`](.env.example) to `.env` for local runs (loaded automatically from cwd or package root). For the GitHub Action, pass `posthog-api-key` / `posthog-host` inputs (see `action.yml`) via repo secrets — not only a local `.env`.

When configured, the CLI emits `profile_initialized`, `explainer_generation_started`, `explainer_generated`, plus `$ai_generation` (for evals) and mode-specific `pr_explained` / `repo_explained`.

See [`templates/learning-profile.example.md`](templates/learning-profile.example.md)
for the profile format.

## Why this needs no separate API key (locally)

`pr-explainer` shells out to the `claude` CLI instead of calling the
Anthropic API directly. If you already use Claude Code, you already have
auth configured — nothing new to sign up for, no data leaving your
machine except what `claude` itself sends.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `No profile found` | Run `pr-explainer init`, then edit `~/.pr-explainer/learning-profile.md` |
| `Could not resolve to a PullRequest` / PR not found | A bare number only looks in the **current** repo. Pass a URL or `owner/repo#42` |
| `PR … is not merged yet` | Only merged PRs are supported — pick one that already shipped |
| `claude -p failed` / spending cap / usage limit | Wait for the Claude Code reset, raise your cap, or retry later. Confirm `claude` works on its own |
| Claude Code CLI not found | Install from https://claude.com/claude-code and run `claude` once to log in |
| `gh` auth / forbidden errors | Run `gh auth login` |
| GitHub CLI not found | Install from https://cli.github.com/ |
| Graphify CLI not found / repo mode | Install with `uv tool install graphifyy`, then retry `pr-explainer repo` |

Quick sanity checks:

```bash
gh auth status
claude -p --output-format text <<< "Say hi in one word"
pr-explainer --help
```

## License

MIT
