/*
 * Two-stage wheel smoothing: a notched mouse wheel glides instead of surging.
 *
 * WHAT IT FIXES
 * -------------
 * Lenis turns each wheel event into a new scroll target and eases toward it
 * exponentially (`lerp`). That is one stage of smoothing, and one stage leaves
 * the SPEED stepping: every click of a notched wheel adds 100px to the target,
 * the speed jumps the instant it lands and decays until the next one. Scrolled
 * continuously, the page lurches forward on each click. Evan felt it as a
 * "shaky" approach from the title to the lot (2026-10-16) — the one stretch
 * where the whole screen slides vertically, so a speed pulse is plain to see.
 * In the drive the same pulse is motion in depth and mostly reads as perspective.
 *
 * Modelled with Lenis's own `damp` (30 clicks at 70ms, steady state):
 *   one stage, lerp 0.1 (Lenis's default): speed swings ±12%, max/min 1.50x,
 *     settles ~940ms after the last click;
 *   two stages, lerp 0.16 each (this):    speed swings ±2–3%, max/min ~1.1x,
 *     settles ~780ms after the last click.
 * Lowering a single `lerp` was the other option and is strictly worse: 0.06
 * only gets the swing to ±7% and stretches the settle to 1.7s.
 *
 * HOW
 * ---
 * Stage one is here: wheel events are claimed through Lenis's own
 * `virtualScroll` hook, accumulated into a goal, and a smoothed target eases
 * toward that goal once per frame. Stage two is Lenis, unchanged — each frame
 * the smoothed target is handed to `scrollTo` with `programmatic: false`,
 * which is the exact path Lenis's own wheel handler takes. Because the target
 * the second stage chases now moves continuously, the speed is continuous too.
 *
 * Only the wheel. Touch, keys, the scrollbar and programmatic scrolls are
 * Lenis's as before, and a visitor who prefers reduced motion gets Lenis's own
 * handling untouched (it forces `lerp` to 1). Nothing here reads
 * `window.scrollY` (`SDS-005`): the starting point is Lenis's own target.
 */
import type { Scrolling, VirtualScrollData } from "lenis";

/**
 * Each stage's lerp, in Lenis's units (a fraction per 60Hz frame).
 *
 * 0.16 per stage settles a little faster than Lenis's single 0.1 while
 * cutting the per-click speed swing by about four. See the header.
 */
export const WHEEL_LERP = 0.16;

/** How close the smoothed target must get to the goal to count as there. */
const SETTLE_PX = 0.5;

/** The longest frame stage one will integrate over, in seconds. */
const MAX_FRAME_S = 0.1;

/** The part of Lenis this uses. Structural, so tests can hand in a fake. */
export interface SmoothScrollTarget {
  readonly targetScroll: number;
  readonly limit: number;
  readonly prefersReducedMotion: boolean;
  readonly isScrolling: Scrolling;
  scrollTo(
    target: number,
    options: { programmatic: false; lerp: number },
  ): void;
}

export interface WheelSmoother {
  /** Pass as Lenis's `virtualScroll` option. `false` claims the event. */
  readonly onVirtualScroll: (data: VirtualScrollData) => boolean;
  /** Hand over the Lenis instance the hook was given to. */
  attach(target: SmoothScrollTarget): void;
  /** Once per frame, before `lenis.raf`. `dt` is in seconds. */
  frame(dt: number): void;
  /** Drop a glide in progress: something else is about to move the page. */
  cancel(): void;
}

/** Lenis's `damp`: frame-rate independent exponential approach. */
export function damp(x: number, y: number, lambda: number, dt: number): number {
  return x + (y - x) * (1 - Math.exp(-lambda * dt));
}

export function wheelSmoother(): WheelSmoother {
  let lenis: SmoothScrollTarget | null = null;
  let active = false;
  let goal = 0;
  let smoothed = 0;

  const onVirtualScroll = (data: VirtualScrollData): boolean => {
    const { event, deltaY } = data;
    if (lenis === null) return true;
    if (!event.type.includes("wheel")) return true;
    /* Ctrl+wheel is the browser's zoom; Lenis lets it through, and so do we. */
    if (event.ctrlKey) return true;
    if (lenis.prefersReducedMotion) return true;
    if (deltaY === 0) return true;

    /* A fresh gesture starts from wherever Lenis is heading, so a glide never
     * snaps back over a keyboard or programmatic scroll that came before it. */
    if (!active) {
      goal = smoothed = lenis.targetScroll;
      active = true;
    }
    goal = Math.min(Math.max(goal + deltaY, 0), lenis.limit);

    if (event.cancelable) event.preventDefault();
    return false;
  };

  function frame(dt: number): void {
    if (!active || lenis === null) return;

    /* The visitor took over by other means — a key, the scrollbar. Lenis
     * reports that as native scrolling; chasing the old goal would fight it. */
    if (lenis.isScrolling === "native") {
      active = false;
      return;
    }

    if (lenis.prefersReducedMotion) {
      smoothed = goal;
    } else {
      smoothed = damp(
        smoothed,
        goal,
        WHEEL_LERP * 60,
        Math.min(Math.max(dt, 0), MAX_FRAME_S),
      );
    }
    if (Math.abs(goal - smoothed) < SETTLE_PX) {
      smoothed = goal;
      active = false;
    }

    lenis.scrollTo(smoothed, { programmatic: false, lerp: WHEEL_LERP });
  }

  return {
    onVirtualScroll,
    attach: (target) => {
      lenis = target;
    },
    frame,
    cancel: () => {
      active = false;
    },
  };
}
