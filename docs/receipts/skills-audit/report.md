# Session-start load: before → after

Generated 2026-10-16 by `scripts/context-audit/context_load.py report`. Claude columns come from `/context`; Codex columns are a static authored-text estimate and are never summed with Claude's.

| Target | Claude Memory files tok | Claude Skills tok | Claude Messages tok | Hook payload tok | Log tail bytes | CONTINUITY bytes | Codex chain bytes (static) | Codex desc chars (static) |
|---|---|---|---|---|---|---|---|---|
| portfolio_site | 2,400 → 3,600 | 7,100 → 7,200 | 1,500 → 1,500 | 965 → 965 | 21,538 → 21,538 | – → – | 6,578 → 7,459 | 5,146 → 5,558 |

## Not measured

- Codex effective context: only a static estimate of authored text is reported.
- Codex plugin skill roots and the claude.ai-synced skills (out of scope, spec D3).
- Guides and skills below a repo root, which load lazily:
  - none
