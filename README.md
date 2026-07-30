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

export ANTHROPIC_API_KEY=sk-ant-...
pr-learning-log 42   # generates an entry for merged PR #42
```

Omit the PR number to use the PR associated with your current branch.

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
(`gh auth login`).

## GitHub Action

Drop this into `.github/workflows/learning-log.yml`:

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
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Every merge gets you a commit with a fresh learning-log entry.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | required |
| `LEARNING_PROFILE` | `./learning-profile.md` | path to your profile |
| `LEARNING_LOG_DIR` | `./docs/learning-log` | output directory |

See [`templates/learning-profile.example.md`](templates/learning-profile.example.md)
for the profile format.

## Why self-hosted / BYO key

No account, no dashboard, no data leaving your CI except the diff you
send to Anthropic directly. You already trust `gh` with your repo;
this doesn't ask for more.

## License

MIT
