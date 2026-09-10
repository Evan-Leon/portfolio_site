---
date: 2026-09-10
agent: claude-code
type: docs
mode: attended
phases: []
repos: [portfolio_site, infra]
---

## Accomplished

Ran both sweeps back to back, on request, coordinating a shared-tier collision
with a concurrent chud sweep (`chud-e3`).

**Session-log sweep (`sweeping-session-logs`) — done.** Rolled the 17 raw logs
from 2026-09-08 (×4) and 2026-09-09 (×13) into two daily digests
(`daily/2026-09-08.md`, `daily/2026-09-09.md`) and archived the raw logs. ISO
week 2026-W37 is still open (its Sunday 2026-09-13 is after today), so **no
weekly or monthly tier fired** — verified mechanically with `date -d … +%G-W%V`.
No unattended marker present, so all 17 were eligible. The 21 promote candidates
were carried up into the digests verbatim for the rules sweep.

**Rules sweep (`sweeping-rules`, scoped to portfolio_site) — done. 13 promoted,
5 kept local, 0 retired.** portfolio_site has no local rules-index, so every
candidate was a session-log tag with no local ID → shared-tier index rows only.
Judged all 21 against the promotion bar, deduped against the five stack files:
- **universal.md** EVO-UNI-210..217: composited-layer cost is area not dimension;
  per-predicate mutation pass proves predicates live; a falsification seam must
  be the sole path to the behaviour; "set a read-only DOM property" is a silent
  human false negative; a `toContain` on one member of a composite value is
  vacuous; a gated step states its own not-yet-resolved stop; a ruling-not-a-
  measurement decision marks `not taken` + footnote; fixed-box text is verified
  by `scrollWidth`/`scrollHeight`.
- **react-frontend.md** EVO-FE-284..285: a fixed full-width overlay needs
  `pointer-events: none`/`auto` (sibling of EVO-FE-283); a hit-test must sample
  from `elementsFromPoint`, not a transformed element's `getBoundingClientRect`.
- **tooling.md** EVO-TOOL-221..223: a fake-clock that also fakes timers hangs a
  page's own startup; a verification grep is defeated by the repo's own text
  (formatter wrap / a comment containing the banned string); a browser test at
  one viewport proves nothing about another.

Kept local (marked across raw log + both digest copies): the fixture-re-derive
and per-element-collection candidates (covered by EVO-UNI-120 / EVO-UNI-018 +
EVO-UNI-181); the `until ! pgrep -f` self-match (covered by chud's freshly-minted
EVO-TOOL-220 + EVO-TOOL-200); the raw-generated-asset candidate (covered by
EVO-TOOL-055); and `backface-visibility` deleting a `rotateX(-90deg)` plane
(CSS-3D-plane-specific, no fleet repo does CSS 3D planes today).

**Collision handling.** `chud-e3` was mid-sweep and holding an uncommitted
EVO-UNI-209 in `measurement.md`. Coordinated by SendMessage: it reserved UNI≤209
/ TOOL≤220 / PY 315-317 / FE none, I took the block above (UNI-210+, TOOL-221+,
FE-284+) and held all infra edits until its commit `a2ffc64` landed, then minted
and rebased cleanly. Ran `sync-rules-to-appdash` last so both sweeps' rows landed.

**Art generation-loop / sprite-contract split (`scripts/art/`) — done, Evan-directed.**
Cleared the one open PENDING item the sweep carried forward: on Evan's ruling ("split it"),
split the asset-agnostic generation loop from the sprite-only treatment stage behind a
per-asset contract. `new-run.sh` is now `./new-run.sh <contract> <run-name> <target> [refs…]`
— it sources `contracts/<contract>/manifest.sh` (`CONTRACT_TOOLS` + `CONTRACT_PROMPT`), copies
the declared tools + shared deps into the scratch workspace, and seeds the prompt from the
contract's own template. The sprite treatment moved under `contracts/sprite/`; the top-level
README documents the loop + contract interface + how to add a second one (the portrait case
is the worked example, not built). **Verified with a Codex adversarial pass** (`gpt-5.6-sol`
high, detached + monitored, findings written to disk as they formed): 5 MAJOR / 4 MINOR, all
confirmed by deterministic probes and all fixed — CWD-dependent `sharp` resolution, a
half-built workspace left on failure, an unquoted launch path, silent reference-name
collisions, URL-encoded sibling paths (`fileURLToPath`), a moved-depth example writing to the
wrong tree, and three stale path/description references. Behaviour preservation and doc
commands were CHECKED clean by the review. Receipts under `docs/planning/art-loop-split/`.

## Commits

portfolio_site:
- `3cddfd1` docs: session-log sweep through 2026-09-09
- `e577f8a` docs(rules): rules sweep 2026-09-10 — 13 promoted to shared tier, 5 kept local
- `829e16c` docs(session): session-log sweep + rules sweep 2026-09-10 (first version of this log)
- `c430c27` refactor(art): split the asset-agnostic generation loop from the sprite contract
- `52b4d16` fix(art): fold in the Codex adversarial review of the loop/contract split
- (this log, updated in place + the fold-back clearing edits)

infra:
- `39e70b0` docs(rules): rules sweep 2026-09-10 (portfolio_site) — 13 promoted, 0 retired

## Uncommitted work left behind

None. Both working trees clean after their sweep commits.

## Verification

- `date -d <day> +%G-W%V` — 2026-09-08 and 2026-09-09 both ISO 2026-W37 (Sunday
  2026-09-13), today 2026-09-10 → week still open → no weekly/monthly. Pass.
- `sweep_candidates.py docs/session-logs` — empty (no ELIGIBLE) after the log
  sweep, and again on a second run → idempotent. Pass.
- Post-log-sweep tree: root holds only `README.md` + digest dirs; `daily/` holds
  the two new digests; `weekly/` empty; `monthly/` untouched (2026-07, 2026-08).
- Max-ID scan before minting: EVO-UNI 209, EVO-FE 283, EVO-TOOL 220 (after chud's
  `a2ffc64`); target IDs 210-217 / 284-285 / 221-223 all confirmed free.
- Rules-sweep self-check grep (unconsumed promote tags over `docs/session-logs/`
  + `archive/session-logs/`, both arrow forms, swept + prose filters) — **empty**
  after marking all 42 tag copies (21 raw-log + 21 digest). 0 candidates remain.
- Citation check: every EVO-* ID cited in the new swept markers (the 13 minted
  plus EVO-UNI-120/018/181, EVO-TOOL-220/200/055) resolves to a live row in the
  shared tier.
- `sync-rules-to-appdash.py` — exit 0; `synced 2098 rules, deleted 0 stale rows`;
  `react-frontend.md: 285`, `tooling.md: 223` confirm chud's + my promotions both
  present.
- Both repos `git status` clean post-commit.

## Blockers

None.

## Open flags

- ~~The open `PENDING` item from the 2026-09-09 18:42 portrait log (split the loop
  from the sprite-only treatment stage).~~ **Resolved this session** — Evan ruled
  "split it"; done at `c430c27`/`52b4d16`. The originating log's bullet and the
  `daily/2026-09-09.md` copy were edited to `APPLIED` (fold-back clearing lifecycle).
- The **`portrait` contract is documented but not built** — `contracts/sprite/` is the
  only contract; the portrait inspectors (`greyFrac` / shoulder-symmetry) still live as
  one-offs under `docs/planning/about-portrait/`. The README's "adding a contract" recipe
  is the path to re-home them when the portrait is next regenerated. Deliberate (YAGNI):
  building a person-specific contract now was the scope Evan declined.
- Codex's model banner was unreachable in its sandbox (read-only state dir), so the review
  leaned entirely on deterministic local probes — which is the right kind of evidence for a
  path/behaviour refactor, but it means no live-model reasoning was applied. Noted for
  honesty; the findings all reproduced by hand here.
- `SDS-011` ID collision: the marquee session drafted a measurement rule as
  "`SDS-011`" while the mobile session actually added a different `SDS-011` (the
  theater-hide rule) to the theater rules-index the same day. The measurement
  draft was promoted to the shared tier as EVO-UNI-217; the local `SDS-011` is the
  theater-hide rule. Noted in the digest so the collision is not read as an error.
- The car-png "never commit a generated asset raw" candidate was kept local as
  covered by EVO-TOOL-055; if Evan wants the theater-specific commit-discipline
  rule stated in `theater/skills/rules-index/`, that is a local-index addition
  outside this sweep's scope.

## Rules-index candidates

None. (portfolio_site has a deliberate rules-index opt-out; the theater `SDS-*`
index is the vendored engine's law and none of this session's work is engine-level.)

## Meta-prompt / skill / doc updates

- NO-CHANGE: `sweeping-session-logs` — the ISO-week-open computation, the
  no-marker-so-all-eligible path, and the digest templates all served as written;
  no cascade this run because W37 is still open.
- NO-CHANGE: `sweeping-rules` — one-repo scope, the index-row-only path for
  candidates with no local ID, prefix-global EVO-UNI minting, and the mark-every-
  copy-consumed rule all served as written. The concurrent-sweep case is not in
  the skill but was handled by peer coordination + waiting for the other commit;
  worth a mention there only if fleet-parallel sweeps become common (one receipt,
  below the bar for a rule).
- NO-CHANGE: `writing-session-logs` — template and fold-back triage applied
  without ambiguity; used its clearing lifecycle (item 9) to edit the 2026-09-09 18:42
  log's originating PENDING bullet to `APPLIED` and cascade the edit to the daily digest.
- APPLIED: `treating-art-sprites` skill (`.claude` + `.agents` copies) and `scripts/art/`
  README/scripts repointed for the loop/contract split and the `sprite` contract arg (see
  Commits: `c430c27`). Behaviour-preserving relocation; Evan authorized the split.
- NO-CHANGE: `superpowers:brainstorming` — classified the split bounded, one scope question,
  short in-chat design, explicit approval before code; served as written.

## Next steps

- Next session-log sweep picks up this log once 2026-09-10 is past (and two more
  days accumulate — currently only today's log sits in the root).
- Other fleet repos still hold their own outstanding promote candidates — each is
  swept when `sweeping-rules` runs in that repo.

## Pointers

- Digests: `docs/session-logs/daily/{2026-09-08,2026-09-09}.md`; monthlies
  `docs/session-logs/monthly/{2026-07,2026-08}.md`.
- Shared tier: `infra/skills/rules-index/references/{universal,react-frontend,tooling}.md`
  (EVO-UNI-210..217, EVO-FE-284..285, EVO-TOOL-221..223).
- Sweep plan / judging record: session scratchpad `rules-sweep-plan.md`.
