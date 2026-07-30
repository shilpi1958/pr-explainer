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

1. You write a `learning-profile.md` once — your role and what you're
   currently trying to understand better. Not a skills checklist,
   just a couple of sentences.
2. Point the CLI at any merged PR — a number, a URL, whatever `gh pr
   view` accepts. It reads the PR's diff and description, combines it
   with your profile, and asks Claude to write one plain-language
   explainer: what changed, why it was done this way, why it matters
   to you — followed by a couple of recall questions with answers.
3. The explainer lands in `docs/explainers/`, and gets added to a
   running `index.md` of every PR you've explained so far.

## Quick start (CLI)

```bash
npm install -g pr-explainer
cp node_modules/pr-explainer/templates/learning-profile.example.md ./learning-profile.md
# edit learning-profile.md to describe yourself

pr-explainer 42
pr-explainer https://github.com/some-org/some-repo/pull/42   # works on any repo
```

No API key needed if you already have [Claude Code](https://claude.com/claude-code)
installed and logged in — `pr-explainer` calls the local `claude` CLI, so it
rides on whatever auth you already use there (subscription or key). Run `claude`
once to log in if you haven't.

Also requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
(`gh auth login`).

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

Every merge gets you a commit with a fresh explainer.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `LEARNING_PROFILE` | `./learning-profile.md` | path to your profile |
| `EXPLAINER_DIR` | `./docs/explainers` | output directory |

See [`templates/learning-profile.example.md`](templates/learning-profile.example.md)
for the profile format.

## Why this needs no separate API key (locally)

`pr-explainer` shells out to the `claude` CLI instead of calling the
Anthropic API directly. If you already use Claude Code, you already have
auth configured — nothing new to sign up for, no data leaving your
machine except what `claude` itself sends.

## License

MIT
