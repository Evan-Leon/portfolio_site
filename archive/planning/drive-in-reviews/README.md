# Drive-in review artefacts

Codex adversarial-review **prompts**, their **receipts** (findings + triage), and one
**runlog**, for the two drive-in roadmaps. Moved here from `docs/roadmaps/` on 2026-09-09
so that directory holds roadmaps and nothing else.

These are records of reviews that already ran. Nothing here is re-executed: a prompt is
kept because the receipt beside it is only interpretable against the instructions that
produced it, and because a later roadmap's author can see what a good adversarial pass
asked for.

| Artefact | Subject |
|---|---|
| `drive-in-theater-part3-{prompt,codex-review}.md` | v1 roadmap (DTF/DT0–DT10), Part 3 |
| `drive-in-theme-spec-codex-{prompt,review}.md` | v2 spec, before the roadmap was written |
| `drive-in-theme-part3-{prompt,codex-review}.md` | v2 roadmap Part 3 — **died on a usage limit** at 285k tokens with no findings list; the receipt is folded from its probe outputs |
| `drive-in-theme-part3b-{prompt,codex-review}.md` | the owed Part 3 re-run, completed (exit 0, 301k tokens): 11 MAJOR / 4 MINOR, 14 accepted / 1 rejected |
| `drive-in-theme-dt13-{prompt,codex-review}.md` | DT13 implementation review: 6 MAJOR / 2 MINOR, all 8 accepted |
| `drive-in-theme-dt14-codex-{prompt,runlog}.md` | DT14 sprite generation driven through Codex |

Paths *into* this directory were rewritten in the two roadmaps and the v2 spec when the
files moved. **Session logs were deliberately left alone** — a committed log is a dated
record of what was true when it was written, and the `writing-session-logs` skill allows
exactly one carve-out for editing one (clearing a fold-back item in place), which this is
not. A log from before 2026-09-09 therefore cites `docs/roadmaps/<file>.md`; the file is
here.
