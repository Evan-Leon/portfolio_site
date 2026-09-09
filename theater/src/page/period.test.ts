/*
 * The time-of-day engine, against literal expected values.
 *
 * WHY EVERY HOUR IS WRITTEN OUT
 * -----------------------------
 * The table below is twenty-four rows, one per hour, each naming its period as
 * a string. Looping over the bands and recomputing the boundary — `for (let h =
 * 5; h <= 7; h += 1) expect(periodForHour(h)).toBe('dawn')` — restates the
 * implementation and passes for whatever the boundaries happen to be
 * (`EVO-UNI-017`, `EVO-UNI-018`). These rows fail the moment a band moves,
 * which is the point: the bands are a design decision ported from jourNOW, not
 * arithmetic anyone can re-derive.
 *
 * WHY THE DATES ARE FIXED AND NOT RELATIVE TO `Date.now()`
 * --------------------------------------------------------
 * A deliberate departure from `EVO-UNI-015`. That rule exists so a fixture
 * cannot rot as the wall clock moves past it — but the unit under test *is* the
 * hour band, and a fixture built from `Date.now()` would assert about whichever
 * hour the suite happened to run at, so the same test would exercise `night` on
 * a late CI run and `afternoon` on a local one. `new Date(2026, 0, 1, 9)` is
 * local-time 09:00 by construction, which is exactly what `getHours()` reads.
 *
 * No fake timers: the module takes `now` as a parameter precisely so the clock
 * can be moved by reassigning a variable, and stubbing `Date` globally would
 * test the stub.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  applyPeriod,
  getPeriod,
  installPeriod,
  PERIOD_ATTRIBUTE,
  PERIODS,
  periodForHour,
  periodFromSearch,
  type Period,
} from "./period";

/** Every hour of the day and the period it belongs to. Not a loop. */
const HOURS: ReadonlyArray<readonly [number, Period]> = [
  [0, "night"],
  [1, "night"],
  [2, "night"],
  [3, "night"],
  [4, "night"],
  [5, "dawn"],
  [6, "dawn"],
  [7, "dawn"],
  [8, "morning"],
  [9, "morning"],
  [10, "morning"],
  [11, "morning"],
  [12, "afternoon"],
  [13, "afternoon"],
  [14, "afternoon"],
  [15, "afternoon"],
  [16, "afternoon"],
  [17, "sunset"],
  [18, "sunset"],
  [19, "sunset"],
  [20, "evening"],
  [21, "evening"],
  [22, "night"],
  [23, "night"],
];

/** A detached element to install onto — the standalone page's `<html>` stand-in. */
function root(): HTMLElement {
  return document.createElement("div");
}

/** What `installPeriod` wrote on `element`. */
function periodOf(element: HTMLElement): string | null {
  return element.getAttribute(PERIOD_ATTRIBUTE);
}

/**
 * jsdom reports `visible` already, but it is asserted here rather than assumed:
 * the listener's guard reads this property, and a jsdom that defaulted to
 * `hidden` would make every re-apply test pass for the wrong reason.
 */
function setVisibility(doc: Document, state: DocumentVisibilityState): void {
  Object.defineProperty(doc, "visibilityState", {
    value: state,
    configurable: true,
  });
}

afterEach(() => {
  setVisibility(document, "visible");
});

describe("periodForHour", () => {
  for (const [hour, period] of HOURS) {
    it(`maps ${hour}:00 to ${period}`, () => {
      expect(periodForHour(hour)).toBe(period);
    });
  }

  /*
   * A `RangeError` rather than a silent `night`: the only ways to reach this
   * are a caller that did its own arithmetic on an hour or one that passed a
   * minute count, and both produce a page that is quietly stuck in the wrong
   * sky rather than an error anyone can see.
   */
  it("rejects an hour past the end of the day", () => {
    expect(() => periodForHour(24)).toThrow(RangeError);
  });

  it("rejects a negative hour", () => {
    expect(() => periodForHour(-1)).toThrow(RangeError);
  });

  it("rejects a fractional hour", () => {
    expect(() => periodForHour(9.5)).toThrow(RangeError);
  });
});

describe("getPeriod", () => {
  it("reads the local hour off the date it is handed", () => {
    expect(getPeriod(new Date(2026, 0, 1, 9))).toBe("morning");
  });

  it("reads midnight as night", () => {
    expect(getPeriod(new Date(2026, 0, 1, 0))).toBe("night");
  });
});

describe("periodFromSearch", () => {
  for (const period of PERIODS) {
    it(`reads ?period=${period}`, () => {
      expect(periodFromSearch(`?period=${period}`)).toBe(period);
    });
  }

  it("ignores a period that is not one of the six", () => {
    expect(periodFromSearch("?period=noon")).toBeNull();
  });

  it("ignores an empty period", () => {
    expect(periodFromSearch("?period=")).toBeNull();
  });

  it("returns null when there is no query string at all", () => {
    expect(periodFromSearch("")).toBeNull();
  });

  /* The parameter is found by name, not by position — the failure a hand-rolled
   * `search.split('=')[1]` would produce (`EVO-FE-183`). */
  it("finds the period beside another parameter", () => {
    expect(periodFromSearch("?other=1&period=sunset")).toBe("sunset");
  });
});

describe("applyPeriod", () => {
  it("writes the period onto the element it is handed", () => {
    const element = root();
    applyPeriod(element, "dawn");
    expect(periodOf(element)).toBe("dawn");
  });
});

describe("installPeriod", () => {
  it("applies the clock's period once, at install", () => {
    const element = root();
    installPeriod(element, {
      search: "",
      now: () => new Date(2026, 0, 1, 9),
      doc: document,
    });
    expect(periodOf(element)).toBe("morning");
  });

  it("lets ?period= override the clock", () => {
    const element = root();
    installPeriod(element, {
      search: "?period=night",
      now: () => new Date(2026, 0, 1, 9),
      doc: document,
    });
    expect(periodOf(element)).toBe("night");
  });

  it("re-applies the clock when the tab becomes visible again", () => {
    const element = root();
    let clock = new Date(2026, 0, 1, 19, 59);
    installPeriod(element, { search: "", now: () => clock, doc: document });
    expect(periodOf(element)).toBe("sunset");

    /* Same hour, so the dispatch must change nothing — otherwise "it re-applied"
     * would be indistinguishable from "it wrote the same value twice". */
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("sunset");

    clock = new Date(2026, 0, 1, 20, 0);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("evening");
  });

  it("does not re-apply while the tab is hidden", () => {
    const element = root();
    let clock = new Date(2026, 0, 1, 19, 59);
    installPeriod(element, { search: "", now: () => clock, doc: document });

    clock = new Date(2026, 0, 1, 20, 0);
    setVisibility(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("sunset");
  });

  it("never re-applies once the period was overridden", () => {
    const element = root();
    let clock = new Date(2026, 0, 1, 19, 59);
    installPeriod(element, {
      search: "?period=night",
      now: () => clock,
      doc: document,
    });

    clock = new Date(2026, 0, 1, 20, 0);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("night");
  });

  it("stops listening once its uninstaller has run", () => {
    const element = root();
    let clock = new Date(2026, 0, 1, 19, 59);
    const uninstall = installPeriod(element, {
      search: "",
      now: () => clock,
      doc: document,
    });

    uninstall();
    clock = new Date(2026, 0, 1, 20, 0);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("sunset");
  });

  it("uninstalling an overridden install is harmless", () => {
    const element = root();
    const uninstall = installPeriod(element, {
      search: "?period=dawn",
      now: () => new Date(2026, 0, 1, 20),
      doc: document,
    });

    uninstall();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("dawn");
  });

  /* `doc` defaults to the element's own document, which is how `main.ts` calls
   * it: one argument fewer, and the listener still lands on the document the
   * root belongs to. */
  it("defaults its document to the root's owner", () => {
    const element = root();
    let clock = new Date(2026, 0, 1, 19, 59);
    installPeriod(element, { search: "", now: () => clock });

    clock = new Date(2026, 0, 1, 20, 0);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(periodOf(element)).toBe("evening");
  });
});
