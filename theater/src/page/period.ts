/*
 * Time of day: what part of the day the visitor is arriving in, published as a
 * `data-period` attribute for CSS to branch on.
 *
 * Ported from jourNOW's `utils/timePeriod.ts` — same six periods and the same
 * hour bands, because both sites are meant to read as the same time of day when
 * they are open side by side. What is *not* ported is that module's shape: it
 * reads `document` and `new Date()` from module scope, which is untestable
 * without stubbing globals. Everything variable here — the root, the clock, the
 * document the listener goes on — arrives as a parameter.
 *
 * WHICH ELEMENT THE ATTRIBUTE GOES ON
 * -----------------------------------
 * The token blocks in `styles/tokens.css` are scoped `:host, :root`
 * (`SDS-009`), so the attribute has to land on whichever element that selector
 * pair matches in the target being built. In the standalone build that is
 * `document.documentElement`, which is what `main.ts` passes. An embedded host
 * mounting into a shadow root would install on its own custom-element host
 * instead — `:root` does not match a ShadowRoot, and an attribute left on
 * `<html>` there would style nothing at all, silently. Hence `root` is an
 * argument and this module never reaches for `document` on its own.
 *
 * WHY THERE IS NO TIMER
 * ---------------------
 * A page left open across a band boundary is re-evaluated when the tab next
 * becomes visible, not on an interval. `visibilitychange` on the document is
 * the only listener this module adds; `SDS-005` reserves scroll and window
 * events for the engine's `ScrollSource`, and a `setInterval` would keep a
 * backgrounded tab doing work for a change nobody is looking at.
 */

/** The six periods, in the order the day runs. */
export const PERIODS = [
  "dawn",
  "morning",
  "afternoon",
  "sunset",
  "evening",
  "night",
] as const;

export type Period = (typeof PERIODS)[number];

/** The attribute CSS branches on: `:host([data-period="night"]), :root[...]`. */
export const PERIOD_ATTRIBUTE = "data-period";

/** The query parameter that pins the period — `/theater/?period=night`. */
export const PERIOD_PARAM = "period";

/**
 * The period an hour of the local day belongs to.
 *
 * Throws for anything that is not an integer hour. The alternative — falling
 * through to `night` — turns a caller that passed minutes, or did its own
 * arithmetic, into a page that is permanently dark with nothing to notice it
 * by.
 */
export function periodForHour(hour: number): Period {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(
      `Expected an integer hour from 0 to 23, got ${String(hour)}`,
    );
  }

  if (hour >= 5 && hour <= 7) return "dawn";
  if (hour >= 8 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 19) return "sunset";
  if (hour >= 20 && hour <= 21) return "evening";
  return "night";
}

/**
 * The period a moment falls in, by the visitor's own clock.
 *
 * The bands live in {@link periodForHour} and nowhere else — jourNOW inlines
 * them here, which would leave two copies to drift and, more immediately, would
 * make a test that stubs `periodForHour` unable to see this path at all.
 */
export function getPeriod(date: Date = new Date()): Period {
  return periodForHour(date.getHours());
}

/**
 * The period named by a query string, or `null` if it names none.
 *
 * `URLSearchParams` rather than any hand-rolled split of `location.search`
 * (`EVO-FE-183`): the rule is written about *building* params, and reading them
 * has the same failure — `search.split('=')[1]` is right for `?period=night`
 * and returns `"1&period"` for `?other=1&period=night`, which is a period the
 * page then silently ignores.
 *
 * An unknown value is `null`, not a throw: this is a visitor-supplied URL, and
 * a typo should show the real time of day rather than a blank page.
 */
export function periodFromSearch(search: string): Period | null {
  const value = new URLSearchParams(search).get(PERIOD_PARAM);
  return isPeriod(value) ? value : null;
}

/** Publish `period` on `root`, where the token blocks can see it. */
export function applyPeriod(root: HTMLElement, period: Period): void {
  root.setAttribute(PERIOD_ATTRIBUTE, period);
}

/** Everything {@link installPeriod} is allowed to reach outside itself. */
export interface PeriodOptions {
  /** The page's query string — `location.search` in the standalone build. */
  search: string;
  /** The clock. Injected so tests can move it without stubbing `Date`. */
  now?: () => Date;
  /** Where the `visibilitychange` listener goes. Defaults to `root`'s own. */
  doc?: Document;
}

/**
 * Apply the period to `root` and keep it current. Returns an uninstaller.
 *
 * An explicit `?period=` is a pin, not a starting point: it applies once and no
 * listener is added, so a spec that asked for `night` cannot have the sky
 * change under it when the browser fires `visibilitychange` mid-run. Without
 * one, the clock is re-read whenever the tab becomes visible again — the case
 * this exists for is a page left open through sunset, which would otherwise
 * still be showing the afternoon sky at midnight.
 */
export function installPeriod(
  root: HTMLElement,
  options: PeriodOptions,
): () => void {
  const { search, now = () => new Date(), doc = root.ownerDocument } = options;

  const override = periodFromSearch(search);
  applyPeriod(root, override ?? getPeriod(now()));

  /* Nothing to remove, but an uninstaller is still returned so callers never
   * have to know which branch they got. */
  if (override) return () => {};

  function reapply(): void {
    /* `visibilitychange` fires on the way *out* as well as the way in. Applying
     * on the hidden edge would do the work at the one moment nobody can see it,
     * and in a backgrounded tab whose timers the browser is already throttling. */
    if (doc.visibilityState !== "visible") return;
    applyPeriod(root, getPeriod(now()));
  }

  doc.addEventListener("visibilitychange", reapply);
  return () => doc.removeEventListener("visibilitychange", reapply);
}

function isPeriod(value: string | null): value is Period {
  return value !== null && (PERIODS as readonly string[]).includes(value);
}
