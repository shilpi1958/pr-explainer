# pr-learning-log

Point it at any merged pull request. Get back a plain explanation of
what it did and why it matters — pitched at *you*, whoever you are.

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
   entry: what changed, why it was done this way, why it matters to you.
3. The entry lands in `docs/learning-log/`.

## Quick start (CLI)

```bash
npm install -g pr-learning-log
cp node_modules/pr-learning-log/templates/learning-profile.example.md ./learning-profile.md
# edit learning-profile.md to describe yourself

pr-learning-log 42
pr-learning-log https://github.com/some-org/some-repo/pull/42   # works on any repo
```

No API key needed if you already have [Claude Code](https://claude.com/claude-code)
installed and logged in — `pr-learning-log` calls the local `claude` CLI, so it
rides on whatever auth you already use there (subscription or key). Run `claude`
once to log in if you haven't.

Also requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
(`gh auth login`).

## GitHub Action (optional)

The CLI is the main way to use this — point it at any PR, any time. The
Action is for the narrower case of auto-generating an entry for your
*own* repo's PRs as they merge, committed automatically.

CI runners don't have access to your local `claude` login, so the Action
needs a credential. If you have a Claude subscription, generate a
long-lived token once, locally:

```bash
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN
```

Then drop this into `.github/workflows/learning-log.yml`:

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  learning-log:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}
      - uses: shilpi1958/pr-learning-log@v1
        with:
          claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

No subscription? Pass `anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}`
instead (Console API key, billed separately).

Every merge gets you a commit with a fresh learning-log entry.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `LEARNING_PROFILE` | `./learning-profile.md` | path to your profile |
| `LEARNING_LOG_DIR` | `./docs/learning-log` | output directory |

See [`templates/learning-profile.example.md`](templates/learning-profile.example.md)
for the profile format.

## Why this needs no separate API key (locally)

`pr-learning-log` shells out to the `claude` CLI instead of calling the
Anthropic API directly. If you already use Claude Code, you already have
auth configured — nothing new to sign up for, no data leaving your
machine except what `claude` itself sends.

## License

MIT
