# Portrait/Tablet Screenshot Support in Project Swipers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing card-thumbnail and detail-page swipers display portrait/tablet screenshots correctly (no stretching, sensible cropping) without breaking the current landscape screenshots, and without any per-project configuration.

**Architecture:** CSS-only change to `assets/css/styles.css`, in the existing `=== SWIPER ===` block. No JS or HTML changes. Behavior is driven by each image's intrinsic aspect ratio via the standard CSS replaced-element sizing algorithm (`width/height: auto` + `max-width`/`max-height`), not by a hardcoded portrait/landscape flag.

**Tech Stack:** Plain CSS. No build step, no test runner — this site has no automated test suite (confirmed in `docs/superpowers/specs/2026-06-17-portrait-screenshot-support-design.md`), so verification is manual, in-browser, using `python3 -m http.server` against `index.html` and one project detail page.

## Global Constraints

- CSS-only — do not modify `assets/js/swiper-init.js` or any HTML markup (per spec's "Out of Scope").
- No per-project classes or JS-based orientation detection (per spec).
- Landscape screenshots (budget-app, nom-noms) must look visually unchanged after this change.
- Affected (currently placeholder) projects: El Blackjack, Classic Golf, Leon's Mems, Spead Read — but the fix must be general-purpose, not scoped to these by selector.

---

### Task 1: Update card-thumbnail crop position

**Files:**
- Modify: `assets/css/styles.css:1081-1085`

**Interfaces:**
- N/A (pure CSS, no consumers/producers across tasks other than the shared stylesheet).

- [ ] **Step 1: Make the change**

In `assets/css/styles.css`, update the `.project-card__image .swiper-slide img` rule (currently lines 1081-1085):

```css
.project-card__image .swiper-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
```

(Only the added `object-position: top;` line is new — `width`, `height`, and `object-fit` stay as they are.)

- [ ] **Step 2: Visually verify on the index page**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html` in a browser. Check the project cards for budget-app and nom-noms (which have real 1280×800 screenshots) — the thumbnail crop should look essentially the same as before (top vs. center crop of a short 160px strip from a 16:10 image is a subtle difference, not a regression). Stop the server (Ctrl+C) when done.

- [ ] **Step 3: Commit**

```bash
git add assets/css/styles.css
git commit -m "$(cat <<'EOF'
style: crop card thumbnails from the top to suit portrait screenshots

Object-position: top keeps the most identifiable part of a screenshot
(status bar/header) visible when a portrait image is cropped into the
card's short, wide thumbnail strip.
EOF
)"
```

---

### Task 2: Cap and center detail-page swiper images

**Files:**
- Modify: `assets/css/styles.css:1064-1073`

**Interfaces:**
- N/A (pure CSS).

- [ ] **Step 1: Make the change**

In `assets/css/styles.css`, replace the existing `.project-detail__demo .swiper-slide img` rule (currently lines 1069-1073) and add a new rule for the parent slide. The full updated block (lines 1064-1073 region) should read:

```css
/* Project detail swiper sizing */
.project-detail__demo .swiper {
  width: 100%;
}

.project-detail__demo .swiper-slide {
  display: flex;
  justify-content: center;
}

.project-detail__demo .swiper-slide img {
  display: block;
  margin: 0 auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 70vh;
}
```

- [ ] **Step 2: Visually verify on a project detail page with landscape screenshots**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/projects/budget-app.html`. The screenshot should still fill the full content width, same as before this change (it's well under 70vh tall, so `max-height` doesn't engage). Confirm there's no visible regression (no extra whitespace, no shrinking).

- [ ] **Step 3: Verify portrait behavior with a temporary test image**

Synthesize a solid-color portrait PNG using ImageMagick, if available:

```bash
which convert && convert -size 1080x2340 xc:'#4b2ea8' /tmp/portrait-test.png && echo OK
```

If `convert` is not available, skip Steps 3 and proceed straight to Step 4 — note in the Task 2 commit message that portrait behavior was verified by CSS reasoning only (the replaced-element sizing algorithm description in the design spec), not visually.

If `/tmp/portrait-test.png` was created:

```bash
cp /tmp/portrait-test.png images/el-blackjack/01.png
```

Reload `http://localhost:8000/projects/el-blackjack.html`. The image should appear centered, scaled down to fit within roughly 70% of the viewport height, not stretched edge-to-edge. Then restore the placeholder:

```bash
git checkout -- images/el-blackjack/01.png
rm -f /tmp/portrait-test.png
```

- [ ] **Step 4: Stop the dev server**

Ctrl+C the `python3 -m http.server` process.

- [ ] **Step 5: Commit**

```bash
git add assets/css/styles.css
git commit -m "$(cat <<'EOF'
style: cap and center detail-page swiper images for portrait screenshots

width/height:auto plus max-width/max-height lets the browser fit each
image within both constraints while preserving aspect ratio, so
portrait screenshots no longer stretch to the full content width.
Landscape screenshots are unaffected since they're already under the
70vh cap.
EOF
)"
```

---

### Task 3: Final review pass

**Files:** None (read-only verification).

**Interfaces:** N/A.

- [ ] **Step 1: Re-check both landscape projects end-to-end**

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000/index.html` and click into both `budget-app.html` and `nom-noms.html`. Confirm card thumbnails and detail-page slideshows look correct, arrows/dots/autoplay still work as before.

- [ ] **Step 2: Confirm git status is clean**

```bash
git status
```

Expected: no uncommitted changes related to this work (the `images/el-blackjack/01.png` temp edit from Task 2 should already be reverted).

- [ ] **Step 3: Stop the dev server**

Ctrl+C the `python3 -m http.server` process.
