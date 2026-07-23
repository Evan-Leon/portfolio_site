---
name: adding-project-screenshots
description: Use when adding, updating, or troubleshooting project screenshots in this portfolio site — covers images/<slug>/ files, the homepage card-swiper in index.html, and the project-swiper in projects/<slug>.html.
---

# Adding Project Screenshots

## Overview

Each project's screenshots live in `images/<slug>/01.png`, `02.png`, ... and are
referenced in **two separate places** that must each match the files actually on
disk. They don't auto-sync — drift between them is the recurring bug in this repo.

## The two reference points

| Location | Selector | Behavior on mismatch |
|---|---|---|
| `index.html` (homepage card) | `.swiper.card-swiper` | **No pruning.** A slide pointing at a missing file shows a broken image. `assets/js/swiper-init.js` skips Swiper init (no autoplay) if the card has `<= 1` slide. |
| `projects/<slug>.html` (detail page) | `.swiper.project-swiper` | Self-prunes missing slides over HTTP via `pruneMissingSlides()` — forgiving, but still don't rely on it; keep markup accurate. |

## Checklist when screenshots change for a project

1. `ls images/<slug>/` — get the real count and filenames.
2. In `index.html`, make the card's `.swiper-wrapper` have exactly one `.swiper-slide > img` per file on disk. Card needs **2+ slides** for autoplay to kick in at all.
3. In `projects/<slug>.html`, make the detail page's `.swiper-wrapper` match the same file list (don't leave placeholder slides like `04.png`/`05.png` referencing files that were never added).
4. First slide gets `loading="eager"`, the rest `loading="lazy"`.

## Screenshot quality

Cards crop to a fixed-height box with `object-fit: cover; object-position: top`
(`assets/css/styles.css`). Screenshots that are full-page captures with lots of
surrounding whitespace/browser chrome look "zoomed out" and washed out in that crop.
Prefer tight crops where the actual UI fills the frame edge-to-edge, like
`images/budget-app/` or `images/nom-noms/` — those are the reference quality bar.

## Common mistakes

- Adding files to `images/<slug>/` but forgetting `index.html` only had 1 slide — no autoplay, easy to miss since the single image still renders fine.
- Scaffolding a new project's detail page from a template with 5 placeholder slides before all 5 screenshots exist.
- Using full-page/whitespace-heavy screenshots instead of tight UI-filling crops.
