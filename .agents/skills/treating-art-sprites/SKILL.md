---
name: treating-art-sprites
description: Use whenever a drive-in theater sprite in theater/public/art/ (car.png, tree-1..3.png) is generated, regenerated or replaced — generated PNGs arrive off-size on a painted backdrop and must be keyed, fitted and checked before they are committed.
---

Read `../../../.claude/skills/treating-art-sprites/SKILL.md` in full; it is the
canonical source of truth, and it points at `scripts/art/README.md` for the full
reference. Follow its `treat.mjs` -> `check.mjs` flow, look at the card
screenshot before accepting a sprite, and do not work around the exit-3
refusals. Run the commands from the repo root. Resolve any files it names
from there.
