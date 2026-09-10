# Adversarial review — art generation-loop / sprite-contract split

Review scope: commit `c430c27` only.

## Findings

### MINOR — stale old checker path in `.gitignore`

- **Location:** `.gitignore:44`
- **What breaks:** The comment still says card screenshots are written by `scripts/art/check.mjs`, but that file was deleted and the checker now lives at `scripts/art/contracts/sprite/check.mjs`. Ignore behavior is unaffected, so this is documentation drift rather than a runtime break, but it directly falsifies the claim that no stale reference remains.
- **Concrete repro:** `rg -n 'scripts/art/(key|fit|measure|treat|check)\\.mjs|scripts/art/PROMPT-TEMPLATE\\.md' .gitignore AGENTS.md package.json scripts .claude .agents docs` reports `.gitignore:44:# Card screenshots written by scripts/art/check.mjs ...`; `test -e scripts/art/check.mjs` is false.
- **Fix:** Change the comment to name `scripts/art/contracts/sprite/check.mjs` (or describe the contract checker without pinning a path).

### MAJOR — `new-run.sh` resolves its shared `sharp` dependency from the caller's CWD

- **Location:** `scripts/art/new-run.sh:89-104` (especially `require("sharp")` at line 90); contradicted by the repo-root invocation in `AGENTS.md:45`.
- **What breaks:** The script first verifies `$here/node_modules/sharp`, then launches `node -e` without anchoring module resolution to `$here`. Node resolves `require("sharp")` from the process CWD, so `scripts/art/new-run.sh ...` fails when called from the repository root even though the checked dependency is installed. Worse, lines 80-85 have already created and populated the workspace, so retrying the same run name then hits the duplicate-run guard. This is a carried-forward defect (the old script used the same inline require), not a sprite behavior regression, but it leaves a documented path broken and makes the supposedly reusable loop CWD-dependent.
- **Concrete repro:** From the repository root, with `scripts/art/node_modules/sharp` present: `ART_RUN_ROOT=$(mktemp -d) scripts/art/new-run.sh sprite no-refs theater/public/art/car.png`. It exits non-zero with `Error: Cannot find module 'sharp'` and leaves `art-run-no-refs/{key,fit,measure,treat}.mjs`, `package.json`, and `node_modules/`, but no `prompt.md`.
- **Fix:** Anchor the inline program's module loading to `scripts/art/package.json` (for example with `createRequire`) or execute that Node step with `scripts/art` as its working directory. Also delay `mkdir`/copying until all failure-prone input conversion has succeeded, or clean the incomplete workspace on failure.

### MAJOR — the printed detached launch command breaks on a valid workspace path containing spaces

- **Location:** `scripts/art/new-run.sh:126`
- **What breaks:** The output promises an exact launch line, but emits `cd $w` without shell quoting (even though the later `-C "$w"` is quoted). `ART_RUN_ROOT` is explicitly supported and no run-name/path character restrictions are documented, so a space produces a scaffold that succeeds but a launch line that does not. Shell metacharacters in the path are an additional copy/paste hazard. This is carried forward from the old script rather than introduced by the split.
- **Concrete repro:** Set `ART_RUN_ROOT` to a directory such as `/tmp/art loop review.hsJ0aF` and scaffold normally. The successful output begins `cd /tmp/art loop review.hsJ0aF/art-run-no-refs && ...`; executing that command makes `cd` receive multiple operands instead of entering the workspace.
- **Fix:** Print the workspace path with shell-safe quoting, preferably via `printf '%q' "$w"`, everywhere it is interpolated into a shell command.

### MAJOR — normalized reference-name collisions silently discard an input

- **Location:** `scripts/art/new-run.sh:99-102` and `scripts/art/new-run.sh:106-110`
- **What breaks:** Reference basenames are normalized by replacing every non-alphanumeric run with `-`, but collisions are neither rejected nor disambiguated. Later references silently overwrite earlier ones, while `prompt.md` lists the same resulting path once per original input. The generated-image run therefore lacks one promised reference. This is also carried forward from the old loop, so sprite behavior is unchanged, but the scaffold can be materially wrong.
- **Concrete repro:** Pass two different images named `look & feel.png` and `look | feel.png`. `new-run.sh` exits 0, creates only `ref/look-feel.png`, and seeds the prompt with `` `ref/look-feel.png` `ref/look-feel.png` ``. The single output contains only the second input's re-encoded pixels.
- **Fix:** Compute normalized destinations once, reject duplicate stems before creating the workspace, or add deterministic unique suffixes; use that single mapping for both conversion and prompt generation.

### MAJOR — `treat.mjs` cannot find its sibling stages when the workspace path contains a space

- **Location:** `scripts/art/contracts/sprite/treat.mjs:22` (the byte-identical old implementation had the same defect)
- **What breaks:** `new URL(import.meta.url).pathname` returns a URL-encoded pathname. In a scratch workspace whose path contains a space, `here` contains `%20`, and the spawned `key.mjs` path does not exist. This independently breaks treatment even if the launch command's quoting is fixed. It is a carried-forward defect, not a regression in the moved bytes.
- **Concrete repro:** Scaffold under `ART_RUN_ROOT='/tmp/art loop review.hsJ0aF'`, enter the resulting workspace, and run `node treat.mjs ref/edit-target.png out/car.png`. It exits 1 trying to load `/tmp/art%20loop%20review.hsJ0aF/art-run-no-refs/key.mjs`.
- **Fix:** Convert the module URL with `fileURLToPath(import.meta.url)` from `node:url`, then call `path.dirname()` on that filesystem path. Apply the same robust conversion in `check.mjs` for repositories whose paths contain URL-escaped characters.

### MINOR — the asset-agnostic loop's runtime guidance is still hard-wired to the sprite skill

- **Location:** `scripts/art/new-run.sh:131-133`
- **What breaks:** Every contract, including the portrait contract proposed by `scripts/art/README.md`, gets told to “see the treating-art-sprites skill for the filter and what follows.” That guidance contains sprite-only treatment, browser-check, integration paths, and acceptance rules. The scaffold itself remains generic, but its advertised end-to-end launch handoff is not, directly falsifying “no sprite-specific coupling left in `new-run.sh`.” This is a real second-contract usability defect, not a sprite behavior break.
- **Concrete repro:** Scaffold any contract: the final two output lines are unconditional and do not consult the contract manifest. `CONTRACT_TOOLS` and `CONTRACT_PROMPT` offer no way to replace that follow-up guidance.
- **Fix:** Point generically to `$cdir/README.md`, or add a declared manifest field for contract-specific follow-up/monitoring guidance and validate it with the other manifest fields.

### MAJOR — the moved `treat.mjs` still embeds its old-depth output example

- **Location:** `scripts/art/contracts/sprite/treat.mjs:4`
- **What breaks:** The example remained byte-identical while the file moved two directories deeper: `node treat.mjs raw/car.png ../../theater/public/art/car.png`. When run from the contract directory, that destination resolves to `scripts/art/theater/public/art/car.png`, not the repository's `theater/public/art/car.png`. Because `treat.mjs` creates the destination directory after a PASS, following the example can silently write a plausible-looking sprite into a new wrong tree. This is an introduced stale-reference defect caused by the move, not a pre-existing behavior issue.
- **Concrete repro:** From `scripts/art/contracts/sprite`, `realpath -m ../../theater/public/art/car.png` prints `/home/evan/EVOsystem/portfolio_site/scripts/art/theater/public/art/car.png`; `realpath -m ../../../../theater/public/art/car.png` prints the intended `/home/evan/EVOsystem/portfolio_site/theater/public/art/car.png`. The contract README correctly uses the latter depth.
- **Fix:** Change the embedded example to `../../../../theater/public/art/car.png`, or use an absolute `<repo>/theater/...` placeholder so a future move cannot silently retarget it.

### MINOR — scratch `treat.mjs` tells the caller to run a checker that is intentionally absent

- **Location:** `scripts/art/contracts/sprite/treat.mjs:14-16` and `scripts/art/contracts/sprite/treat.mjs:61`
- **What breaks:** `treat.mjs` is one of the four files copied into every sprite scratch workspace, while `check.mjs` is deliberately excluded. Nevertheless, every successful scratch treatment ends with `Now run ...: node check.mjs <out>`. Running that literal command in the emitting workspace fails because the module is absent. The seeded prompt correctly says not to look for it, which limits impact; this is a carried-forward misleading command rather than a treatment regression.
- **Concrete repro:** A successful copied-workspace treatment printed `node check.mjs out/car.png`; `test -e check.mjs` in that workspace was false, as required by the manifest.
- **Fix:** Say explicitly that the browser checker must be run from the repository and print the output's absolute path, e.g. `From the repo root: node scripts/art/contracts/sprite/check.mjs <absolute-output>`; avoid presenting a cwd-local command that cannot work in scratch.

### MINOR — the shared package metadata still describes a sprite-only package

- **Location:** `scripts/art/package.json:6`
- **What breaks:** The package now owns dependencies shared by the asset-agnostic generation loop and all contracts, but its description remains `On-demand sprite treatment for theater/public/art`. There is no runtime impact; this is a metadata/documentation nit. It nevertheless leaves sprite-specific knowledge outside `contracts/sprite/` and misdescribes the package a future portrait-contract author is instructed to share.
- **Concrete repro:** `node -p 'require("./scripts/art/package.json").description'` prints the sprite-only description, while `scripts/art/README.md:21-23` labels the same package/dependencies shared loop infrastructure.
- **Fix:** Rename the description to asset-agnostic generation/treatment tooling, leaving sprite-specific wording in the sprite contract README.

## Probe record

Preflight: `codex --version` reported `codex-cli 0.153.4`. `curl -I --max-time 15 https://openai.com` reached OpenAI's Cloudflare edge and received HTTP 403, confirming outbound network reachability. A minimal `codex exec --ephemeral -s workspace-write -c sandbox_workspace_write.network_access=true -c model=gpt-6-astra ...` did **not** reach a model banner: this managed review environment makes Codex's state directory read-only, and initialization stopped with `failed to initialize in-process app-server client: Read-only file system`. I therefore did not treat any live-model result as evidence; the probes below are deterministic local shell, Node, Sharp, and Playwright checks.

### Lens 1 — path anchors

- `node scripts/art/contracts/sprite/check.mjs theater/public/art/car.png theater/public/art/tree-1.png` passed from the repo root, and the README form (`cd scripts/art/contracts/sprite; node check.mjs ../../../../theater/public/art/...`) also passed. Both runs loaded `theater`'s Playwright, loaded `docs/spikes/art-check.html`, emitted PASS JSON for car and tree, and wrote card screenshots under an `ART_CARDS_DIR` in `/tmp`. This proves the new four-parent repository anchor is correct on the actual repository path.
- Repo-side `node scripts/art/contracts/sprite/treat.mjs ...` passed for both `car.png` and `tree-1.png`, proving sibling spawning and upward `sharp` resolution from the moved directory. A copied no-space scratch workspace also passed both treatment chains, proving sibling spawning and scratch-local `sharp` resolution there.
- This lens is not clear because the URL-path handling fails for scratch/repository paths containing escaped characters; see the `treat.mjs` finding above.

### Lens 2 — `new-run.sh` and manifests

- With no references, the seeded prompt contains `（none）`; with a reference named `style & accent | final.png`, the script exits 0, writes `ref/style-accent-final.png`, and leaves no `@@...@@` placeholder. Thus `&` and `|` do not enter the sed replacement text. The collision finding above is the distinct failure exposed by the same normalization.
- Temporary contracts under `/tmp` proved all four validation cases exit 1 before workspace creation: missing `CONTRACT_PROMPT`, missing/empty `CONTRACT_TOOLS`, a nonexistent prompt template, and a nonexistent declared tool.
- This lens is not clear because of caller-CWD dependency resolution, partial workspaces on conversion failure, reference collisions, and the unquoted launch path documented above.

### Lens 3 — behavior preservation

CHECKED, no defect: Behavior preservation (lens 3).

- Git object IDs are identical before/after the move for `PROMPT-TEMPLATE.md`, `key.mjs`, `fit.mjs`, `measure.mjs`, and `treat.mjs`. The only source change in `check.mjs` is the necessary two-level anchor adjustment plus its explanatory comment.
- A normal scaffold under an explicit no-space `ART_RUN_ROOT` produced exactly `key.mjs`, `fit.mjs`, `measure.mjs`, and `treat.mjs` as workspace tools; it did not copy `check.mjs`; `package.json`, `node_modules/sharp`, and `prompt.md` were present; and no `@@...@@` placeholder remained.
- Round-tripping repository `car.png` and `tree-1.png` through the moved repo-side treatment and through copied scratch tools returned PASS. Renaming car bytes to `tree-renamed.png` selected the tree contract and failed dimensions; renaming tree bytes to `car-renamed.png` selected the car contract and failed dimensions, confirming basename dispatch.
- No arguments exited 2, an unknown contract exited 2, and a duplicate run name exited 1 with the intended diagnostics.

### Lens 4 — stale references

- A repository-wide exact-old-path scan, excluding `node_modules`, `docs/session-logs`, `archive/session-logs`, and this review, found only `.gitignore:44`. A separate relative-command audit found the old-depth output example in moved `treat.mjs:4`. Both stale references are reported above. Bare `node treat.mjs`/`node check.mjs` occurrences in historical run prompts and logs are scratch-workspace commands, not repo-path instructions.

### Lens 5 — contract abstraction

- `new-run.sh` contains no `car`/`tree` basename dispatch and does not implement the sprite gate; those details are confined to the sprite contract. The two-field interface is sufficient for the README's proposed Sharp-based portrait inspector: the prompt selects the workflow and the declared tool list supplies its inspector, while the common image re-encoding supplies Sharp.
- This lens is not clear because the post-launch guidance is unconditionally sprite-specific and the interface provides no generic/declared follow-up guide; see the finding above.

### Lens 6 — documentation and exact commands

CHECKED, no defect: Documentation command updates (lens 6).

- The scaffold forms in both READMEs and the canonical `.claude` skill work when run from their stated `scripts/art` directory. The contract-directory `treat.mjs` and `check.mjs` paths work. The canonical skill's repo-root `node scripts/art/contracts/sprite/check.mjs theater/public/art/*.png` passed all four sprites and created four cards in `/tmp`. `pnpm -C scripts/art treat ...` also passed, confirming the updated package script.
- `bash -n` passed for the loop and manifest; `node --check` passed for every sprite contract `.mjs`; `pnpm format:check` and `PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_codex_setup.py` both passed.

## Judgement

The claim does **not** hold. The mechanical sprite split is sound on ordinary no-space paths: the moved treatment bytes and prompt are identical, the deepened checker anchor works, normal scratch and repo-side treatment pass, guards and manifest validation work, and the updated README/skill commands resolve. But there are four MAJOR carried-forward loop/path defects (caller-CWD Sharp resolution with a partial workspace, an unquoted launch path, silent normalized-reference collisions, and URL-encoded sibling paths in `treat.mjs`), one MAJOR introduced stale-path defect (the moved `treat.mjs` example writes to the wrong tree), three MINOR refactor defects (the stale `.gitignore` path, unconditional sprite-skill guidance in the supposedly asset-agnostic loop, and sprite-only shared-package metadata), and one MINOR carried-forward misleading scratch-check command. Therefore sprite behavior is preserved in the normal case, but “no broken path or stale reference” and “genuinely asset-agnostic” are false.
