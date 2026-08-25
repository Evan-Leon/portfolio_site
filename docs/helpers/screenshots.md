# Screenshot Helper

Guidance for capturing project screenshots before adding them to `images/{slug}/` (see `docs/meta-prompts/portfolio-project-meta-prompt.md` for the full add-a-project flow).

## How screenshots get rendered

Every screenshot is used in two places, unscaled, from the same source file:

- **Homepage card** (`.project-card__image .swiper-slide img`) — fixed **160px-tall** container, image is `object-fit: cover; object-position: top`. The image is cropped to fill the box; only the **top portion** of a tall (portrait) image is visible. Wide (landscape) images get cropped on the sides instead, which is far less destructive.
- **Detail page** (`.project-detail__demo .swiper-slide img`) — no cropping; the image is scaled down to fit `max-height: 70vh` at its natural aspect ratio, centered. Both landscape and portrait images look fine here.

The card view is the riskier of the two — it's where bad crops happen. Shoot with that in mind.

## General rules (any screenshot)

- **Format:** PNG.
- **Filenames:** zero-padded sequential, `01.png`, `02.png`, … inside `images/{slug}/`.
- **Count:** 1-5 images per project. The first (`01.png`) is the hero shot — it's the only one with `loading="eager"` and the one shown by default before the swiper autoplays/interacts.
- **Real data only:** use realistic, populated content (sample transactions, real recipes, a played-out hand) — not empty states, lorem ipsum, or placeholder data. Empty states make a project look unfinished.
- **No personal/sensitive data:** scrub real emails, names, account numbers, API keys, or anything you wouldn't want public — these images ship to a public site.
- **Consistent chrome:** don't mix screenshots with browser chrome visible and screenshots without it across the same project's set. Pick one (browser frame or clean) and stay consistent.
- **Light vs dark mode:** match whichever mode the app defaults to / looks best in; don't mix modes within one project's set.

## Desktop / web apps (landscape)

- **Resolution:** capture at **1280×800** (or 1280×whatever the content naturally is — existing examples are 1280×794 and 1280×800). Don't capture at full 4K/Retina res and rely on browser downscaling — export or resize to roughly this width so file size stays reasonable.
- **Browser window width:** size the browser to ~1280px wide before capturing so the app's responsive layout matches what you ship (no awkward in-between breakpoint).
- **Crop tightly to the app surface:** exclude OS taskbar/menu bar. A browser address bar is optional — include it consistently or not at all (see "Consistent chrome" above).
- **First image (`01.png`) should be the most representative landscape view** — a dashboard, main list, or primary workflow screen — since it's both the hero on the detail page and the (cropped-from-top) thumbnail on the card. Because the card crops from the top only, keep the most important UI near the top third of the frame.
- **Subsequent images** can show secondary flows, modals, or detail views — anything that helps a visitor understand the breadth of the app in a few seconds.

## Mobile apps (portrait)

Portrait images are the one case where the card thumbnail crop really matters — `object-position: top` keeps only the top 160px-tall-container's-worth of the image (scaled to the card's width), so the bottom two-thirds to three-quarters of a typical phone screenshot will not be visible on the homepage card. They're still shown in full on the detail page.

- **Resolution:** capture at native device or simulator resolution (e.g., iPhone simulator screenshots, or a real device photo of the screen) — don't manually shrink. The detail-page CSS scales it down to fit; the card CSS crops it, so resolution itself doesn't need to match desktop's 1280px width.
- **Frame the top of the screenshot for the card crop:** put the single most identifiable, attractive piece of UI — a hero screen, key game state, primary action button — within roughly the top 20-25% of the image's height. Status bar / notch area is fine to include as long as something recognizable sits just below it.
- **Avoid a screenshot where the top is mostly empty space, a plain header, or a loading state** — that's exactly what will end up alone on the homepage card.
- **No phone bezel/device frame mockups** — crop to just the screen content. Device frames add visual noise at card size and don't match the flat style of the desktop screenshots sitting next to them in the same grid.
- **First image (`01.png`) carries the most weight** for the same reason as desktop — it's the hero on both card and detail page.

## Quick checklist before adding a screenshot

- [ ] PNG, sequential zero-padded filename in `images/{slug}/`
- [ ] Real, populated content — no empty states or placeholder text
- [ ] No personal/sensitive data visible
- [ ] For portrait shots: key UI sits in the top ~20-25% of the frame
- [ ] For landscape shots: browser sized to ~1280px before capture
- [ ] Consistent chrome and color mode across the whole set
- [ ] `01.png` is the strongest, most representative shot
