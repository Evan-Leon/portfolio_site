/*
 * The engine's structural CSS, as a string.
 *
 * WHY A STRING AND NOT A STYLESHEET
 * ---------------------------------
 * This geometry is the engine's own — a scene does not scrub at all without it
 * — and SD11 mounts the whole experience inside a shadow root, which a
 * page-level stylesheet cannot reach (`SDS-009`). An `import './engine.css'`
 * would work in the standalone build and silently style nothing in the Wix one.
 * `Host.injectStyles` exists precisely so the engine can hand its CSS to
 * whichever root it is actually running in.
 *
 * SD7 styles page chrome and content sections in `global.css`. It must not
 * restate anything here: two copies of the pin geometry, one of which the Wix
 * build never loads, is the exact failure this file avoids.
 *
 * Everything visual comes from `--sds-*` tokens (`EVO-UNI-001`). There is no
 * `:root` block here, so `SDS-009` has nothing to bite on — the tokens
 * themselves are declared `:host, :root` in `tokens.css`.
 */
import { SCENE_CLASS, SCENE_PIN_CLASS } from "./mount";

/**
 * The spacer-plus-pin geometry, following `docs/wireframes/page-shell.html`.
 *
 * Two elements per scene and one idea: the **spacer** is a normal block whose
 * `height: {vh}vh` is the scene's scroll length, and the **pin** inside it is
 * one viewport tall and stays put while that length scrolls past. The spacer is
 * what gives the page its scroll range; the pin is what the visitor looks at.
 *
 * `--sticky` is the standalone strategy and releases on its own at the end of
 * the spacer, because that is what a sticky element does at the end of its
 * containing block.
 *
 * `--fixed` exists for the Wix host, which selects it only if SD1 measured
 * sticky as broken. **It does not release on its own**: a fixed element is out
 * of flow and stays on screen until something removes it. That is survivable
 * here only because the engine unmounts a scene past its unload margin, which
 * takes the element out of the DOM — a scene whose margins were widened to
 * cover the whole page would stay on screen under this strategy. Making `fixed`
 * release properly needs a three-state machine (before → pinned → parked at the
 * bottom) that no phase specifies, and it belongs with SD11 if SD1 ever forces
 * that path.
 */
export const ENGINE_STYLES = `
.${SCENE_CLASS} {
  position: relative;
  z-index: var(--sds-z-scene);
}

.${SCENE_PIN_CLASS} {
  height: 100svh;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.${SCENE_PIN_CLASS}--sticky {
  position: sticky;
  top: 0;
}

.${SCENE_PIN_CLASS}--fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
}
`.trim();
