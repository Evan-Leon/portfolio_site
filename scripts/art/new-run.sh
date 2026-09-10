#!/usr/bin/env bash
#
# Scaffold a Codex generation run: a scratch workspace with a contract's treatment tools,
# the edit target and any style references converted to clean PNGs, and a prompt stub to
# fill in.
#
#   ./new-run.sh <contract> <run-name> <edit-target.png> [reference.jpg|webp|png ...]
#
# The loop itself is asset-agnostic. What makes a run a *sprite* run (or any other asset)
# is the <contract> — a directory under contracts/ holding a manifest.sh (the tools to copy
# and the prompt template), the template, the tools, and a README. `sprite` is the reference
# contract; add another by copying its shape (see contracts/sprite/README.md and README.md).
#
# Prints the workspace path and the exact `codex exec` line to launch. It does NOT launch
# anything — read the prompt you wrote before spending a run.
#
# Why a scratch workspace at all: Codex runs with `-C <dir> --skip-git-repo-check` outside
# every repo, so a run can never write into the tree. The treated asset is copied back in
# by hand, after the check, by a human who looked at it.
#
# Why references get re-encoded: the generator rejected a JPEG carrying MPO metadata on the
# 2026-09-09 portrait run. `sharp` re-encodes to a plain PNG and the problem goes away.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

contracts_dir="$here/contracts"
list_contracts() { find "$contracts_dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | paste -sd' ' -; }

if [ $# -lt 3 ]; then
  echo "usage: $0 <contract> <run-name> <edit-target.png> [reference ...]" >&2
  echo "  contracts: $(list_contracts)" >&2
  echo "  e.g. $0 sprite plate-and-ring ../../theater/public/art/car.png ~/pics/CT-plate.jpg" >&2
  exit 2
fi

contract="$1"
name="$2"
target="$3"
shift 3

cdir="$contracts_dir/$contract"
if [ ! -d "$cdir" ] || [ ! -f "$cdir/manifest.sh" ]; then
  echo "error: unknown contract '$contract' (no $cdir/manifest.sh)" >&2
  echo "  available: $(list_contracts)" >&2
  exit 2
fi

# CONTRACT_TOOLS (array) + CONTRACT_PROMPT (filename), relative to the contract dir.
CONTRACT_TOOLS=()
CONTRACT_PROMPT=""
# shellcheck source=/dev/null
source "$cdir/manifest.sh"
if [ ${#CONTRACT_TOOLS[@]} -eq 0 ] || [ -z "$CONTRACT_PROMPT" ]; then
  echo "error: $cdir/manifest.sh must set CONTRACT_TOOLS (non-empty) and CONTRACT_PROMPT" >&2
  exit 1
fi
if [ ! -f "$cdir/$CONTRACT_PROMPT" ]; then
  echo "error: prompt template $cdir/$CONTRACT_PROMPT not found" >&2
  exit 1
fi
for t in "${CONTRACT_TOOLS[@]}"; do
  if [ ! -f "$cdir/$t" ]; then
    echo "error: contract tool $cdir/$t not found" >&2
    exit 1
  fi
done

if [ ! -d "$here/node_modules/sharp" ]; then
  echo "error: dependencies missing — run: pnpm -C scripts/art install --ignore-workspace" >&2
  exit 1
fi

root="${ART_RUN_ROOT:-${TMPDIR:-/tmp}}"
w="$root/art-run-$name"
if [ -e "$w" ]; then
  echo "error: $w already exists — pick another run name, or remove it" >&2
  exit 1
fi
mkdir -p "$w/ref" "$w/raw" "$w/out"
# If anything below fails, remove the half-built workspace, so a retry with the same run name
# is not blocked by the duplicate-run guard on a workspace that never got its prompt.md.
trap 'rc=$?; [ "$rc" -ne 0 ] && rm -rf "$w"; exit "$rc"' EXIT

# The contract's tools and the shared deps, so Codex can self-check every try without a browser.
for t in "${CONTRACT_TOOLS[@]}"; do cp "$cdir/$t" "$w/"; done
cp "$here/package.json" "$w/"
cp -r "$here/node_modules" "$w/"

# Edit target and references, re-encoded to plain PNG. NODE_PATH anchors `require("sharp")` to
# the shared deps regardless of the caller's cwd; the file arguments still resolve against it.
refs=()
NODE_PATH="$here/node_modules" node -e '
const sharp = require("sharp");
const [out, target, ...refs] = process.argv.slice(1);
(async () => {
  const say = async (src, dest) => {
    await sharp(src).png().toFile(dest);
    const m = await sharp(dest).metadata();
    console.error(`  ${dest.split("/").slice(-2).join("/")}  ${m.width}x${m.height}  alpha=${!!m.hasAlpha}`);
  };
  await say(target, `${out}/ref/edit-target.png`);
  const seen = new Map();
  for (const r of refs) {
    const stem = r.split("/").pop().replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (seen.has(stem)) {
      console.error(`error: references "${seen.get(stem)}" and "${r}" both normalise to ref/${stem}.png — rename one`);
      process.exit(1);
    }
    seen.set(stem, r);
    await say(r, `${out}/ref/${stem}.png`);
  }
})().catch((e) => { console.error("error:", e.message); process.exit(1); });
' "$w" "$target" "$@"

for r in "$@"; do
  stem="$(basename "$r")"; stem="${stem%.*}"
  stem="$(echo "$stem" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g')"
  refs+=("\`ref/$stem.png\`")
done

sed -e "s|@@TARGET@@|ref/edit-target.png|" \
    -e "s|@@REFS@@|$(printf '%s ' "${refs[@]:-（none）}")|" \
    "$cdir/$CONTRACT_PROMPT" > "$w/prompt.md"

cat <<EOF

contract: $contract  (tools: ${CONTRACT_TOOLS[*]})
workspace: $w
  prompt.md   <- WRITE THIS FIRST; the template marks every section that matters
  ref/        edit-target.png$( [ ${#refs[@]} -gt 0 ] && printf ' + %s' "${refs[*]}" )
  raw/ out/   Codex fills these

Then launch it detached (runs exceed the Bash tool's 10-minute cap):

  cd "$w" && setsid nohup env -u NODE_OPTIONS codex exec \\
    -s workspace-write -c sandbox_workspace_write.network_access=true \\
    -c model=gpt-6-astra -c model_reasoning_effort=medium \\
    -C "$w" --skip-git-repo-check - < prompt.md > codex.log 2>&1 &

Confirm the banner says \`model: gpt-6-astra\` and \`(network access enabled)\` — the config
default runs reasoning effort \`none\`, which is not what you want. Then watch it with a
Monitor on codex.log; see $cdir/README.md for the monitor filter and what follows.
EOF
