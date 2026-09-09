#!/usr/bin/env bash
#
# Scaffold a Codex art run: a scratch workspace with the treatment tools, the edit target
# and any style references converted to clean PNGs, and a prompt stub to fill in.
#
#   ./new-run.sh <run-name> <edit-target.png> [reference.jpg|webp|png ...]
#
# Prints the workspace path and the exact `codex exec` line to launch. It does NOT launch
# anything — read the prompt you wrote before spending a run.
#
# Why a scratch workspace at all: Codex runs with `-C <dir> --skip-git-repo-check` outside
# every repo, so a run can never write into the tree. The treated sprite is copied back in
# by hand, after the browser check, by a human who looked at it.
#
# Why references get re-encoded: the generator rejected a JPEG carrying MPO metadata on the
# 2026-09-09 portrait run. `sharp` re-encodes to a plain PNG and the problem goes away.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -lt 2 ]; then
  echo "usage: $0 <run-name> <edit-target.png> [reference ...]" >&2
  echo "  e.g. $0 plate-and-ring ../../theater/public/art/car.png ~/pics/CT-plate.jpg" >&2
  exit 2
fi

name="$1"
target="$2"
shift 2

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

# Tools and their deps, so Codex can self-check every try without a browser.
cp "$here"/key.mjs "$here"/fit.mjs "$here"/measure.mjs "$here"/treat.mjs "$here"/package.json "$w/"
cp -r "$here/node_modules" "$w/"

# Edit target and references, re-encoded to plain PNG.
refs=()
node -e '
const sharp = require("sharp");
const [out, target, ...refs] = process.argv.slice(1);
(async () => {
  const say = async (src, dest) => {
    await sharp(src).png().toFile(dest);
    const m = await sharp(dest).metadata();
    console.error(`  ${dest.split("/").slice(-2).join("/")}  ${m.width}x${m.height}  alpha=${!!m.hasAlpha}`);
  };
  await say(target, `${out}/ref/edit-target.png`);
  for (const r of refs) {
    const stem = r.split("/").pop().replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
    "$here/PROMPT-TEMPLATE.md" > "$w/prompt.md"

cat <<EOF

workspace: $w
  prompt.md   <- WRITE THIS FIRST; the template marks every section that matters
  ref/        edit-target.png$( [ ${#refs[@]} -gt 0 ] && printf ' + %s' "${refs[*]}" )
  raw/ out/   Codex fills these

Then launch it detached (runs exceed the Bash tool's 10-minute cap):

  cd $w && setsid nohup env -u NODE_OPTIONS codex exec \\
    -s workspace-write -c sandbox_workspace_write.network_access=true \\
    -c model=gpt-6-astra -c model_reasoning_effort=medium \\
    -C "$w" --skip-git-repo-check - < prompt.md > codex.log 2>&1 &

Confirm the banner says \`model: gpt-6-astra\` and \`(network access enabled)\` — the config
default runs reasoning effort \`none\`, which is not what you want. Then watch it with a
Monitor on codex.log; see the treating-art-sprites skill for the filter and what follows.
EOF
