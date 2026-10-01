# Portrait/Tablet Screenshot Support in Project Swipers — Design Spec

**Date:** 2026-06-17
**Status:** Approved

---

## Overview

The project swiper (card thumbnails + detail-page slideshow) was built and tested against landscape desktop screenshots (1280×800). Several projects — El Blackjack, Classic Golf, Leon's Mems, and Spead Read — are mobile/tablet apps whose real screenshots will be portrait-oriented. Today those projects have 1×1 placeholder images; this change makes the swiper styling handle portrait/tablet images correctly once real screenshots are added, without breaking the existing landscape projects (budget-app, nom-noms) or requiring any per-project configuration.

## Approach

CSS-only change, based on each image's intrinsic aspect ratio rather than a hardcoded "this project is portrait" flag. No JS or HTML markup changes.

### 1. Card thumbnails

`.project-card__image .swiper-slide img` currently uses `object-fit: cover` inside a fixed 160px-tall strip, cropping a centered slice. Add `object-position: top` so the crop favors the top of the screenshot (status bar / header) — the most identifiable part of a portrait screenshot when cropped into a short wide strip. This is a no-op-ish change for existing landscape screenshots (top vs. center crop of a 16:10 image cropped to a short strip is a minor difference).

### 2. Detail-page slideshow

`.project-detail__demo .swiper-slide img` currently uses `width: 100%; height: auto`, which is correct for landscape screenshots but would stretch a portrait screenshot to the full content width, making it absurdly tall.

Change to:

```css
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

This relies on the standard CSS replaced-element sizing algorithm: with `width: auto; height: auto` plus both `max-width` and `max-height` set, the browser scales the image to fit within both constraints while preserving aspect ratio.

- **Landscape (1280×800) screenshots:** unaffected in practice — they scale to `max-width: 100%` exactly as before, and are well under 70vh tall.
- **Portrait/tablet screenshots:** scale down to fit within 70vh, centered horizontally, never stretched to full container width.

No change needed to `assets/js/swiper-init.js` — Swiper's default (non-`autoHeight`) wrapper sizing already derives wrapper height from slide content height, which now reflects the capped image height correctly.

## Out of Scope

- Device-frame/bezel mockups around screenshots
- JS-based orientation detection or per-project classes
- Changes to image capture/export guidance (existing `docs/specs/2026-04-19-project-slideshow-design.md` capture-size guidance is unaffected; this just makes the renderer tolerant of other aspect ratios)

## Files Changed

| File | Change |
|------|--------|
| `assets/css/styles.css` | Update `.project-card__image .swiper-slide img` (add `object-position: top`) and `.project-detail__demo .swiper-slide` / `.project-detail__demo .swiper-slide img` (cap height, center) |

## Testing

Manually verify by temporarily dropping a portrait test image into one of the four affected projects' image folder and viewing both the card and detail page, then removing the test image. No automated tests exist for this site's styling.
