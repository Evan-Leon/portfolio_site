/*
 * Scenes as elements, and the only place layout is read.
 *
 * `SDS-004` in practice: every `getBoundingClientRect()` in the engine happens
 * here, in `measure()`, which runs on mount and on resize — never inside the
 * frame callback. `engine.ts` reads the numbers this file caches and does
 * arithmetic on them, which is why a grep for layout properties in that file
 * returns nothing.
 *
 * The structure per scene is the one `docs/wireframes/page-shell.html`
 * approved: a **spacer** whose height is the scene's scroll length, containing
 * a **pinned container** one viewport tall. The adapter is handed the pinned
 * container and nothing else (`SDS-002`).
 */
import type { Host } from "../host/types";
import type { SceneDef } from "../scenes/types";

/** Class on a scene's spacer — the element whose height is the scroll length. */
export const SCENE_CLASS = "sds-scene";

/** Class on the pinned container. The adapter's container, and its whole world. */
export const SCENE_PIN_CLASS = "sds-scene__pin";

/**
 * Attribute carrying the scene's id, on the spacer.
 *
 * A `data-` attribute rather than `id`: scene ids come from a hand-written
 * registry and a duplicate or a value like `main` would collide with the page's
 * own ids, which SD7 fills with real content.
 */
export const SCENE_ID_ATTRIBUTE = "data-scene";

/**
 * Attribute on an empty element in the page marking **where** a scene goes.
 *
 * This is what makes SD7's interleaved content possible. The engine builds the
 * scene elements, but a page is `hero → scene → copy → scene → closing`, and a
 * mount root that only ever appends puts every scene in one run at the end.
 * `index.html` writes `<div data-scene-slot="intro"></div>` at the position the
 * scene belongs, and the spacer **replaces** that element — so the content
 * sections around it stay real HTML in the document, readable with JavaScript
 * off and by a crawler, which is the whole point of interleaving them.
 *
 * Placement is the page's business and timing is the registry's: the slot says
 * where, `SceneDef.vh` says how long. A scene with no slot is appended to the
 * mount root as before, which is what every test and SD11's shadow root do.
 * The first slot for a given id wins; the rest are reported as unclaimed.
 */
export const SCENE_SLOT_ATTRIBUTE = "data-scene-slot";

/** A scene's cached position on the page, in CSS pixels. */
export interface SceneMetrics {
  /** Distance from the top of the document to the top of the spacer. */
  top: number;
  /**
   * The scene's **pinned duration**: spacer height minus one viewport height.
   * A 300vh scene on an 800px viewport is 2400px tall and 1600px long.
   */
  length: number;
}

/** The pinned container's size — what `adapter.resize` is called with. */
export interface SceneSize {
  width: number;
  height: number;
}

/** One scene, as elements on the page plus the numbers measured off them. */
export interface MountedScene {
  /** The registry entry this was built from. */
  readonly def: SceneDef;
  /** The spacer. Its height is the scene's scroll length. */
  readonly spacer: HTMLElement;
  /** The pinned container, handed to the adapter as its container. */
  readonly pin: HTMLElement;
  /** Cached position and length. Refreshed by {@link measure}. */
  readonly metrics: SceneMetrics;
  /**
   * Cached size of the pinned container — **not** the viewport size. The two
   * differ whenever a host embeds the experience at less than full width, which
   * is the normal Wix case.
   */
  readonly pinSize: SceneSize;
  /**
   * Re-read layout and refresh both caches, given the current scroll position
   * and viewport height.
   *
   * Takes numbers rather than a `ScrollSource` for the same reason the progress
   * math does: the caller has already read scroll for this frame, and handing
   * the source over would invite a second read (`SDS-005`).
   */
  measure(scrollY: number, viewportHeight: number): void;
  /** Take the scene's elements off the page. */
  remove(): void;
}

/**
 * Build a container pair for every scene, put each one where the page asks for
 * it (see {@link SCENE_SLOT_ATTRIBUTE}) or at the end of the mount root, then
 * measure them all.
 *
 * Measuring happens after the last element is placed rather than per scene:
 * placing a spacer moves everything below it, so a top measured before the next
 * placement is stale the moment it is taken.
 */
export function mountScenes(
  host: Host,
  scenes: readonly SceneDef[],
): MountedScene[] {
  const root = host.mountRoot();
  const mounted = scenes.map((def) => new Scene(def, host.pinStrategy));
  const slots = findSlots(root);

  for (const scene of mounted) {
    const slot = slots.get(scene.def.id);
    if (slot) {
      slot.replaceWith(scene.spacer);
      slots.delete(scene.def.id);
    } else {
      root.append(scene.spacer);
    }
  }

  /*
   * A slot no scene claims means the page shell and the registry disagree —
   * a renamed or removed scene id. Nothing throws: the leftover element is an
   * empty div and the scene, if it exists at all, is appended at the end of the
   * page instead. That is precisely the kind of silent wrong-order failure
   * worth one line of console noise.
   */
  if (slots.size > 0) {
    const unclaimed = [...slots.keys()].map((id) => `"${id}"`).join(", ");
    console.warn(
      `[sds] no scene in the registry matches scene slot ${unclaimed}`,
    );
  }

  const source = host.scrollSource();
  const scrollY = source.scrollY();
  const viewportHeight = source.viewportHeight();
  for (const scene of mounted) scene.measure(scrollY, viewportHeight);

  return mounted;
}

/**
 * Every scene slot in the page, by the id it claims.
 *
 * Collected by walking the elements rather than by building a
 * `[data-scene-slot="…"]` selector per scene: ids come from a hand-written
 * registry and could contain a quote or a bracket, which would make such a
 * selector throw rather than simply not match.
 */
function findSlots(root: HTMLElement | ShadowRoot): Map<string, Element> {
  const slots = new Map<string, Element>();

  for (const slot of root.querySelectorAll(`[${SCENE_SLOT_ATTRIBUTE}]`)) {
    const id = slot.getAttribute(SCENE_SLOT_ATTRIBUTE);
    if (id !== null && id !== "" && !slots.has(id)) slots.set(id, slot);
  }

  return slots;
}

class Scene implements MountedScene {
  readonly spacer: HTMLElement;
  readonly pin: HTMLElement;

  #metrics: SceneMetrics = { top: 0, length: 0 };
  #pinSize: SceneSize = { width: 0, height: 0 };

  constructor(
    readonly def: SceneDef,
    pinStrategy: Host["pinStrategy"],
  ) {
    this.spacer = document.createElement("div");
    this.spacer.className = SCENE_CLASS;
    this.spacer.setAttribute(SCENE_ID_ATTRIBUTE, def.id);

    /*
     * The one inline style the engine writes. It is per-scene data, not design
     * — `vh: 300` becomes `height: 300vh` — and putting it in the injected
     * stylesheet would mean generating a rule per scene id.
     */
    this.spacer.style.height = `${def.vh}vh`;

    this.pin = document.createElement("div");
    this.pin.className = `${SCENE_PIN_CLASS} ${SCENE_PIN_CLASS}--${pinStrategy}`;
    this.spacer.append(this.pin);
  }

  get metrics(): SceneMetrics {
    return this.#metrics;
  }

  get pinSize(): SceneSize {
    return this.#pinSize;
  }

  measure(scrollY: number, viewportHeight: number): void {
    const rect = this.spacer.getBoundingClientRect();
    const pinRect = this.pin.getBoundingClientRect();

    /*
     * `rect.top` is viewport-relative, so the scroll position has to be added
     * back to get a document-relative top — the frame of reference
     * `sceneProgress` expects, and the only one that stays valid as the page
     * scrolls. `offsetTop` would avoid the addition and bring its own problem:
     * it is relative to the nearest positioned ancestor, which is whatever the
     * host page happens to have.
     */
    this.#metrics = {
      top: rect.top + scrollY,
      length: rect.height - viewportHeight,
    };

    this.#pinSize = { width: pinRect.width, height: pinRect.height };
  }

  remove(): void {
    this.spacer.remove();
  }
}
