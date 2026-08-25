/*
 * A fake layout for jsdom, and the counterpart to `createFakeScrollSource`.
 *
 * jsdom has no layout engine: every `getBoundingClientRect()` returns zeros, so
 * a scene measured under it is 0px tall, has no pinned duration, and reports
 * progress `0` at every scroll position. Without something here, the entire
 * mount-and-scrub path would be untestable outside a real browser.
 *
 * This lives beside the code it fakes rather than inside a test file for the
 * same reason `createFakeScrollSource` does: two test files need it (mount and
 * engine), and it has to know the DOM shape `mount.ts` builds — the
 * `data-scene` attribute and the pin class — which is knowledge that belongs
 * next to the module that produces it. Nothing in `src/main.ts` imports it, so
 * it never reaches a bundle.
 *
 * Rects are returned **viewport-relative and scroll-aware**, exactly as a
 * browser reports them. That is deliberate: `measure()` has to add the scroll
 * position back to recover a document-relative top, and a fake that ignored
 * scroll would let an implementation that forgot the addition pass every test
 * (`EVO-UNI-061`).
 */
import type { ScrollSource } from "./scroll-source";
import { SCENE_ID_ATTRIBUTE, SCENE_PIN_CLASS } from "./mount";

/** What a test declares about one scene's geometry, in CSS pixels. */
export interface FakeSceneLayout {
  /** Distance from the top of the document to the top of the spacer. */
  top: number;
  /** The spacer's full height — `vh / 100 × viewportHeight` in a real browser. */
  height: number;
  /** The pinned container's width. Defaults to the spacer's own width. */
  pinWidth?: number;
  /** The pinned container's height. Defaults to one viewport height. */
  pinHeight?: number;
}

/** The handle a test uses to declare geometry and to undo the patch. */
export interface FakeLayout {
  /** Declare (or redeclare) the geometry of the scene with this id. */
  set(sceneId: string, layout: FakeSceneLayout): void;
  /** Put jsdom's own `getBoundingClientRect` back. Call this in `afterEach`. */
  restore(): void;
}

/** Every element's width, since nothing here varies horizontally by default. */
const FAKE_VIEWPORT_WIDTH = 1024;

/**
 * Patch `Element.prototype.getBoundingClientRect` so mounted scenes measure.
 *
 * ```ts
 * const source = createFakeScrollSource({ viewportHeight: 800 })
 * const layout = installFakeLayout(source)
 * layout.set('intro', { top: 800, height: 2400 })
 * ```
 *
 * Elements with no declared layout — and every element outside a scene — keep
 * returning zeros, so an unrelated element cannot silently pick up a rect.
 *
 * **Always `restore()` in `afterEach`.** The patch is on the prototype and
 * would otherwise outlive the test file that installed it.
 */
export function installFakeLayout(source: ScrollSource): FakeLayout {
  const layouts = new Map<string, FakeSceneLayout>();
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function fakeRect(
    this: Element,
  ): DOMRect {
    const element = this as HTMLElement;
    const pin = element.classList.contains(SCENE_PIN_CLASS);
    const spacer = pin ? element.parentElement : element;
    const sceneId = spacer?.getAttribute(SCENE_ID_ATTRIBUTE);
    const layout =
      sceneId === null || sceneId === undefined
        ? undefined
        : layouts.get(sceneId);

    if (!layout) return original.call(this);

    if (pin) {
      // A pinned container sits at the top of the viewport for the whole time
      // it is pinned, so its own rect never depends on the scroll position.
      return rect(
        0,
        layout.pinWidth ?? FAKE_VIEWPORT_WIDTH,
        layout.pinHeight ?? source.viewportHeight(),
      );
    }

    return rect(
      layout.top - source.scrollY(),
      FAKE_VIEWPORT_WIDTH,
      layout.height,
    );
  };

  return {
    set(sceneId: string, layout: FakeSceneLayout): void {
      layouts.set(sceneId, layout);
    },
    restore(): void {
      Element.prototype.getBoundingClientRect = original;
    },
  };
}

/** A `DOMRect` at `left: 0`, since nothing in this project reads horizontally. */
function rect(top: number, width: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  };
}
