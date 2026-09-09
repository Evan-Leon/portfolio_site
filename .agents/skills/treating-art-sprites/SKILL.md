---
name: treating-art-sprites
description: Use whenever a drive-in theater sprite in theater/public/art/ is created, regenerated or edited — the whole loop: driving the change through Codex image generation, treating what comes back, checking it, and integrating it into the served theater.
---

Read `../../../.claude/skills/treating-art-sprites/SKILL.md` in full; it is the
canonical source of truth, and it points at `scripts/art/README.md` for the full
reference. Follow its five steps — scaffold with `new-run.sh`, write the prompt
from the template, launch detached, run `check.mjs` and look at the card, then
integrate and rebuild. Never commit a generated sprite as returned, and do not
work around the exit-3 refusals. Run the commands from the repo root.
