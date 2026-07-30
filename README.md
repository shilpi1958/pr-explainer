# pr-learning-log

Turn every merged PR into a learning-log entry — pitched at *your*
skill level, not a generic changelog.

Most PR summarizer bots describe what changed. This describes what it
taught you, explained the way you'd explain it to yourself: skip the
parts you already know, slow down on the parts you're still learning.

## How it works

1. You write a `learning-profile.md` once — your level, what you know
   well, what you're actively learning, your preferred tone.
2. On every merged PR, the tool reads the PR's diff and description,
   combines it with your profile, and asks Claude to write one
   Markdown entry: the problem, the fix, and the lesson.
3. The entry lands in `docs/learning-log/`.

## Quick start (CLI)

```bash
npm install -g pr-learning-log
cp node_modules/pr-learning-log/templates/learning-profile.example.md ./learning-profile.md
# edit learning-profile.md to describe yourself

pr-learning-log 42   # generates an entry for merged PR #42
```

Omit the PR number to use the PR associated with your current branch.

No API key needed if you already have [Claude Code](https://claude.com/claude-code)
installed and logged in — `pr-learning-log` calls the local `claude` CLI, so it
rides on whatever auth you already use there (subscription or key). Run `claude`
once to log in if you haven't.

Also requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
(`gh auth login`).

## GitHub Action

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
