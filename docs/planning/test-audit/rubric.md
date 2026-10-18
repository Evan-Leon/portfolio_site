# Test audit rubric

**Adapted for portfolio_site** (test-audit STEP 2.2, 2026-10-18): § 1's entry points are
portfolio_site's (profile Q5); chud's standing ruling and its chud-specific lessons are removed.

**Written:** 2026-09-29, TA1 (rev 1). It condenses `testing-expert-antilist.md` Parts C–E, the
spec's keep and obligation rules, Evan's seeds and the source audit's lessons into what an auditor
applies to one test at a time.

**How to use it.** Rate one test *function* at a time. A parametrize group is one unit unless its
rows assert different properties. For each function, answer § 1 (is the subject live?), § 2 (is
it a must-keep?), § 3 (which anti-patterns does it show?), then pick one verdict (§ 4). Any
verdict that removes a live-subject test must pass the obligation rule (§ 5). **When unsure, the
verdict is `KEEP`.**

This rubric names no specific test. Its examples are paraphrased shapes, not pointers.

---

## 0. The decision rule

> **KEEP a test iff it would fail on a plausible, accidental regression of live, reachable
> behaviour that no other kept test already catches, and it would not fail on a correct,
> behaviour-preserving change.**

Three questions, one per anti-pattern family:
- **Live and reachable?** (Family R, relevance.) If the subject is dead, nothing can regress.
- **Can it catch a plausible regression?** (Family V, vacuity.) An off-by-one, a dropped field,
  a wrong branch, a lost guard or drifted wiring counts. "Someone deliberately re-adds a deleted
  thing" does not.
- **Does it stay green on a correct change?** (Family C, coupling.) Source text, private
  structure, restated literals and growing counts fail on correct edits.

**Success is not a count.** Removing a test that held a live obligation is the one outcome the
audit exists to prevent. A retained test that is merely imperfect costs little.

---

## 1. Is the subject live?

The **subject** is the production code the test exercises (a theater source module under
`theater/src/`, or a script). A subject is **live** when it is reachable from a real entry point:
- the theater app: `theater/index.html` → `theater/src/main.ts` and everything it imports (the
  engine, the standalone host, the loader and loading ring, the lot, the page chrome, period and
  prewarm, `projects.ts`, `scenes/registry.ts` and the scenes it lists, `styles/global.css` and
  `tokens.css`);
- the theater library entry `theater/src/index.ts` (the `portfolio-theater` package surface: the
  adapter types, the placeholder adapter and the adapter conformance kit an adapter author runs);
- the build and test configuration: `theater/vite.config.ts` and the files it names
  (`vite-site-assets.ts`, the Vitest setup file), `theater/playwright.config.ts`;
- the static site served by nginx: `index.html`, `projects/*.html`, `404.html`, `assets/`,
  `images/`, `nginx.conf`, and the `Dockerfile` that builds the theater into the image;
- an **operator** entry point: a script named in `CLAUDE.md`/`AGENTS.md`, a repo skill, a git hook
  or an `infra/` script (`scripts/validate_codex_setup.py`, `scripts/showcase/`, `scripts/art/`,
  `theater/e2e/nginx-parity.sh`, `.githooks/`, infra's `deployment/prod/deploy-portfolio.sh`);
- a cross-repo consumer (another repo imports a module, decodes an output or reads a file).

Check dynamic reach before calling anything dead: names reached by string (a scene id in the
registry, a CSS class or data attribute the page or a stylesheet selects on), files read by path at
run time (the posters, clips and art under `images/` and `theater/public/`), and the Vitest setup
file that every test loads.

**A roadmap marked ENDED can still have shipped live code.** The question is reachability, not
roadmap status.

---

## 2. Must-keep: tests that look like anti-patterns but are not

Four kinds of test match an anti-pattern's *shape* and must still be kept. Check for them
**before** applying § 3.

1. **Live cross-file tripwires.** A test that fails when two places that must agree drift apart,
   where no runtime check sees the drift. The shape: a value or list in one file that must
   mirror one defined somewhere the code cannot import or observe at run time.
2. **Rule-cited enforcement tests.** A test that a project rule names as its enforcer (the rules
   index says "enforced by …", or a rule cites the test). They often look like lint (AP-08) or
   source reads (AP-07). They stay. Check the rules index before rating anything that sweeps
   files. This repo's index is `theater/skills/rules-index/SKILL.md` (the `SDS-*` rules and the
   recorded departures); the shared `EVO-*` IDs cited in theater comments are provenance.
3. **Absence tests guarding a live security or privacy invariant.** The absence is itself the
   live behaviour, and a re-introduction would be silent. Examples of the shape: a secret is
   never logged or returned; a request lacking a required credential is refused; a filter
   excludes rows it must exclude.
4. **Literal pins of external facts.** A literal can encode an **external contract**: a fact
   about the world outside the code (a value measured on real infrastructure, a wire value
   another system parses, a hash another process keys on). A relational or positivity check
   would not catch the wrong value, so the literal *is* the obligation. Do not "improve" it into
   a relation.

**A test that memorialises a past deletion is none of these.** The guard-or-memorial question:
"Is the absence a property users or operators rely on *today*, and could a normal edit break it
without anyone noticing?" Yes: guard, `KEEP`. Only by deliberately undoing a deletion: memorial,
`RETIRE`.

**Prose can be behaviour.** For LLM prompts, the wording is what the model acts on, so a test
pinning a prompt instruction is a behaviour test. User-visible copy fixed by a spec or wireframe
is also behaviour.

**Source can be behaviour.** When the product itself reads source text, a source-reading test
is a behaviour test.

---

## 3. The anti-patterns

Each line: the shape, then the usual verdict, then the false-positive caution. The caution is part
of the rule.

### Family R — relevance decay (Evan's seeds live here)

- **AP-01 Memorial absence test.** Asserts that a deleted symbol, route, field, file or string is
  *not* there (`raises(ImportError)`, `not hasattr`, `not in read_text()`, `queryBy…toBeNull`,
  names like `…_no_longer_…`, `…_stays_retired`). → `RETIRE`. *Caution:* keep it when the absence
  is itself live behaviour and a re-introduction would be silent (§ 2.3). A memorial with a
  known end date for its live reason (an upstream removal not yet landed) is `DEFER`.
- **AP-02 Fossil test.** The subject is reachable only from tests: deciders for gates that will
  never run, writers for phases that will never execute, replay harnesses for a closed
  measurement. → `RETIRE-WITH-CODE`. *Caution:* check dynamic reach (§ 1) before ruling. Part of
  a dead cluster can import a live module; the live half's assertions are obligations.
- **AP-03 Future-contract xfail.** A strict xfail guarding code that has not been written, for a
  roadmap that is not scheduled. → `RETIRE` with the roadmap end. *Caution:* an xfail for a
  phase that is actually next, or a known upstream bug with a check-by date, is `DEFER`.
- **AP-04 Frozen-instrument test.** A fixture holding a verbatim old copy of production code
  plus expected outputs, re-deriving a past number. → `RETIRE` once the gate that cited it has
  closed. *Caution:* while a measurement gate is open and its score script reads the frozen
  copy, it guards silent drift: `DEFER` with the gate as trigger.
- **AP-05 Gate-holding / obligation-registry test.** Exists to relate a roadmap's clauses, bars
  or obligations to checks. → `RETIRE`(`-WITH-CODE`) when the roadmap closes. *Caution:* a test
  named after the review finding that found a real product bug is a regression test for live
  code. Keep it (rename is a later concern).
- **AP-06 Narrative test pinning a known defect.** Asserts old or unwrapped code *still* behaves
  badly, to document why a wrapper exists. → `RETIRE`, or `REWRITE` as a positive test of the
  wrapper. *Caution:* a characterization test before an active refactor is legitimate but
  temporary (`DEFER`, trigger: the refactor lands).

### Family C — coupling (change detectors)

- **AP-07 Source-grepping test.** Asserts on production source text (`read_text()` of a `.py`,
  `getsource`, regex over source). → `REWRITE` to observe behaviour. *Caution:* `KEEP` when the
  product reads source (§ 2), or when the invariant is structural and runtime-unobservable (an
  AST walk proving every call site has a timeout).
- **AP-08 Lint masquerading as a test.** Walks every source file asserting a pattern never
  matches. → low-priority `REWRITE` (belongs in lint). *Caution:* never `RETIRE` one that guards a
  live trap; rule-cited enforcement tests are must-keep (§ 2.2).
- **AP-09 Constant / config-literal restatement.** Restates a production constant or default as a
  literal. → `RETIRE` the restatement, keep the relational invariant. *Caution:* a two-sided pin
  across a boundary tests cannot import (a unit file vs `config.py`) is a tripwire (§ 2.1). A
  literal that encodes an external fact is must-keep (§ 2.4).
- **AP-10 Golden / snapshot / hash pins nobody reads.** → `REWRITE` to the properties that matter.
  *Caution:* keep a golden that is a contract with an external consumer and whose diffs are
  reviewed, such as a manifest hash that another process keys on.
- **AP-11 Magic-count pin.** `len(x) == 14`. → `REWRITE` to a non-empty floor or a named set.
  *Caution:* a count that *is* the business rule (a retention bound, one id per delegation) is
  behaviour.
- **AP-12 Prose / wording pin.** Long error-message matches, assertions on doc contents. →
  `REWRITE` to the error class or code. *Caution:* LLM prompt wording and spec-fixed UI copy are
  behaviour (§ 2).
- **AP-13 Testing private internals.** Calls `mod._helper` to assert internal structure or call
  order. → `REWRITE`/`MERGE` through the public path. *Caution:* pure parsers and splitters are
  often best tested directly. The smell is orchestration internals.
- **AP-14 Mirror test.** The expected value is computed like the implementation, or an adapter
  test has one case per copied field. → `MERGE` into one table-driven test. *Caution:* the
  adapter layer is the project's only snake/camel boundary. Each distinct decision it makes is
  an obligation, so consolidate, never simply delete.
- **AP-15 Testing the framework.** Only asserts library behaviour (a model default, a JSON
  round-trip with no custom logic). → `RETIRE`. *Caution:* a pinned canary for a library quirk
  the code depends on is legitimate.

### Family V — vacuity (passes on broken code)

- **AP-16 Interaction-only assertion.** `assert_awaited_once()` with no payload check. →
  `REWRITE` to assert the payload or state. *Caution:* a negative call assertion is fine when a
  positive control proves the path ran.
- **AP-17 Weak / assertion-free test.** `toBeTruthy()`, `is not None`, "runs without raising". →
  `REWRITE`. *Caution:* a single process-boundary smoke test (the app boots) is legitimate.
- **AP-18 Negative assertion with no positive control.** An absence over an empty or unreached
  set. → `REWRITE` to add the control. *Caution:* a positive control in a sibling test of the
  same fixture is acceptable.
- **AP-19 Duplicate / same fact at several granularities.** → `MERGE` into the strongest one, or
  `RETIRE` the weaker twin. *Caution:* layered tests are fine when each layer adds its own
  behaviour (the router checks the status and error shape, the service checks the rule).
- **AP-20 Doubles that lie.** Mocks of owned code, auto-vivifying `MagicMock` without a spec,
  a fake that returns `"ok"` for everything, a fixture shape no real producer emits. →
  `REWRITE`. *Caution:* fakes of the LLM, HTTP, the Temporal server and the clock are correct.

### Family D — determinism and design

- **AP-21 Time-, sleep- or order-dependent.** → `REWRITE` (inject the clock, use an independent
  signal). *Caution:* a sleep inside a fake that must block, or `sleep(0)` to yield, is fine.
- **AP-22 Conditional logic in a test.** A branch on repo or host state inside the body. →
  `REWRITE`. *Caution:* a loop over an explicit expectation table is fine.
- **AP-23 Mystery guest.** The meaning lives in a large far-away fixture. → `REWRITE` (shrink).
  *Caution:* real captured shapes beat hand-built ones; keep the capture, shrink it.
- **AP-24 History-organised naming.** Named for the phase that added it, not the behaviour. →
  `MERGE`/rename. *Caution:* this is naming, not relevance. **Never remove a test on its name
  alone.**
- **AP-25 Falsification scaffolding for a dead checker.** Per-predicate "fails alone" matrices
  for a checker only an ended gate used. → `RETIRE-WITH-CODE` with the checker. *Caution:* for a
  live gate (a preflight, an action guard, a stack guard) these are exactly right.
- **AP-26 Unit test reaching real services.** → `REWRITE` (fake at the boundary). *Caution:*
  `git` in a `tmp_path` repo and the dedicated test database are correct practice.

### Lessons worth recognising

- An empty test run exits 0 in many runners; a test asserting its own denominator is non-empty is
  a positive control, not a magic count.

---

## 4. The verdicts

Each test function gets exactly one.

| Verdict | Meaning | Removes the test? |
|---|---|---|
| `KEEP` | Meets § 0 as written, or is a must-keep (§ 2), or you are unsure. | No |
| `RETIRE` | Delete the test; the subject stays. AP-01 memorial, AP-06 narrative, AP-09 restatement, AP-15 framework test, AP-19 weaker twin. | Yes |
| `MERGE` | Fold into a named survivor or a parametrize row. The survivor must fail on the union of what the inputs caught. | Yes |
| `REWRITE` | The subject is live and worth guarding, but the test is shaped wrong. Replace it with a behaviour test that carries every obligation it had. | Replaces |
| `RETIRE-WITH-CODE` | The subject is dead (outside the reachability set, § 1). Delete the test with the dead code. It has no live obligations by definition. | Yes |
| `DEFER` | Guards a live contract whose end is known but not reached. Name the **trigger** that flips it to `RETIRE`. | Not yet |

**The DEFER trigger rule.** A `DEFER` without a concrete, checkable trigger (an upstream phase
landing, a named gate closing, a scheduled phase executing) is invalid; rate it `KEEP` instead.
"Someday" is not a trigger.

**Two departures from the expert pass** (the spec overrides Part E of the anti-list):
1. **`REWRITE` never touches production code.** If a better test would need a production
   refactor (for example exporting a list so it can be observed), the verdict is `KEEP`, and the
   reason names the refactor as a follow-up.
2. **There is no per-cluster Evan approval for `RETIRE-WITH-CODE`.** Dead-code deletion is
   gated by the reachability proof and mechanical checks instead (spec D1).

---

## 5. The obligation rule

Every test whose subject is live carries **obligations**: the distinct properties it asserts.
Write them as short phrases ("adapter copies the optional `model` field", "route answers 403
without the header").

**When the rule applies.** Whenever a live-subject test is removed (`RETIRE`, `MERGE`), a
parametrize row is removed, or an assertion under an unchanged name is weakened (`REWRITE`).

**What you must show.** For **each** obligation, either:
- **where it survives**: a survivor test (its node ID), with a proof; or
- **why it is not a live obligation**: an anti-pattern ID plus a reason (for example AP-01: it
  only commemorates a deliberate deletion).

**The two proof forms.**
1. **Assertion superset.** Quote the survivor's assertion verbatim. The quote must appear
   character-for-character in the survivor's file, and it must cover the property. A test that
   exercises the same function is not a superset unless its assertion covers the same property
   on an input of the same class.
2. **Focused hand mutant.** A `monkeypatch`/`mock.patch` of the subject, or a temporary edit in a
   disposable worktree, that breaks the property. The removed test and the survivor must both
   kill it. No mutation framework is needed.

**Uncertain means `KEEP`.** If you cannot produce either proof, the verdict is `KEEP`. "Probably
covered elsewhere" is not a proof. A sibling test "looking similar" is not a proof.

Retiring a whole live-subject file needs this proof for every obligation in the file.
`RETIRE-WITH-CODE` carries no live obligations, because its subject is outside the reachability
set; the proof there is the reachability argument (§ 1).

---

## 6. Tie-breakers

- **Roadmap-born tests:** "If the roadmap that created this test had never existed, would we
  write this test today for the code as it stands?" No, and the code is live: `REWRITE` or
  `MERGE`. No, and the code is dead: `RETIRE-WITH-CODE`. Yes: `KEEP`.
- **KEEP or RETIRE?** Imagine the most plausible accidental bug in the subject. Only this test
  catches it: `KEEP`. Another kept test provably catches it too: `MERGE`/`RETIRE` with a proof.
  Nothing plausible makes it fail: `RETIRE`.
- **Guard-looking areas** (auth, anti-forgery headers, secrets, database isolation, schedule
  safety, worker wiring): answer the guard-or-memorial question in writing before any removal.
</content>
</invoke>
