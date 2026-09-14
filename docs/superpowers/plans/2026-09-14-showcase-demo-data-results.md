# Showcase Demo Data Cleanup — Results

Plan: `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` · Spec: `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`
Evidence (never committed): `/home/evan/showcase-pending/_teardown-evidence/<target>/`

## States

| Target | State |
|---|---|
| co-host | NOT-STARTED |
| co-host-chud | NOT-STARTED |
| co-author | NOT-STARTED |
| chudios (db + files) | NOT-STARTED |
| mind-palace | NOT-STARTED |
| leonsbudget | NOT-STARTED |
| the-classic | NOT-STARTED |
| chunk-norris audit | NOT-STARTED |

## Open questions for Evan

(none yet)

## Task 1 — tooling and preflight

| Check | Result |
|---|---|
| `sha256sum -c SHA256SUMS` | exit=0, all OK (16/16 files) |
| no earlier run (evidence, selftest DBs, container temp dirs, quarantine) | clean — evidence dir `700 evan` with only the 3 expected files; selftest DB count 0; container temp dir + quarantine count 0 (re-checked clean after each self-test) |
| gate self-test | exit=0, 0 failures |
| file self-test | exit=0, 0 failures, temp dir removed |
| preflight co-host / co-host-chud / co-author / chudios / leonsbudget / the-classic | exit=0 ×6 |
| preflight mind-palace | exit=0 |
| chudios files check | exit=0 |
