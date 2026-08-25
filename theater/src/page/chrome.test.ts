/*
 * The chrome is a pure function of the number it is handed, so these tests hand
 * it numbers and read the DOM back.
 *
 * That the number is *global page progress* rather than scene progress is the
 * engine's promise, not this module's, and it is asserted where it is made:
 * "createEngine — the persistent layer" in `src/engine/engine.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createPageChrome,
  PERSISTENT_ATTRIBUTE,
  PROGRESS_BAR_ATTRIBUTE,
  PROGRESS_PERCENT_ATTRIBUTE,
} from "./chrome";

let shell: HTMLElement;

/** The markup `index.html` provides, reduced to the parts the chrome drives. */
function pageShell(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `
    <div ${PROGRESS_BAR_ATTRIBUTE}></div>
    <span ${PROGRESS_PERCENT_ATTRIBUTE}>0%</span>
    <div ${PERSISTENT_ATTRIBUTE}>0%</div>
  `;
  document.body.append(root);
  return root;
}

function bar(): HTMLElement {
  return element(PROGRESS_BAR_ATTRIBUTE);
}

function readout(): HTMLElement {
  return element(PROGRESS_PERCENT_ATTRIBUTE);
}

function persistent(): HTMLElement {
  return element(PERSISTENT_ATTRIBUTE);
}

function element(attribute: string): HTMLElement {
  const found = shell.querySelector<HTMLElement>(`[${attribute}]`);
  if (!found) throw new Error(`No [${attribute}] in the test shell`);
  return found;
}

beforeEach(() => {
  shell = pageShell();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("createPageChrome", () => {
  it("scales the bar to the progress it is handed", () => {
    const render = createPageChrome(shell);

    render(0.4);

    expect(bar().style.transform).toBe("scaleX(0.4)");
  });

  it("shows the same whole percent in the chrome and in the persistent indicator", () => {
    const render = createPageChrome(shell);

    render(0.375);

    // The two elements are the same reading in two places — a bar the visitor
    // tracks and the indicator that spans scene boundaries.
    expect(readout().textContent).toBe("38%");
    expect(persistent().textContent).toBe("38%");
  });

  it("renders 0% and 100% at the ends of the document", () => {
    const render = createPageChrome(shell);

    render(0);
    expect(readout().textContent).toBe("0%");
    expect(bar().style.transform).toBe("scaleX(0)");

    render(1);
    expect(readout().textContent).toBe("100%");
    expect(bar().style.transform).toBe("scaleX(1)");
  });

  it("clamps a value from outside 0..1 rather than overrunning the bar", () => {
    const render = createPageChrome(shell);

    render(1.4);
    expect(bar().style.transform).toBe("scaleX(1)");

    render(-0.2);
    expect(bar().style.transform).toBe("scaleX(0)");
  });

  it("leaves the text alone while the whole percent is unchanged", () => {
    const render = createPageChrome(shell);
    render(0.501);
    expect(readout().textContent).toBe("50%");

    // A sentinel the chrome has no reason to overwrite — unless it writes text
    // on every frame, which over a long page is a hundred needless DOM writes a
    // second.
    readout().textContent = "untouched";
    render(0.5015);

    expect(readout().textContent).toBe("untouched");
    // The bar still tracks it: the guard is on the text, not on the movement.
    expect(bar().style.transform).toBe("scaleX(0.5015)");
  });

  it("throws naming the element a page shell is missing", () => {
    element(PERSISTENT_ATTRIBUTE).remove();

    expect(() => createPageChrome(shell)).toThrow(PERSISTENT_ATTRIBUTE);
  });
});
