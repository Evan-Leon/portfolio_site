---
name: theater-rules-index
description: "Load first at every session start. This project's law — the SDS-* invariants every phase is held to, plus the deliberate departures from the conventions this repo was built under. Cite by ID when a rule is load-bearing."
---

# Portfolio Theater — Vendored Engine Rules Index

> This file is the vendored engine's law in portfolio_site. It is short on purpose: ten invariants and a
> handful of recorded departures. Everything here exists because breaking it
> produces a failure that is silent, or that surfaces somewhere far from its
> cause.
>
> **Cite by ID** (`SDS-004`) in commit messages, comments, and review notes when
> a rule is load-bearing. Never restate rule text — the ID is the link.
>
> **IDs are never reused.** A retired rule keeps its ID and gains a tombstone
> note in place, so a citation from an old commit still resolves.

## How to read this file

The index table is the whole list. Definitions below it exist only for the rules
that need more than one line — a rule with no definition entry is fully stated
in the table.

Add a rule when a mistake is made that the existing rules would not have
prevented, and record what the failure looked like. A rule with no failure story
behind it is a preference, and preferences do not belong here.

## Project law

| ID        | Rule                                                                                                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SDS-001` | `seek(progress)` is idempotent and stateless — same input, same visual output, no accumulation. Backwards scrubbing depends on it                                                                                                                                     |
| `SDS-002` | An adapter never touches the DOM outside the container it was handed                                                                                                                                                                                                  |
| `SDS-003` | Every adapter passes `adapterContract()` before it ships                                                                                                                                                                                                              |
| `SDS-004` | Never read layout (`getBoundingClientRect`, `offsetHeight`) inside `seek()` — cache it in `resize()`; layout reads in the rAF loop force reflow                                                                                                                       |
| `SDS-005` | Scroll position is read once per frame through `ScrollSource`; no other module calls `window.scrollY`                                                                                                                                                                 |
| `SDS-006` | Assets are declared, never fetched ad hoc — everything goes through the asset loader so the ring's progress stays honest                                                                                                                                              |
| `SDS-007` | Retired on vendoring 2026-08-25 — subject not vendored; ID never reused |
| `SDS-008` | Retired on vendoring 2026-08-25 — subject not vendored; ID never reused |
| `SDS-009` | Token and global CSS blocks are scoped `:host, :root` — never `:root` alone. `:root` does not match a ShadowRoot, so a `:root`-only rule silently matches nothing in the Wix build and every `var(--sds-*)` resolves to invalid, with no error and no failing test    |
| `SDS-010` | A scene is mounted for as long as any part of its pinned container is visible. Lifecycle margins are fractions of **scrub length** and say nothing about the **viewport height** that decides when a pin can be seen — always reconcile the two (`withPinVisibility`) |

## Deliberate departures

The vendored engine was built inside a system with its own shared conventions
(prefix `EVO-`). Where this project breaks one, it is recorded here so a future
reader sees a decision rather than a mistake and does not "fix" it.

| Departs from   | Convention                                                                             | This project does                                    | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EVO-TOOL-047` | A Vitest `include` glob must cover both `.test.ts` and `.test.tsx`                     | Matches `src/**/*.test.ts` only                      | The project is framework-free vanilla TypeScript with no JSX anywhere, so a `.tsx` file cannot exist to be missed. The day one does, widen the glob to `src/**/*.test.{ts,tsx}` — the rule's failure mode (silently collecting zero component tests) becomes live at that moment.                                                                                                                                                                                                                                          |
| `EVO-TOOL-057` | Set Vitest's `passWithNoTests: true`, since Vitest exits 1 when it finds no test files | Leaves it unset, so an empty collection is a failure | The rule protects a fresh scaffold that has no tests yet. This repo has had tests since SD2 and every phase adds more, so the flag can never fire for its intended reason — Vitest fails only on **zero** test files overall, not on a phase that adds none. What it would still do is silence a broken `include` glob, which is the precise trap `EVO-TOOL-005` warns about: the glob stops matching, nothing is collected, and CI reports green. Verified in SD2 by typo'ing the glob and confirming `npm test` exits 1. |

## About the `EVO-*` citations in this codebase

Comments and configuration in this repo cite rule IDs like `EVO-TOOL-005` and
`EVO-UNI-061`. Those belong to the shared rule set of the system this project was
built in, not to this repo, and they do not resolve here.

They are kept because each one marks a place where a specific, non-obvious
mistake was avoided, and the comment next to the citation always states the
mistake in full. **Read the comment, not the ID** — the ID is provenance. Nothing
in this repository depends on being able to look one up.

## Definitions

### `SDS-001` — `seek(progress)` is idempotent and stateless

The engine calls `seek` from a rAF loop with whatever progress the scroll
position produces — which is not a monotonic sequence. A user scrolling up
produces a decreasing series; a user flicking a trackpad produces the same value
twice in a row; a scene re-entering the viewport produces a jump.

An adapter that advances state by a delta ("step the timeline forward") looks
correct while scrolling down and drifts irreversibly the first time someone
scrolls up. The failure is not a crash — the animation just stops matching the
scroll position, gradually, with no error anywhere.

```ts
// ✅ absolute — the same progress always produces the same frame
seek(progress: number): void {
  const index = Math.min(this.frames.length - 1, Math.round(progress * (this.frames.length - 1)))
  this.draw(index)
}

// ❌ relative — accumulates, and cannot be scrubbed backwards
seek(progress: number): void {
  this.current += (progress - this.previous) * this.frames.length
  this.draw(Math.round(this.current))
}
```

Every library this project wraps already offers the absolute form —
`lottie-web`'s `goToAndStop`, GSAP's `timeline.progress()`, an array index for a
frame sequence. Reaching for anything else is the mistake.

### `SDS-004` — Never read layout inside `seek()`

`seek()` runs inside the rAF loop, once per frame per active scene. A
`getBoundingClientRect()` or `offsetHeight` read there forces the browser to
flush pending style and layout work before it can answer — a synchronous
reflow, in the exact place where the frame budget is smallest.

It is invisible in development. One scene on a fast machine has enough headroom
to absorb it; the symptom appears later as janky scrubbing on a mid-range phone
with three scenes mounted, and by then the cause is several phases behind.

Measure in `resize()`, which fires on real size changes, and cache the numbers
on the adapter. `seek()` may only read cached values and do arithmetic.

### `SDS-006` — Assets are declared, never fetched ad hoc

The loading ring reports aggregate progress across everything the page is
waiting for. That number is only true if the loader knows about every asset. A
bare `fetch()` or `new Image()` somewhere in an adapter is invisible to it, so
the ring reaches 100% and dismisses while bytes are still arriving — the exact
failure the ring exists to prevent, and one that only reproduces on a slow
connection.

Declaring an asset also buys the failure policy for free: a failed asset settles
as unsuccessful and still counts toward completion, so the page always reveals
rather than spinning forever.

### `SDS-010` — A scene stays mounted while its pin is visible

Two different quantities decide when a scene matters, and it is easy to use only
the first:

- `SceneMargins` is a fraction of the scene's **own scrub length** — how much
  asset runway it gets.
- Whether its pinned container is on screen is a function of the **viewport
  height** — the spacer's top reaches the bottom of the viewport one viewport
  before the scene begins.

They are unrelated numbers, and for any scene shorter than 500vh the second is
larger. Using only the margin therefore leaves the pin on screen with no adapter
in it.

Measured on this page at a 720px viewport, before the fix: `intro`'s pin entered
the viewport at scrollY 71 and its adapter was built at scrollY 431 — **360px of
scrolling with an empty panel on screen**, which then popped into frame 0.
`mark` did it for 180px and `reveal` for 360px. Parked at scrollY 300, the pin
occupied 229px of the viewport and contained zero children.

Nothing errors. The progress arithmetic is never wrong, so every unit test
passes; and no screenshot taken while a scene is scrubbing can show it, because
by then the adapter exists.

```ts
// ✅ visibility is a floor under both margins
sceneLifecycle(raw, withPinVisibility(DEFAULT_MARGINS, viewportHeight, length))

// ❌ mounts late and unmounts early, by an amount that depends on the viewport
sceneLifecycle(raw, DEFAULT_MARGINS)
```

The unload side is the half that gets missed: it happens to be harmless at
`DEFAULT_MARGINS` for any scene at least three viewports tall, so a 200vh scene
is the first one that unmounts while still on screen.

Raising `DEFAULT_MARGINS` is not the fix. The margins are a fraction of length,
so a fixed fraction still buys a different pixel runway per scene and a short
scene breaks again. Take the larger of the two constraints.

### `SDS-009` — Token and global CSS blocks are scoped `:host, :root`

This is the most expensive silent failure available in this codebase, so it is
worth stating the mechanism exactly.

`:root` matches the document's root element, `<html>`. A ShadowRoot is not an
element and `:root` does not match it. The Wix target mounts the whole
experience inside a shadow root and injects the stylesheet into it — where a
`:root`-only rule matches nothing at all.

Nothing errors. `var(--sds-bg)` resolves to the guaranteed-invalid value, every
property using it falls back to its initial value, and the page renders
completely unstyled. The standalone build is unaffected, so the unit tests pass,
the standalone e2e suite passes, and the break appears only in the one target
that has no test coverage of its own.

```css
/* ✅ correct in both targets */
:host,
:root {
  --sds-bg: #08090b;
}

/* ❌ silently matches nothing in the Wix build */
:root {
  --sds-bg: #08090b;
}
```

See the header comment in `src/styles/tokens.css`, which states the same thing
at the point of use.
