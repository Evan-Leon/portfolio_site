# Sprite contract for the generation loop (../../new-run.sh).
#
# A contract tells the asset-agnostic loop three things: which tools to drop into
# the scratch workspace so Codex can self-check every try, which prompt template to
# seed, and (for a human reading this) which gate says accept/reject.
#
# CONTRACT_TOOLS — copied into the workspace and run by Codex in its sandbox. The
# sprite gate is treat.mjs (key -> fit -> measure), which writes its output only on a
# structural PASS. key/fit/measure are its stages; all four are copied.
#
# check.mjs is deliberately NOT here: it drives a real browser (docs/spikes/art-check.html)
# which Codex's sandbox cannot launch, so it is a repo-side step the human runs after
# (see this contract's README.md, step 4).
#
# CONTRACT_PROMPT — the template new-run.sh seeds prompt.md from, with @@TARGET@@ / @@REFS@@
# substituted.
CONTRACT_TOOLS=(key.mjs fit.mjs measure.mjs treat.mjs)
CONTRACT_PROMPT=PROMPT-TEMPLATE.md
