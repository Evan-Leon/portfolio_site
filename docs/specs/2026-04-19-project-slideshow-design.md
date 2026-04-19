# Project Image Slideshow — Design Spec

**Date:** 2026-04-19
**Status:** Approved

---

## Overview

Replace the current single GIF / placeholder in each project's image area with a 1–5 photo slideshow. The same set of images is used on both the main page project card and the project's detail page (scaled down via CSS on the card). Navigation is manual: left/right arrows overlaid on the image, dot indicators below.

This applies to **all 9 projects** — including the three "traditional" projects (Media Cloud Web Tools, Media Cloud Vitals, ShowRunner Digest) that currently display GIFs. Their GIFs are replaced by static screenshots in the slideshow; the GIF files can be removed after migration.

---

## Screenshot Size

**Recommended capture size: 1280×800 (16:10 landscape)**

- Displays full-width at natural height on the project detail page
- Crops center to 160px height on the main page card via `object-fit: cover`
- One batch of images serves both contexts — no separate thumbnails needed

---

## Image Storage Convention

```
images/
  budget-app/
    01.png
    02.png
    03.png
  leons-mems/
    01.png
  nom-noms/
    01.png
    02.png
  classic-golf/
    01.png
    02.png
  el-blackjack/
    01.png
  spead-read/        ← folder name matches the URL slug exactly, including the typo
    01.png
    02.png
  showrunner-digest/
    01.png
    02.png
  media-cloud-web-tools/
    01.png
  media-cloud-vitals/
    01.png
```

- One subfolder per project, named to match the project page slug (e.g. `spead-read/` matches `spead-read.html` — the typo is intentional)
- 1–5 images per project, zero-padded sequential filenames (`01.png`, `02.png`, …)
- PNG preferred for UI screenshots; JPEG acceptable for photo-heavy shots
- Main page references: `images/[project-name]/01.png`
- Project detail page references: `../images/[project-name]/01.png`

---

## Files Changed

| File | Change |
|------|--------|
| `assets/js/slideshow.js` | New shared module — initializes all slideshows on page load |
| `assets/css/styles.css` | Append slideshow CSS block; remove the now-dead `.project-card__image img, .project-card__image video` rule (cards no longer contain bare `<img>` elements after migration) |
| `index.html` | Replace each `project-card__image` inner content with slideshow markup |
| `projects/*.html` (9 files) | Replace `project-detail__demo` inner content with slideshow markup |

---

## HTML Markup

The same markup structure is used in both contexts (card and detail page).

**Multi-image example (3 photos):**

```html
<div class="slideshow">
  <div class="slideshow__track">
    <img class="slideshow__slide" src="images/budget-app/01.png" alt="Leon's Budget — screenshot 1" loading="eager">
    <img class="slideshow__slide" src="images/budget-app/02.png" alt="Leon's Budget — screenshot 2" loading="lazy">
    <img class="slideshow__slide" src="images/budget-app/03.png" alt="Leon's Budget — screenshot 3" loading="lazy">
  </div>
  <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
  <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
  <div class="slideshow__dots">
    <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
    <button class="slideshow__dot" aria-label="Photo 2"></button>
    <button class="slideshow__dot" aria-label="Photo 3"></button>
  </div>
</div>
```

**Single-image example (1 photo):**

```html
<div class="slideshow">
  <div class="slideshow__track">
    <img class="slideshow__slide" src="images/leons-mems/01.png" alt="Leon's Mems — screenshot 1" loading="eager">
  </div>
  <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
  <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
  <div class="slideshow__dots">
    <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
  </div>
</div>
```

The single-image markup is identical to multi-image — arrows and the one dot are always in the HTML. JS adds `.slideshow--single` at runtime to hide them via CSS. The `slideshow__dot--active` class on the first dot in static HTML is intentional — JS confirms it via `goTo(0)` on init (idempotent).

**`loading` attribute:** The first slide always uses `loading="eager"` so it appears immediately. Slides 2–5 use `loading="lazy"`.

**On main page cards:** the `.slideshow` div replaces the inner content of `.project-card__image` (previously the placeholder SVG or single `<img>`).

**On project detail pages:** the `.slideshow` div replaces the inner content of `.project-detail__demo` (previously a single `<img>` or `.project-detail__demo-placeholder`). The `.project-detail__demo` wrapper is kept as-is; the slideshow sits inside it.

---

## CSS

Appended to `assets/css/styles.css`:

```css
/* === SLIDESHOW === */

/* Base: fills a fixed-height parent (used by .project-card__image on main page) */
.slideshow {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.slideshow__track {
  display: flex;
  height: 100%;
  transition: transform 0.35s ease;
  will-change: transform;
}

.slideshow__slide {
  min-width: 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/*
 * Detail-page override: the demo section has no fixed height, so we let the
 * image size the container naturally. Override height/object-fit so images
 * display at their intrinsic aspect ratio instead of collapsing to zero.
 */
.project-detail__demo .slideshow {
  height: auto;
}

.project-detail__demo .slideshow__track {
  height: auto;
  align-items: flex-start;
}

.project-detail__demo .slideshow__slide {
  height: auto;
  object-fit: unset;
}

/* Arrows */
.slideshow__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease, background 0.2s ease;
  z-index: 2;
}

.slideshow__arrow:hover {
  background: rgba(124, 58, 237, 0.7);
}

.slideshow__arrow--disabled {
  opacity: 0.25;
  pointer-events: none;
}

.slideshow__arrow--prev { left: 8px; }
.slideshow__arrow--next { right: 8px; }

/* Dots */
.slideshow__dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  z-index: 2;
}

.slideshow__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s ease, transform 0.2s ease;
}

.slideshow__dot--active {
  background: var(--purple-primary, #7c3aed);
  transform: scale(1.25);
}

/* Hide controls when only 1 slide */
.slideshow--single .slideshow__arrow,
.slideshow--single .slideshow__dots {
  display: none;
}
```

---

## JavaScript (`assets/js/slideshow.js`)

```js
(function () {
  'use strict';

  function initSlideshow(el) {
    const track = el.querySelector('.slideshow__track');
    const slides = el.querySelectorAll('.slideshow__slide');
    const dots = el.querySelectorAll('.slideshow__dot');
    const prevBtn = el.querySelector('.slideshow__arrow--prev');
    const nextBtn = el.querySelector('.slideshow__arrow--next');
    const total = slides.length;

    if (total <= 1) {
      el.classList.add('slideshow--single');
      return;
    }

    let current = 0;

    function goTo(index) {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((dot, i) =>
        dot.classList.toggle('slideshow__dot--active', i === current)
      );
      prevBtn.classList.toggle('slideshow__arrow--disabled', current === 0);
      nextBtn.classList.toggle('slideshow__arrow--disabled', current === total - 1);
    }

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (current > 0) goTo(current - 1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (current < total - 1) goTo(current + 1);
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(i);
      });
    });

    goTo(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.slideshow').forEach(initSlideshow);
  });
})();
```

---

## Behavior

- **Manual navigation only** — no auto-advance
- **Slide transition** — `transform: translateX` on the track, `transition: 0.35s ease`
- **Edge clamping** — prev arrow disabled (dimmed, `pointer-events: none`) on slide 1; next arrow disabled on last slide; no wraparound
- **Dot sync** — active dot updates on every navigation
- **Single image** — JS adds `.slideshow--single`; CSS hides arrows and dots; image displays normally
- **Click isolation** — arrow/dot handlers call both `e.preventDefault()` and `e.stopPropagation()` to prevent the parent card `<a>` link from firing during slideshow navigation
- **Keyboard** — native button focus and Enter/Space activation work by default (no extra listeners needed). Global left/right arrow-key navigation is out of scope.

---

## Script Loading

Add to the bottom of `<body>` in both `index.html` and each `projects/*.html`, following the existing `main.js` pattern:

```html
<script src="assets/js/slideshow.js"></script>
<!-- or from a project page: -->
<script src="../assets/js/slideshow.js"></script>
```

---

## Out of Scope

- Touch/swipe support (can be added later as a standalone enhancement)
- Global keyboard arrow-key navigation (left/right arrow keys as a page-level shortcut — basic button keyboard activation via Enter/Space works natively)
- Lightbox / fullscreen view
