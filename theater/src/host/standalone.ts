/*
 * The standalone host — the experience as its own web page.
 *
 * The whole file is small on purpose. A host is four decisions, and this one
 * makes the boring version of each: mount where you were told, read the real
 * window, pin with `sticky`, and put CSS in the document head.
 */
import {
  createWindowScrollSource,
  type ScrollSource,
} from "../engine/scroll-source";
import type { Host, PinStrategy } from "./types";

/**
 * `sticky`, matching `docs/wireframes/page-shell.html`.
 *
 * Not a free choice. `sticky` releases at the end of its containing block for
 * nothing, whereas `fixed` never releases on its own and would need a
 * three-state machine (before → pinned → parked at the bottom) that no phase
 * specifies. `'fixed'` exists in {@link PinStrategy} for the Wix host, which
 * picks it only if SD1 measured `sticky` as broken on the real page.
 */
const STANDALONE_PIN_STRATEGY: PinStrategy = "sticky";

/**
 * Build a host that runs the experience inside `root` on an ordinary page.
 *
 * ```ts
 * const host = standaloneHost(document.querySelector('#app')!)
 * createEngine({ host, scenes }).start()
 * ```
 */
export function standaloneHost(root: HTMLElement): Host {
  /*
   * Built once and reused. `createWindowScrollSource()` reads nothing when it
   * is constructed, so a fresh one per call would be harmless — but the
   * interface tells implementers to return a stable source, and a host that
   * quietly did otherwise would make that promise untestable everywhere else.
   */
  let source: ScrollSource | undefined;

  /*
   * What has already been injected, by exact CSS text. `start()` after
   * `stop()` hands over the same string again; without this the head collects
   * a duplicate stylesheet per cycle. Deduping on content rather than on a
   * marker attribute keeps it correct when a later phase injects a second,
   * different sheet.
   */
  const injected = new Set<string>();

  return {
    mountRoot: () => root,

    scrollSource: () => (source ??= createWindowScrollSource()),

    pinStrategy: STANDALONE_PIN_STRATEGY,

    injectStyles(css: string): void {
      if (injected.has(css)) return;
      injected.add(css);

      /*
       * `root.ownerDocument`, not the ambient `document`: a host handed an
       * element from another document (a template, an iframe) would otherwise
       * style the wrong page and render this one unstyled with no error.
       */
      const style = root.ownerDocument.createElement("style");
      style.textContent = css;
      root.ownerDocument.head.append(style);
    },
  };
}
