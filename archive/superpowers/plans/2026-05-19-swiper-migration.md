# Swiper.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the buggy custom slideshow with Swiper.js v11 via CDN across all 10 HTML files.

**Architecture:** Create `swiper-init.js` with two init modes (project detail: full nav; index cards: autoplay-only inside `<a>` links). Strip old slideshow CSS and replace with Swiper theme overrides. Migrate all HTML markup from custom `.slideshow` structure to `.swiper` structure.

**Tech Stack:** Swiper.js v11 (CDN via jsDelivr), vanilla JS (IIFE), static HTML

---

## File Map

| File | Action |
|---|---|
| `assets/js/swiper-init.js` | **Create** — Swiper initialization for both modes |
| `assets/js/slideshow.js` | **Delete** |
| `assets/css/styles.css` | **Modify** lines 1052–1160: remove `.slideshow*` block, add Swiper overrides |
| `index.html` | **Modify** — CDN includes, remove old script tag, migrate 9 card slideshows |
| `projects/budget-app.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/nom-noms.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/leons-mems.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/el-blackjack.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/classic-golf.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/spead-read.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/showrunner-digest.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/media-cloud-web-tools.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |
| `projects/media-cloud-vitals.html` | **Modify** — CDN includes, remove old script tag, migrate slideshow |

---

## Task 1: Create `assets/js/swiper-init.js`

**Files:**
- Create: `assets/js/swiper-init.js`

- [ ] **Step 1: Create the file with the following content**

```js
(function () {
  'use strict';

  // Remove swiper-slides whose images 404, then run callback with remaining count.
  // Note: relies on HTTP — does not work on file:// origins.
  function pruneMissingSlides(el, callback) {
    const slides = Array.from(el.querySelectorAll('.swiper-slide'));
    let pending = slides.length;
    if (!pending) { callback(0); return; }

    slides.forEach(function (slide) {
      const img = slide.querySelector('img');
      if (!img) {
        if (--pending === 0) callback(el.querySelectorAll('.swiper-slide').length);
        return;
      }
      const test = new Image();
      test.onload = function () {
        if (--pending === 0) callback(el.querySelectorAll('.swiper-slide').length);
      };
      test.onerror = function () {
        slide.remove();
        if (--pending === 0) callback(el.querySelectorAll('.swiper-slide').length);
      };
      test.src = img.src;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {

    // Project detail pages — full nav with arrows, dots, and keyboard.
    // Prunes missing placeholder slides before init so no blank slides appear.
    document.querySelectorAll('.project-swiper').forEach(function (el) {
      pruneMissingSlides(el, function (count) {
        if (count === 0) return;
        new Swiper(el, {
          loop: false,
          navigation: {
            nextEl: el.querySelector('.swiper-button-next'),
            prevEl: el.querySelector('.swiper-button-prev'),
          },
          pagination: {
            el: el.querySelector('.swiper-pagination'),
            clickable: true,
          },
          keyboard: { enabled: true },
        });
      });
    });

    // Index page project cards — autoplay only, no nav buttons.
    // Nested inside <a> links: preventClicks/preventClicksPropagation: false
    // ensures card link clicks work normally.
    // Cards with 1 image skip init entirely (avoids loop artifacts).
    document.querySelectorAll('.card-swiper').forEach(function (el) {
      const slides = el.querySelectorAll('.swiper-slide');
      if (slides.length <= 1) return;
      new Swiper(el, {
        loop: true,
        autoplay: { delay: 2500, disableOnInteraction: false },
        allowTouchMove: true,
        preventClicks: false,
        preventClicksPropagation: false,
      });
    });

  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/swiper-init.js
git commit -m "feat: add swiper-init.js for project and card slideshows"
```

---

## Task 2: Update CSS — remove old slideshow block, add Swiper overrides

**Files:**
- Modify: `assets/css/styles.css:1052-1160`

- [ ] **Step 1: Remove the entire `/* === SLIDESHOW === */` block**

In `assets/css/styles.css`, find and remove lines 1052–1160 (the entire slideshow block from `/* === SLIDESHOW === */` through the closing `}`of `.slideshow--single`). This is everything from the `/* === SLIDESHOW === */` comment through the end of the file.

- [ ] **Step 2: Add Swiper theme overrides in place of the deleted block**

At the end of `assets/css/styles.css`, append:

```css
/* === SWIPER === */

/* Theme — match site purple accent */
.swiper-button-next,
.swiper-button-prev {
  color: var(--purple-accent, #7c3aed);
}

.swiper-pagination-bullet-active {
  background: var(--purple-accent, #7c3aed);
}

/* Project detail slideshow sizing */
.project-detail__demo .swiper {
  width: 100%;
}

.project-detail__demo .swiper-slide img {
  width: 100%;
  height: auto;
  display: block;
}

/* Card slideshow — fill fixed-height container (.project-card__image has fixed height) */
.project-card__image .swiper,
.project-card__image .swiper-slide {
  height: 100%;
}

.project-card__image .swiper-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/css/styles.css
git commit -m "feat: replace custom slideshow CSS with Swiper theme overrides"
```

---

## Task 3: Update `index.html`

**Files:**
- Modify: `index.html`

The index page has 9 project cards, each with a `.slideshow` inside an `<a class="project-card">` link. Migrate all to `.card-swiper`. Each card's image count varies (most have 1 image, `budget-app` has 4, `nom-noms` has 5).

- [ ] **Step 1: Add Swiper CDN CSS in `<head>`**

Find the existing stylesheet link in `<head>` and add above it:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags before `</body>`**

Find:
```html
<script src="assets/js/slideshow.js"></script>
```
Replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Migrate all 9 card slideshows**

For each `.slideshow` block inside a `.project-card`, replace the old structure with the Swiper card structure. The pattern is identical for every card — only the image paths and alt text differ.

**Before pattern (every card):**
```html
<div class="slideshow">
  <div class="slideshow__track">
    <img class="slideshow__slide" src="images/{slug}/01.png" alt="{Name} — screenshot 1" loading="eager">
    <!-- any additional img tags -->
  </div>
  <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
  <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
  <div class="slideshow__dots">
    <!-- dot buttons -->
  </div>
</div>
```

**After pattern (every card):**
```html
<div class="swiper card-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="images/{slug}/01.png" alt="{Name} — screenshot 1" loading="eager"></div>
    <!-- one .swiper-slide per existing image only — do NOT add placeholder slides for cards -->
  </div>
</div>
```

Apply this to all 9 cards:
- `budget-app` → 4 slides (01–04)
- `nom-noms` → 5 slides (01–05)
- `leons-mems` → 1 slide (01) — Swiper will skip init (1 slide guard)
- `el-blackjack` → 1 slide (01)
- `classic-golf` → 1 slide (01)
- `spead-read` → 1 slide (01)
- `media-cloud-web-tools` → 1 slide (01)
- `media-cloud-vitals` → 1 slide (01)
- `showrunner-digest` → 1 slide (01)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: migrate index.html card slideshows to Swiper"
```

---

## Task 4: Migrate `projects/budget-app.html`

**Files:**
- Modify: `projects/budget-app.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

Add above the existing stylesheet `<link>`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find:
```html
<script src="../assets/js/slideshow.js"></script>
```
Replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the `.project-detail__demo` slideshow block**

Find the entire `<div class="slideshow">...</div>` inside `.project-detail__demo` and replace with:

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/budget-app/01.png" alt="Leon's Budget — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/budget-app/02.png" alt="Leon's Budget — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/budget-app/03.png" alt="Leon's Budget — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/budget-app/04.png" alt="Leon's Budget — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/budget-app/05.png" alt="Leon's Budget — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

Note: `05.png` does not exist yet — it will be silently pruned by `pruneMissingSlides` at runtime.

- [ ] **Step 4: Commit**

```bash
git add projects/budget-app.html
git commit -m "feat: migrate budget-app to Swiper slideshow"
```

---

## Task 5: Migrate `projects/nom-noms.html`

**Files:**
- Modify: `projects/nom-noms.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/nom-noms/01.png" alt="Nom Nom's — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/nom-noms/02.png" alt="Nom Nom's — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/nom-noms/03.png" alt="Nom Nom's — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/nom-noms/04.png" alt="Nom Nom's — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/nom-noms/05.png" alt="Nom Nom's — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/nom-noms.html
git commit -m "feat: migrate nom-noms to Swiper slideshow"
```

---

## Task 6: Migrate `projects/leons-mems.html`

**Files:**
- Modify: `projects/leons-mems.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/leons-mems/01.png" alt="Leon's Mems — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/leons-mems/02.png" alt="Leon's Mems — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/leons-mems/03.png" alt="Leon's Mems — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/leons-mems/04.png" alt="Leon's Mems — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/leons-mems/05.png" alt="Leon's Mems — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/leons-mems.html
git commit -m "feat: migrate leons-mems to Swiper slideshow"
```

---

## Task 7: Migrate `projects/el-blackjack.html`

**Files:**
- Modify: `projects/el-blackjack.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/el-blackjack/01.png" alt="El Blackjack — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/el-blackjack/02.png" alt="El Blackjack — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/el-blackjack/03.png" alt="El Blackjack — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/el-blackjack/04.png" alt="El Blackjack — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/el-blackjack/05.png" alt="El Blackjack — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/el-blackjack.html
git commit -m "feat: migrate el-blackjack to Swiper slideshow"
```

---

## Task 8: Migrate `projects/classic-golf.html`

**Files:**
- Modify: `projects/classic-golf.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/classic-golf/01.png" alt="The Classic — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/classic-golf/02.png" alt="The Classic — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/classic-golf/03.png" alt="The Classic — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/classic-golf/04.png" alt="The Classic — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/classic-golf/05.png" alt="The Classic — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/classic-golf.html
git commit -m "feat: migrate classic-golf to Swiper slideshow"
```

---

## Task 9: Migrate `projects/spead-read.html`

**Files:**
- Modify: `projects/spead-read.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/spead-read/01.png" alt="Spead Read — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/spead-read/02.png" alt="Spead Read — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/spead-read/03.png" alt="Spead Read — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/spead-read/04.png" alt="Spead Read — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/spead-read/05.png" alt="Spead Read — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/spead-read.html
git commit -m "feat: migrate spead-read to Swiper slideshow"
```

---

## Task 10: Migrate `projects/showrunner-digest.html`

**Files:**
- Modify: `projects/showrunner-digest.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/showrunner-digest/01.png" alt="ShowRunner Digest — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/showrunner-digest/02.png" alt="ShowRunner Digest — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/showrunner-digest/03.png" alt="ShowRunner Digest — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/showrunner-digest/04.png" alt="ShowRunner Digest — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/showrunner-digest/05.png" alt="ShowRunner Digest — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/showrunner-digest.html
git commit -m "feat: migrate showrunner-digest to Swiper slideshow"
```

---

## Task 11: Migrate `projects/media-cloud-web-tools.html`

**Files:**
- Modify: `projects/media-cloud-web-tools.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/media-cloud-web-tools/01.png" alt="Media Cloud Web Tools — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-web-tools/02.png" alt="Media Cloud Web Tools — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-web-tools/03.png" alt="Media Cloud Web Tools — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-web-tools/04.png" alt="Media Cloud Web Tools — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-web-tools/05.png" alt="Media Cloud Web Tools — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/media-cloud-web-tools.html
git commit -m "feat: migrate media-cloud-web-tools to Swiper slideshow"
```

---

## Task 12: Migrate `projects/media-cloud-vitals.html`

**Files:**
- Modify: `projects/media-cloud-vitals.html`

- [ ] **Step 1: Add CDN CSS to `<head>`**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

- [ ] **Step 2: Replace old script tags**

Find `<script src="../assets/js/slideshow.js"></script>`, replace with:
```html
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="../assets/js/swiper-init.js"></script>
```

- [ ] **Step 3: Replace the slideshow block**

```html
<div class="swiper project-swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide"><img src="../images/media-cloud-vitals/01.png" alt="Media Cloud Vitals — screenshot 1" loading="eager"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-vitals/02.png" alt="Media Cloud Vitals — screenshot 2" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-vitals/03.png" alt="Media Cloud Vitals — screenshot 3" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-vitals/04.png" alt="Media Cloud Vitals — screenshot 4" loading="lazy"></div>
    <div class="swiper-slide"><img src="../images/media-cloud-vitals/05.png" alt="Media Cloud Vitals — screenshot 5" loading="lazy"></div>
  </div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
  <div class="swiper-pagination"></div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add projects/media-cloud-vitals.html
git commit -m "feat: migrate media-cloud-vitals to Swiper slideshow"
```

---

## Task 13: Delete `slideshow.js` and final cleanup commit

**Files:**
- Delete: `assets/js/slideshow.js`

- [ ] **Step 1: Delete the old file**

```bash
git rm assets/js/slideshow.js
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "slideshow\.js" .
```

Expected output: no results (or only results inside `.git/`).

- [ ] **Step 3: Verify no remaining old slideshow markup**

```bash
grep -r "slideshow__track\|slideshow__arrow\|slideshow__dots" . --include="*.html"
```

Expected output: no results.

- [ ] **Step 4: Final commit**

```bash
git commit -m "chore: remove legacy slideshow.js"
```
