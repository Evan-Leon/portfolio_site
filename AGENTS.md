# portfolio_site — agent instructions

## Session logs

Every session ends by writing a session log to `docs/session-logs/` — no
exceptions, including pure Q&A sessions. Invoke the `writing-session-logs`
skill for the filename convention and template (it's a stub pointing at the
shared EVOsystem copy in `../infra/skills/`). Every few days — or when the
skill nudges — run `sweeping-session-logs` to roll raw logs up into
daily/weekly/monthly digests.
