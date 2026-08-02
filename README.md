# code-explainer

Explain a PR or a whole repo in plain English — calibrated to whoever's
reading, via a one-time learning profile. Plus an interactive CLI quiz
so it sticks.

```bash
npm install -g @shilpi1958/code-explainer

code-explainer init
# edit ~/.code-explainer/learning-profile.md  (or legacy ~/.pr-explainer/)

code-explainer pr https://github.com/org/repo/pull/42
code-explainer repo              # explain the checkout you're in
```

The `pr-explainer` binary is still installed as an alias (legacy shorthand:
`pr-explainer <PR>` without the `pr` subcommand).

## Modes

### `pr` — what just shipped

Point it at any merged PR (number, URL, or `owner/repo#N`). Reads the diff +
description, combines it with your profile, and asks Claude Code for a
plain-language explainer.

```bash
code-explainer pr 42
code-explainer pr https://github.com/org/repo/pull/42
code-explainer pr org/repo#42 --no-quiz
```

### `repo` — what this codebase is

Orients non-engineers (or engineers in another domain) to a **local** checkout.
Builds a [Graphify](https://graphify.com/) knowledge graph, adds recent merges +
your profile, and writes a concise orientation.

```bash
# also required for repo mode:
uv tool install graphifyy   # or: pipx install graphifyy

cd /path/to/checkout
code-explainer repo
code-explainer repo --no-quiz
```

If `graphify` is missing, repo mode exits with install instructions.

## Requirements

- [Claude Code](https://claude.com/claude-code) CLI (`claude`), logged in
- [GitHub CLI](https://cli.github.com/) (`gh`), authenticated
- **Repo mode only:** [Graphify](https://graphify.com/docs) (`uv tool install graphifyy`)

No separate Anthropic API key for local use — the tool shells out to `claude`.

## Profile

```bash
code-explainer init
```

Creates `~/.code-explainer/learning-profile.md` (or keeps using
`~/.pr-explainer/` if you already have one). Override with `LEARNING_PROFILE`
or a local `./learning-profile.md`.

## Output

- PR explainers → `~/.code-explainer/explainers/` (or legacy path)
- Repo explainers → `…/explainers/repos/`
- Summary prints to stderr; quiz is interactive unless `--no-quiz` /
  `PR_EXPLAINER_NO_QUIZ=1`

## GitHub Action (optional)

Auto-generate a PR explainer on merge. Pass Claude credentials and optional
PostHog secrets:

```yaml
- uses: shilpi1958/code-explainer@v1
  with:
    claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    posthog-api-key: ${{ secrets.POSTHOG_API_KEY }}
    posthog-host: ${{ secrets.POSTHOG_HOST }}
```

## Analytics (optional)

Copy [`.env.example`](.env.example) to `.env` for local PostHog capture
(`POSTHOG_API_KEY` / `POSTHOG_PROJECT_TOKEN` + `POSTHOG_HOST`). Enables
funnel events and `$ai_generation` for [AI Evals](https://posthog.com/docs/ai-evals).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `No profile found` | `code-explainer init`, then edit the profile file |
| Bare PR number not found | `cd` into the repo, or pass a URL / `owner/repo#N` |
| PR not merged | Only merged PRs are supported |
| Graphify not found | `uv tool install graphifyy` |
| Claude / gh auth | Run `claude` once; `gh auth login` |

```bash
gh auth status
claude -p --output-format text <<< "Say hi in one word"
code-explainer --help
```

## License

MIT
