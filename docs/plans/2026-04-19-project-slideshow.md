# Project Image Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all project card placeholders/GIFs with 1–5 photo slideshows that work identically on the main page (160px card) and each project detail page (full-width demo section).

**Architecture:** A single shared `slideshow.js` module initializes every `.slideshow` element on the page via `DOMContentLoaded`. CSS handles the slide animation via `translateX` on a flex track. The same HTML markup and JS work in both contexts; a context-specific CSS override in `.project-detail__demo` lets the detail-page slideshow size to natural image height rather than a fixed height.

**Tech Stack:** Vanilla JS (IIFE, no framework), CSS custom properties (already used site-wide), static HTML

---

## Important Note: Screenshots

The HTML, CSS, and JS can be implemented with placeholder images before real screenshots exist. The image folders just need to exist with at least one image per project for the slideshow to render non-empty. Use any placeholder PNG (even a 1×1 or a solid-color image) during development, then drop in real 1280×800 screenshots when ready.

After adding real screenshots, update the `og:image` meta tag in each project page from `linkedin.jpeg` to the first project screenshot.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `assets/js/slideshow.js` | Slideshow init, navigation, dot sync, single-image hiding |
| Modify | `assets/css/styles.css` | Add slideshow CSS block; remove dead `.project-card__image img` rule (lines 580–585) |
| Modify | `index.html` | Replace 9 card image areas with slideshow markup; add `<script>` tag |
| Modify | `projects/budget-app.html` | Replace demo placeholder with slideshow |
| Modify | `projects/nom-noms.html` | Replace demo placeholder with slideshow |
| Modify | `projects/leons-mems.html` | Replace demo placeholder with slideshow |
| Modify | `projects/el-blackjack.html` | Replace demo placeholder with slideshow |
| Modify | `projects/classic-golf.html` | Replace demo placeholder with slideshow |
| Modify | `projects/spead-read.html` | Replace demo placeholder with slideshow |
| Modify | `projects/showrunner-digest.html` | Replace GIF with slideshow |
| Modify | `projects/media-cloud-web-tools.html` | Replace GIF with slideshow |
| Modify | `projects/media-cloud-vitals.html` | Replace GIF with slideshow |
| Create | `images/[project-name]/01.png` (×9) | One placeholder image per project to unblock development |

---

## Task 1: Add Slideshow CSS + Remove Dead Rule

**Files:**
- Modify: `assets/css/styles.css:580-585` (remove dead rule)
- Modify: `assets/css/styles.css` (append slideshow block at end of file)

- [ ] **Step 1: Remove the now-dead `.project-card__image img` rule**

  In `assets/css/styles.css`, delete lines 580–585:

  ```css
  .project-card__image img,
  .project-card__image video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  ```

  After deletion, the line that was 587 (`.project-card__badge {`) should immediately follow line 578 (the closing `}` of `.project-card__image`).

- [ ] **Step 2: Append slideshow CSS block at the end of `assets/css/styles.css`**

  Add after the last line of the file:

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
   * Detail-page override: .project-detail__demo has no fixed height, so we let
   * the image size the container naturally.
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

- [ ] **Step 3: Verify no syntax errors**

  Open `assets/css/styles.css` and confirm:
  - The dead `.project-card__image img, .project-card__image video` block is gone
  - The `/* === SLIDESHOW === */` block appears at the end of the file

- [ ] **Step 4: Commit**

  ```bash
  git add assets/css/styles.css
  git commit -m "feat: add slideshow CSS and remove dead card image rule"
  ```

---

## Task 2: Create `assets/js/slideshow.js`

**Files:**
- Create: `assets/js/slideshow.js`

- [ ] **Step 1: Create the file**

  Create `assets/js/slideshow.js` with this exact content:

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

- [ ] **Step 2: Commit**

  ```bash
  git add assets/js/slideshow.js
  git commit -m "feat: add slideshow.js module"
  ```

---

## Task 3: Create Placeholder Images

**Files:**
- Create: `images/budget-app/01.png`
- Create: `images/nom-noms/01.png`
- Create: `images/leons-mems/01.png`
- Create: `images/el-blackjack/01.png`
- Create: `images/classic-golf/01.png`
- Create: `images/spead-read/01.png`
- Create: `images/showrunner-digest/01.png`
- Create: `images/media-cloud-web-tools/01.png`
- Create: `images/media-cloud-vitals/01.png`

> **Note:** These are temporary placeholders so HTML changes render non-empty. Replace with real 1280×800 screenshots when available. Folder names must match project page slugs exactly — `spead-read/` preserves the intentional typo.

- [ ] **Step 1: Create all nine image subdirectories and a placeholder image in each**

  Run this script from the repo root:

  ```bash
  for project in budget-app nom-noms leons-mems el-blackjack classic-golf spead-read showrunner-digest media-cloud-web-tools media-cloud-vitals; do
    mkdir -p "images/$project"
    # Create a minimal 1×1 purple PNG as placeholder
    printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "images/$project/01.png"
  done
  ```

  Then verify the directories were created:

  ```bash
  ls images/
  ```

  Expected output includes: `budget-app/  classic-golf/  el-blackjack/  leons-mems/  media-cloud-vitals/  media-cloud-web-tools/  nom-noms/  showrunner-digest/  spead-read/`

- [ ] **Step 2: Commit placeholder images**

  ```bash
  git add images/
  git commit -m "feat: add placeholder images for all 9 projects"
  ```

---

## Task 4: Update `index.html` — All 9 Card Image Areas + Script Tag

**Files:**
- Modify: `index.html`

The pattern is the same for every card. Replace the contents of each `<div class="project-card__image">` with a `.slideshow` div. Keep the `.project-card__badge` span if the card has one (AI-Built cards do; traditional cards don't).

The number of `<img>` slides and dots must match the number of images in the project's image folder. Start with 1 slide each (matching the single placeholder image created in Task 3). Add more slides when real screenshots are added.

- [ ] **Step 1: Replace Leon's Budget card image area (index.html ~line 127)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/budget-app/01.png" alt="Leon's Budget — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 2: Replace Nom Nom's card image area (~line 147)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/nom-noms/01.png" alt="Nom Nom's — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 3: Replace Leon's Mems card image area (~line 167)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
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
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 4: Replace El Blackjack card image area (~line 186)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/el-blackjack/01.png" alt="El Blackjack — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 5: Replace The Classic card image area (~line 203)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/classic-golf/01.png" alt="The Classic — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 6: Replace Spead Read card image area (~line 222)**

  Replace:
  ```html
          <div class="project-card__image">
            <div class="project-card__placeholder">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Demo coming soon</span>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/spead-read/01.png" alt="Spead Read — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
            <span class="project-card__badge">AI-Built</span>
          </div>
  ```

- [ ] **Step 7: Replace Media Cloud Web Tools card image area (~line 251)**

  Replace:
  ```html
          <div class="project-card__image">
            <img src="images/search.gif" alt="Media Cloud Web Tools demo" loading="lazy">
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/media-cloud-web-tools/01.png" alt="Media Cloud Web Tools — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
          </div>
  ```

  Note: No `.project-card__badge` on traditional cards — do not add one.

- [ ] **Step 8: Replace Media Cloud Vitals card image area (~line 267)**

  Replace:
  ```html
          <div class="project-card__image">
            <img src="images/vitals.gif" alt="Media Cloud Vitals demo" loading="lazy">
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/media-cloud-vitals/01.png" alt="Media Cloud Vitals — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
          </div>
  ```

- [ ] **Step 9: Replace ShowRunner Digest card image area (~line 282)**

  Replace:
  ```html
          <div class="project-card__image">
            <img src="images/ShowRunner.gif" alt="ShowRunner Digest demo" loading="lazy">
          </div>
  ```

  With:
  ```html
          <div class="project-card__image">
            <div class="slideshow">
              <div class="slideshow__track">
                <img class="slideshow__slide" src="images/showrunner-digest/01.png" alt="ShowRunner Digest — screenshot 1" loading="eager">
              </div>
              <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
              <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
              <div class="slideshow__dots">
                <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
              </div>
            </div>
          </div>
  ```

- [ ] **Step 10: Add script tag to `index.html`**

  Find the existing script tag at the bottom of `<body>` (~line 334):
  ```html
  <script src="assets/js/main.js"></script>
  ```

  Add `slideshow.js` after it:
  ```html
  <script src="assets/js/main.js"></script>
  <script src="assets/js/slideshow.js"></script>
  ```

- [ ] **Step 11: Open `index.html` in a browser and verify**

  - All 9 project cards show an image (placeholder or real screenshot) — no "Demo coming soon" placeholders
  - Cards with 1 image show no arrows or dots
  - Cards with 2+ images show arrows and dots; clicking an arrow slides to the next image
  - Clicking a card (not an arrow/dot) navigates to the project page as expected
  - The badge ("AI-Built") still appears on the 6 agentic cards

- [ ] **Step 12: Commit**

  ```bash
  git add index.html
  git commit -m "feat: replace card image placeholders with slideshow on main page"
  ```

---

## Task 5: Update AI-Built Project Detail Pages (6 pages)

**Files:**
- Modify: `projects/budget-app.html`
- Modify: `projects/nom-noms.html`
- Modify: `projects/leons-mems.html`
- Modify: `projects/el-blackjack.html`
- Modify: `projects/classic-golf.html`
- Modify: `projects/spead-read.html`

The pattern for all 6 is identical. The `<!-- DEMO -->` section in each page currently looks like:

```html
    <div class="project-detail__demo">
      <div class="project-detail__demo-placeholder">
        <p>Demo coming soon</p>
      </div>
    </div>
```

Replace the inner content (keep the wrapper div) with the slideshow. The image count must match the files in the project's image folder.

- [ ] **Step 1: Update `projects/budget-app.html` (~line 72)**

  Replace:
  ```html
      <div class="project-detail__demo">
        <div class="project-detail__demo-placeholder">
          <p>Demo coming soon</p>
        </div>
      </div>
  ```

  With:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/budget-app/01.png" alt="Leon's Budget — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

  Then add the script tag before `</body>`:
  ```html
  <script src="../assets/js/slideshow.js"></script>
  ```

- [ ] **Step 2: Update `projects/nom-noms.html`**

  Apply the same pattern — replace demo placeholder content, add script tag before `</body>`.

  Demo section replacement:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/nom-noms/01.png" alt="Nom Nom's — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

- [ ] **Step 3: Update `projects/leons-mems.html`**

  Demo section:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/leons-mems/01.png" alt="Leon's Mems — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

- [ ] **Step 4: Update `projects/el-blackjack.html`**

  Demo section:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/el-blackjack/01.png" alt="El Blackjack — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

- [ ] **Step 5: Update `projects/classic-golf.html`**

  Demo section:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/classic-golf/01.png" alt="The Classic — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

- [ ] **Step 6: Update `projects/spead-read.html`**

  Demo section:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/spead-read/01.png" alt="Spead Read — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

- [ ] **Step 7: Verify one detail page in the browser**

  Open `projects/budget-app.html` directly in a browser. Verify:
  - The demo section shows the screenshot (or placeholder image) at full width
  - The image sizes the container naturally (no fixed height — the image's intrinsic height shows)
  - Arrows and dots are hidden (only 1 image)
  - No layout breakage around the demo section

- [ ] **Step 8: Commit**

  ```bash
  git add projects/budget-app.html projects/nom-noms.html projects/leons-mems.html projects/el-blackjack.html projects/classic-golf.html projects/spead-read.html
  git commit -m "feat: replace demo placeholders with slideshow on AI-built project pages"
  ```

---

## Task 6: Update Traditional Project Detail Pages (3 pages)

**Files:**
- Modify: `projects/showrunner-digest.html`
- Modify: `projects/media-cloud-web-tools.html`
- Modify: `projects/media-cloud-vitals.html`

These pages currently have a single `<img>` (pointing to a GIF) inside `.project-detail__demo`. Remove the `<img>` and replace it with the slideshow. The `width` and `height` attributes on the old GIF `<img>` tag (present in media-cloud-vitals.html) are removed — the slideshow does not use them.

- [ ] **Step 1: Update `projects/showrunner-digest.html`**

  The current demo section looks like:
  ```html
      <div class="project-detail__demo">
        <img src="../images/ShowRunner.gif" ...>
      </div>
  ```

  Replace with:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/showrunner-digest/01.png" alt="ShowRunner Digest — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

  Add script tag before `</body>`:
  ```html
  <script src="../assets/js/slideshow.js"></script>
  ```

- [ ] **Step 2: Update `projects/media-cloud-web-tools.html`**

  Current demo section has `<img src="../images/search.gif" ...>`. Replace with:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/media-cloud-web-tools/01.png" alt="Media Cloud Web Tools — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

  Add script tag before `</body>`.

- [ ] **Step 3: Update `projects/media-cloud-vitals.html`**

  Current demo section has `<img src="../images/vitals.gif" width="2862" height="1372" ...>`. Replace with:
  ```html
      <div class="project-detail__demo">
        <div class="slideshow">
          <div class="slideshow__track">
            <img class="slideshow__slide" src="../images/media-cloud-vitals/01.png" alt="Media Cloud Vitals — screenshot 1" loading="eager">
          </div>
          <button class="slideshow__arrow slideshow__arrow--prev" aria-label="Previous">&#8249;</button>
          <button class="slideshow__arrow slideshow__arrow--next" aria-label="Next">&#8250;</button>
          <div class="slideshow__dots">
            <button class="slideshow__dot slideshow__dot--active" aria-label="Photo 1"></button>
          </div>
        </div>
      </div>
  ```

  Add script tag before `</body>`.

- [ ] **Step 4: Verify one traditional detail page in the browser**

  Open `projects/media-cloud-web-tools.html`. Verify:
  - Demo section shows the screenshot at full width (no GIF)
  - Image renders at its natural height (no collapse)
  - No layout issues

- [ ] **Step 5: Commit**

  ```bash
  git add projects/showrunner-digest.html projects/media-cloud-web-tools.html projects/media-cloud-vitals.html
  git commit -m "feat: replace GIFs with slideshow on traditional project pages"
  ```

---

## Task 7: Final Verification + GIF Cleanup

- [ ] **Step 1: Full browser smoke test**

  Open `index.html`. For each of the 9 project cards:
  - Image (or placeholder) is visible in the 160px card strip
  - Clicking a card navigates to the project page (not blocked by arrows/dots)

  Then open each of the 9 project pages and verify:
  - Demo section displays the screenshot at full width
  - If 1 image: no arrows or dots visible
  - If 2+ images: arrows and dots are visible, navigation works, prev arrow is dimmed on slide 1, next arrow is dimmed on last slide, active dot updates on each click

- [ ] **Step 2: Remove old GIF files (optional)**

  Once real screenshots are in place and the GIFs are no longer referenced anywhere, delete them:

  ```bash
  rm images/search.gif images/vitals.gif images/ShowRunner.gif
  git add -u images/
  git commit -m "chore: remove legacy GIF demo files"
  ```

  Verify with `grep -r "search.gif\|vitals.gif\|ShowRunner.gif" .` — should return no results.

- [ ] **Step 3: Adding more screenshots later**

  When real screenshots are ready, for each project:
  1. Drop `02.png`, `03.png`, etc. into `images/[project-name]/`
  2. In `index.html`: add `<img class="slideshow__slide" ...>` to the card's track and a `<button class="slideshow__dot" ...>` to its dots container
  3. In `projects/[project].html`: same additions to the detail page slideshow
  4. Use `loading="eager"` on the first slide only; all additional slides use `loading="lazy"`
  5. Commit

  No JS or CSS changes needed — the module handles any number of slides automatically.

---

## Done

At this point the slideshow is fully implemented. The site has no external dependencies added, all 9 project image areas are converted, and the GIFs are removed. Adding more screenshots per project is a pure HTML edit.
