# Portfolio Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild evanleon.com as a custom space-themed portfolio with agentic + traditional project sections, deployed on GitHub Pages.

**Architecture:** Pure static site (HTML + CSS + vanilla JS). Hub page (`index.html`) links to 8 project detail pages in `projects/`. Shared styles via single CSS file with custom properties. Vanilla JS for starfield animation, scroll fade-ins, and mobile hamburger menu.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, keyframes), vanilla JavaScript (IntersectionObserver), Google Fonts (Inter, JetBrains Mono), inline SVGs for icons.

**Spec:** `docs/superpowers/specs/2026-03-22-portfolio-redesign-design.md`

---

## File Structure

```
index.html                          — Hub page (hero, about, projects, contact, footer)
404.html                            — Custom 404 page
projects/
  budget-app.html                   — Leon's Budget detail page
  nom-noms.html                     — Nom Nom's detail page
  leons-mems.html                   — Leon's Mems detail page
  el-blackjack.html                 — El Blackjack detail page
  classic-golf.html                 — The Classic detail page
  media-cloud-web-tools.html        — Media Cloud Web Tools detail page
  media-cloud-vitals.html           — Media Cloud Vitals detail page
  showrunner-digest.html            — ShowRunner Digest detail page
assets/
  css/styles.css                    — All styles (variables, base, components, layouts, responsive)
  js/main.js                        — Starfield, scroll fade-in, hamburger menu
  evan-leon-resume.pdf              — Resume (moved from images/)
images/
  linkedin.jpeg                     — Profile photo (existing)
  favicon.png                       — Favicon (existing)
  search.gif                        — Media Cloud Web Tools demo (existing, optimize later)
  vitals.gif                        — Media Cloud Vitals demo (existing, optimize later)
  ShowRunner.gif                    — ShowRunner Digest demo (existing, optimize later)
CNAME                               — GitHub Pages domain config (existing)
.gitignore                          — Git ignore rules (existing)
```

---

## Task 1: Clean Up Old Template Files

Remove all legacy HTML5 UP template files that are being replaced. This creates a clean slate.

**Files:**
- Remove: `elements.html`, `generic.html`, `README.txt`, `LICENSE.txt`
- Remove: `assets/sass/` (entire directory)
- Remove: `assets/css/main.css`, `assets/css/fontawesome-all.min.css`, `assets/css/noscript.css`
- Remove: `assets/js/jquery.min.js`, `assets/js/jquery.scrollex.min.js`, `assets/js/jquery.scrolly.min.js`, `assets/js/browser.min.js`, `assets/js/breakpoints.min.js`, `assets/js/util.js`
- Remove: `assets/webfonts/` (entire directory)
- Remove: `images/evan_site.gif`, `images/flux.gif`, `images/wherebnb.gif`
- Move: `images/Evan Leon Resume Main.pdf` → `assets/evan-leon-resume.pdf`

- [ ] **Step 1: Remove old template HTML pages**

```bash
rm elements.html generic.html README.txt LICENSE.txt
```

- [ ] **Step 2: Remove old CSS, SCSS, and webfonts**

```bash
rm -rf assets/sass/ assets/webfonts/
rm assets/css/main.css assets/css/fontawesome-all.min.css assets/css/noscript.css
```

- [ ] **Step 3: Remove old JS dependencies**

```bash
rm assets/js/jquery.min.js assets/js/jquery.scrollex.min.js assets/js/jquery.scrolly.min.js assets/js/browser.min.js assets/js/breakpoints.min.js assets/js/util.js
```

- [ ] **Step 4: Remove legacy image files**

```bash
rm images/evan_site.gif images/flux.gif images/wherebnb.gif
```

- [ ] **Step 5: Move and rename resume PDF**

```bash
cp "images/Evan Leon Resume Main.pdf" assets/evan-leon-resume.pdf
rm "images/Evan Leon Resume Main.pdf"
```

- [ ] **Step 6: Remove old index.html and main.js**

The old `index.html` and `assets/js/main.js` will be completely rewritten. Remove them now so we start fresh.

```bash
rm index.html assets/js/main.js
```

- [ ] **Step 7: Create projects directory**

```bash
mkdir -p projects
```

- [ ] **Step 8: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove legacy HTML5 UP template files

Clean slate for custom space-themed portfolio redesign.
Old template CSS, JS, SCSS, webfonts, and unused pages removed.
Resume moved to assets/evan-leon-resume.pdf."
```

---

## Task 2: Create the Stylesheet (`assets/css/styles.css`)

The entire visual system: CSS custom properties, base reset/typography, component styles, layout styles, animations, and responsive breakpoints. This is the foundation everything else builds on.

**Files:**
- Create: `assets/css/styles.css`

- [ ] **Step 1: Write CSS custom properties and reset**

Write the top of `assets/css/styles.css` with custom properties for all colors from the spec palette, font stacks, and a minimal CSS reset (box-sizing, margin/padding reset, smooth scroll).

```css
/* ============================================
   CUSTOM PROPERTIES
   ============================================ */
:root {
  /* Backgrounds */
  --deep-space: #0a0520;
  --void: #0f0a2a;

  /* Accent gradient */
  --nebula-start: #7c3aed;
  --nebula-end: #3b82f6;
  --nebula-gradient: linear-gradient(135deg, var(--nebula-start), var(--nebula-end));

  /* Text */
  --star-white: #f0f0ff;
  --body-text: #a0a8c8;
  --muted: #6b7280;
  --label-blue: #7c8aff;

  /* Accents */
  --purple-accent: #7c3aed;
  --blue-accent: #3b82f6;
  --light-purple: #c4b5fd;

  /* Transparency helpers */
  --purple-bg-subtle: rgba(124, 58, 237, 0.06);
  --purple-border-subtle: rgba(124, 58, 237, 0.2);
  --blue-bg-subtle: rgba(59, 130, 246, 0.04);
  --blue-border-subtle: rgba(59, 130, 246, 0.15);

  /* Typography */
  --font-primary: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Spacing */
  --container-max: 1100px;
  --section-padding: 5rem 2rem;
}

/* ============================================
   RESET & BASE
   ============================================ */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-primary);
  font-size: 1rem;
  line-height: 1.7;
  color: var(--body-text);
  background-color: var(--deep-space);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img,
video {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: var(--light-purple);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--star-white);
}

h1, h2, h3, h4 {
  color: var(--star-white);
  line-height: 1.3;
}
```

- [ ] **Step 2: Write typography and utility classes**

Append to `assets/css/styles.css`:

```css
/* ============================================
   TYPOGRAPHY
   ============================================ */
.section-label {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--label-blue);
  margin-bottom: 0.5rem;
}

.page-heading {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
}

.section-heading {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--body-text);
  max-width: 500px;
}

.tech-pill {
  display: inline-block;
  padding: 0.25rem 0.7rem;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.tech-pill--purple {
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(124, 58, 237, 0.25);
  color: var(--light-purple);
}

.tech-pill--blue {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #93c5fd;
}

/* ============================================
   BUTTONS
   ============================================ */
.btn {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
  text-align: center;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn--primary {
  background: var(--nebula-gradient);
  color: white;
}

.btn--primary:hover {
  color: white;
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
}

.btn--secondary {
  background: transparent;
  border: 1px solid rgba(124, 58, 237, 0.4);
  color: var(--light-purple);
}

.btn--secondary:hover {
  color: var(--star-white);
  border-color: rgba(124, 58, 237, 0.7);
}

/* ============================================
   LAYOUT UTILITIES
   ============================================ */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 2rem;
}

.section {
  padding: var(--section-padding);
}
```

- [ ] **Step 3: Write nav styles**

Append nav styles including glassmorphism, desktop layout, and mobile hamburger:

```css
/* ============================================
   NAVIGATION
   ============================================ */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0.75rem 2rem;
  background: rgba(10, 5, 32, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(120, 100, 255, 0.1);
}

.nav__inner {
  max-width: var(--container-max);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav__logo {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--star-white);
}

.nav__logo:hover {
  color: var(--star-white);
}

.nav__links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  list-style: none;
}

.nav__link {
  font-size: 0.9rem;
  color: var(--body-text);
}

.nav__link:hover {
  color: var(--star-white);
}

.nav__resume {
  padding: 0.3rem 0.8rem;
  background: var(--nebula-gradient);
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
}

.nav__resume:hover {
  color: white;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.4);
}

/* Hamburger button */
.nav__hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--star-white);
}

/* Mobile overlay menu */
.nav__mobile-menu {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 5, 32, 0.97);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 999;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  list-style: none;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}

.nav__mobile-menu.is-open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.nav__mobile-menu a {
  font-size: 1.5rem;
  color: var(--star-white);
}
```

- [ ] **Step 4: Write hero styles with starfield**

Append hero and starfield CSS:

```css
/* ============================================
   HERO
   ============================================ */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(160deg, var(--deep-space) 0%, #0d1033 40%, #120a2e 70%, var(--deep-space) 100%);
}

.hero__content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero__label {
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--label-blue);
  margin-bottom: 1rem;
}

.hero__name {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--star-white);
  margin-bottom: 1.25rem;
}

.hero__tagline {
  font-size: 1.15rem;
  color: var(--body-text);
  max-width: 480px;
  margin: 0 auto 2rem;
  line-height: 1.6;
}

.hero__ctas {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.hero__social {
  display: flex;
  gap: 1.25rem;
  justify-content: center;
}

.hero__social a {
  color: var(--muted);
  transition: color 0.2s;
}

.hero__social a:hover {
  color: var(--light-purple);
}

.hero__social svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

/* Scroll indicator */
.hero__scroll {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--muted);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.hero__scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--muted), transparent);
}

/* ============================================
   STARFIELD
   ============================================ */
.starfield {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: white;
}

.nebula {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes drift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@media (prefers-reduced-motion: no-preference) {
  .star {
    animation: twinkle var(--twinkle-duration, 3s) ease-in-out infinite,
               drift var(--drift-duration, 6s) ease-in-out infinite;
    animation-delay: var(--star-delay, 0s);
  }
}
```

- [ ] **Step 5: Write about section styles**

```css
/* ============================================
   ABOUT
   ============================================ */
.about {
  background: var(--void);
}

.about__grid {
  display: grid;
  grid-template-columns: 1fr 1.8fr;
  gap: 3rem;
  align-items: center;
}

.about__photo-wrapper {
  text-align: center;
}

.about__photo-ring {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: var(--nebula-gradient);
  padding: 3px;
  margin: 0 auto;
}

.about__photo {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.about__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.about__heading {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  line-height: 1.3;
}

.about__text {
  margin-bottom: 1rem;
}

.about__ctas {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}
```

- [ ] **Step 6: Write project card styles**

```css
/* ============================================
   PROJECTS SECTION
   ============================================ */
.projects-section {
  text-align: center;
}

.projects-section--agentic {
  background: var(--deep-space);
}

.projects-section--traditional {
  background: var(--void);
}

.projects-section__header {
  margin-bottom: 2.5rem;
}

.projects-section__subtitle {
  margin: 0 auto;
}

/* ============================================
   PROJECT CARDS
   ============================================ */
.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  max-width: var(--container-max);
  margin: 0 auto;
  text-align: left;
}

.project-card {
  background: var(--purple-bg-subtle);
  border: 1px solid var(--purple-border-subtle);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: block;
  color: inherit;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(124, 58, 237, 0.15);
  color: inherit;
}

.project-card--traditional {
  background: var(--blue-bg-subtle);
  border-color: var(--blue-border-subtle);
}

.project-card--traditional:hover {
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);
}

.project-card__image {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, #1a103a, #1e1545);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.project-card__image img,
.project-card__image video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-card__badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: rgba(124, 58, 237, 0.3);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--light-purple);
  letter-spacing: 0.05em;
}

.project-card__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.project-card__placeholder svg {
  width: 32px;
  height: 32px;
  fill: currentColor;
  opacity: 0.5;
}

.project-card__body {
  padding: 1rem;
}

.project-card__name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.project-card__desc {
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  color: var(--body-text);
}

.project-card__pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.project-card__pills .tech-pill {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
}
```

- [ ] **Step 7: Write contact and footer styles**

```css
/* ============================================
   CONTACT
   ============================================ */
.contact {
  background: var(--deep-space);
  text-align: center;
}

.contact__inner {
  max-width: 600px;
  margin: 0 auto;
}

.contact__heading {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.contact__text {
  margin-bottom: 2rem;
  font-size: 1rem;
  line-height: 1.7;
}

.contact__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.contact__card {
  padding: 1.25rem;
  background: var(--purple-bg-subtle);
  border: 1px solid var(--purple-border-subtle);
  border-radius: 10px;
}

.contact__card-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--label-blue);
  margin-bottom: 0.5rem;
}

.contact__card-value {
  color: var(--light-purple);
  font-size: 0.95rem;
}

.contact__social {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.contact__social-link {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--light-purple);
  transition: background 0.2s, transform 0.2s;
}

.contact__social-link:hover {
  background: rgba(124, 58, 237, 0.2);
  transform: translateY(-2px);
  color: var(--star-white);
}

.contact__social-link svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

/* ============================================
   FOOTER
   ============================================ */
.footer {
  background: #060315;
  padding: 1.5rem 2rem;
}

.footer__inner {
  max-width: var(--container-max);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer__copyright {
  color: #4a4a6a;
  font-size: 0.8rem;
}

.footer__links {
  display: flex;
  gap: 1.25rem;
  list-style: none;
}

.footer__links a {
  color: #4a4a6a;
  font-size: 0.8rem;
}

.footer__links a:hover {
  color: var(--body-text);
}
```

- [ ] **Step 8: Write project detail page styles**

```css
/* ============================================
   PROJECT DETAIL PAGE
   ============================================ */
.project-detail {
  padding-top: 4rem; /* account for fixed nav */
}

.project-detail__hero {
  padding: 3rem 0 2rem;
}

.project-detail__badge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.project-detail__badge {
  padding: 0.25rem 0.6rem;
  background: rgba(124, 58, 237, 0.25);
  border: 1px solid rgba(124, 58, 237, 0.35);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--light-purple);
  letter-spacing: 0.05em;
}

.project-detail__badge-text {
  color: var(--muted);
  font-size: 0.8rem;
}

.project-detail__title {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
}

.project-detail__tagline {
  font-size: 1.1rem;
  color: var(--body-text);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.project-detail__ctas {
  display: flex;
  gap: 0.75rem;
}

.project-detail__demo {
  margin: 2rem 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--purple-border-subtle);
}

.project-detail__demo img,
.project-detail__demo video {
  width: 100%;
  display: block;
}

.project-detail__demo-placeholder {
  height: 300px;
  background: linear-gradient(135deg, #1a103a, #1e1545);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.9rem;
}

/* Problem / Solution */
.project-detail__ps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.project-detail__ps-label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--label-blue);
  margin-bottom: 0.5rem;
}

.project-detail__ps-text {
  line-height: 1.7;
  font-size: 0.9rem;
}

/* Tech Stack */
.project-detail__tech {
  margin-bottom: 2.5rem;
}

.project-detail__tech-label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--label-blue);
  margin-bottom: 1rem;
}

.project-detail__tech-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.project-detail__tech-pills .tech-pill {
  font-size: 0.8rem;
  padding: 0.35rem 0.85rem;
}

/* Key Features */
.project-detail__features {
  margin-bottom: 2.5rem;
}

.project-detail__features-label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--label-blue);
  margin-bottom: 1rem;
}

.project-detail__features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.project-detail__feature-card {
  padding: 1rem;
  background: var(--purple-bg-subtle);
  border: 1px solid rgba(124, 58, 237, 0.12);
  border-radius: 8px;
}

.project-detail__feature-card h4 {
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.project-detail__feature-card p {
  font-size: 0.8rem;
  line-height: 1.5;
}

/* Prev / Next */
.project-detail__nav {
  padding: 1.5rem 0 2.5rem;
  border-top: 1px solid rgba(124, 58, 237, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-detail__nav-direction {
  font-size: 0.7rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.project-detail__nav-title {
  font-size: 0.9rem;
  color: var(--light-purple);
}

.project-detail__nav-link {
  display: block;
}

.project-detail__nav-link:hover .project-detail__nav-title {
  color: var(--star-white);
}

.project-detail__nav-link--next {
  text-align: right;
}
```

- [ ] **Step 9: Write scroll fade-in animation styles**

```css
/* ============================================
   SCROLL ANIMATIONS
   ============================================ */
.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

@media (prefers-reduced-motion: no-preference) {
  .fade-in.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

/* If user prefers reduced motion, show everything immediately */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 10: Write responsive breakpoints**

```css
/* ============================================
   RESPONSIVE
   ============================================ */

/* Tablet */
@media (max-width: 1023px) {
  .project-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .about__grid {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .about__ctas {
    justify-content: center;
  }

  .hero__name {
    font-size: 2.8rem;
  }
}

/* Mobile */
@media (max-width: 767px) {
  :root {
    --section-padding: 3rem 1.25rem;
  }

  .nav__links {
    display: none;
  }

  .nav__hamburger {
    display: block;
  }

  .nav__mobile-menu {
    display: flex;
  }

  .hero__name {
    font-size: 2.2rem;
  }

  .hero__tagline {
    font-size: 1rem;
  }

  .hero__ctas {
    flex-direction: column;
    align-items: center;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }

  .project-detail__ps {
    grid-template-columns: 1fr;
  }

  .project-detail__features-grid {
    grid-template-columns: 1fr;
  }

  .contact__cards {
    grid-template-columns: 1fr;
  }

  .footer__inner {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}
```

- [ ] **Step 11: Verify the stylesheet loads in a browser**

Create a minimal test HTML file and open it locally to verify the CSS loads without errors. Check browser dev tools console for any warnings.

```bash
echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"><link rel="stylesheet" href="assets/css/styles.css"><title>Test</title></head><body><h1>Test</h1><p>Body text</p><span class="tech-pill tech-pill--purple">Python</span><button class="btn btn--primary">Button</button></body></html>' > _test.html
```

Open `_test.html` in browser. Verify: dark background, Inter font, star-white heading, purple pill, gradient button. Then remove:

```bash
rm _test.html
```

- [ ] **Step 12: Commit stylesheet**

```bash
git add assets/css/styles.css
git commit -m "feat: add complete stylesheet for portfolio redesign

CSS custom properties, typography, buttons, nav (with mobile hamburger),
hero + starfield, about, project cards, contact, footer, project detail
pages, scroll animations, and responsive breakpoints."
```

---

## Task 3: Create JavaScript (`assets/js/main.js`)

Starfield generation, IntersectionObserver for scroll fade-ins, and hamburger menu toggle.

**Files:**
- Create: `assets/js/main.js`

- [ ] **Step 1: Write starfield generation function**

```javascript
// ============================================
// STARFIELD GENERATOR
// ============================================
function createStarfield() {
  const container = document.querySelector('.starfield');
  if (!container) return;

  const starCount = 40;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');

    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty('--twinkle-duration', `${Math.random() * 3 + 2}s`);
    star.style.setProperty('--drift-duration', `${Math.random() * 4 + 4}s`);
    star.style.setProperty('--star-delay', `${Math.random() * 5}s`);

    // Occasional colored stars
    if (Math.random() > 0.8) {
      const colors = ['#a78bfa', '#60a5fa', '#c084fc'];
      star.style.background = colors[Math.floor(Math.random() * colors.length)];
    }

    container.appendChild(star);
  }
}
```

- [ ] **Step 2: Write scroll fade-in observer**

```javascript
// ============================================
// SCROLL FADE-IN
// ============================================
function initFadeIn() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => observer.observe(el));
}
```

- [ ] **Step 3: Write hamburger menu toggle**

```javascript
// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
  const button = document.querySelector('.nav__hamburger');
  const menu = document.querySelector('.nav__mobile-menu');
  if (!button || !menu) return;

  button.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    button.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a link is clicked
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
}
```

- [ ] **Step 4: Write init function and DOMContentLoaded**

```javascript
// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  createStarfield();
  initFadeIn();
  initMobileMenu();
});
```

- [ ] **Step 5: Commit JavaScript**

```bash
git add assets/js/main.js
git commit -m "feat: add starfield, scroll fade-in, and mobile menu JS

Vanilla JS only — no dependencies. Starfield generates 40 animated
stars via DOM. IntersectionObserver handles scroll fade-ins. Hamburger
menu toggle with ARIA attributes."
```

---

## Task 4: Build the Hub Page (`index.html`)

The main entry point with all hub sections: nav, hero, about, agentic projects, traditional projects, contact, footer.

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write the HTML document shell**

Write `index.html` with `<!DOCTYPE html>`, `<head>` (charset, viewport, title, Google Fonts `<link>`, stylesheet `<link>`, favicon, OG tags, GA script), and opening `<body>`.

The `<head>` must include:
- `<meta charset="UTF-8">`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>Evan Leon | Software Engineer</title>`
- `<meta name="description" content="Full-stack software engineer building at the frontier of AI-augmented development.">`
- OG tags: `og:title`, `og:description`, `og:type` (website), `og:url` (https://evanleon.com), `og:image` (use `images/linkedin.jpeg` as the OG image for now — can be replaced with a custom screenshot later)
- Google Fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">`
- `<link rel="stylesheet" href="assets/css/styles.css">`
- `<link rel="icon" href="images/favicon.png">`
- Google Analytics gtag snippet with ID `G-N6J50LX4EY`

- [ ] **Step 2: Write the navigation HTML**

```html
<nav class="nav">
  <div class="nav__inner">
    <a href="/" class="nav__logo">Evan Leon</a>
    <ul class="nav__links">
      <li><a href="#about" class="nav__link">About</a></li>
      <li><a href="#projects" class="nav__link">Projects</a></li>
      <li><a href="#contact" class="nav__link">Contact</a></li>
      <li><a href="assets/evan-leon-resume.pdf" class="nav__resume" target="_blank" rel="noopener">Resume</a></li>
    </ul>
    <button class="nav__hamburger" aria-expanded="false" aria-controls="mobile-menu" aria-label="Toggle menu">
      <!-- Hamburger SVG icon (3 lines) -->
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  </div>
</nav>
<ul class="nav__mobile-menu" id="mobile-menu">
  <li><a href="#about">About</a></li>
  <li><a href="#projects">Projects</a></li>
  <li><a href="#contact">Contact</a></li>
  <li><a href="assets/evan-leon-resume.pdf" target="_blank" rel="noopener">Resume</a></li>
</ul>
```

- [ ] **Step 3: Write the hero section HTML**

Wrap all page content (hero through contact) in a `<main>` element for semantic HTML.

```html
<main>
  <section class="hero">
    <div class="starfield"></div>
    <!-- Nebula decorations -->
    <div class="nebula" style="width: 300px; height: 300px; background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%); top: 10%; right: 10%;"></div>
    <div class="nebula" style="width: 200px; height: 200px; background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%); bottom: 20%; left: 15%;"></div>

    <div class="hero__content">
      <p class="hero__label">Software Engineer</p>
      <h1 class="hero__name">Evan Leon</h1>
      <p class="hero__tagline">Full-stack engineer building at the frontier of AI-augmented development.</p>
      <div class="hero__ctas">
        <a href="#projects" class="btn btn--primary">View Projects</a>
        <a href="#contact" class="btn btn--secondary">Get in Touch</a>
      </div>
      <div class="hero__social">
        <a href="https://github.com/Evan-Leon" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
        <a href="https://www.linkedin.com/in/evan-leon/" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
    </div>
    <div class="hero__scroll">
      <span>Scroll</span>
      <div class="hero__scroll-line"></div>
    </div>
  </section>
```

- [ ] **Step 4: Write the about section HTML**

`<section id="about" class="section about fade-in">` with the two-column grid: photo (using `images/linkedin.jpeg`), tech pills (Python, React, TypeScript, Django, FastAPI, Supabase), and this bio content:

Paragraph 1: "I build practical, full-stack applications — from budget trackers to recipe managers to mobile games. What sets me apart is how I build: I'm deep into agentic coding, using AI as a true development partner to ship faster and think bigger."

Paragraph 2: "My stack spans Python (Django, FastAPI) and React/TypeScript on the front end, with experience across Supabase, React Native, and more. I pick the right tool for the job and move fast."

Include Resume (primary, links to `assets/evan-leon-resume.pdf`) and LinkedIn (secondary, links to `https://www.linkedin.com/in/evan-leon/`) buttons.

- [ ] **Step 5: Write the agentic projects section HTML**

`<section id="projects" class="section projects-section projects-section--agentic fade-in">` with section header and 5 project cards. Each card is an `<a>` linking to its detail page. Each card has the "AI-Built" badge. Projects without demo assets use the placeholder markup.

Card content:
1. **Leon's Budget** — "Upload bank PDFs, categorize transactions, and track spending trends." Pills: Django, DRF, React, TypeScript
2. **Nom Nom's** — "Recipe scraper with LLM-assisted parsing, cook mode, and shop mode." Pills: FastAPI, React, TypeScript, LLM
3. **Leon's Mems** — "Family photo app for organizing and sharing memories." Pills: Supabase, React, TypeScript
4. **El Blackjack** — "Mobile blackjack trainer for learning optimal strategy." Pills: React Native
5. **The Classic** — "Golf tournament management and scoring app." Pills: Django, React, TypeScript

- [ ] **Step 6: Write the traditional projects section HTML**

`<section class="section projects-section projects-section--traditional fade-in">` with 3 cards using `project-card--traditional` class, no badge. Each links to its detail page. Use `loading="lazy"` on all demo images.

Card content:
1. **Media Cloud Web Tools** — "Media analysis platform for researchers and journalists." Image: `images/search.gif`. Pills: Django, React, Redux, PostgreSQL
2. **Media Cloud Vitals** — "Performance monitoring dashboard for Media Cloud." Image: `images/vitals.gif`. Pills: Django, React, D3.js
3. **ShowRunner Digest** — "Data visualization for television industry insights." Image: `images/ShowRunner.gif`. Pills: JavaScript, D3.js

- [ ] **Step 7: Write the contact section HTML**

`<section id="contact" class="section contact fade-in">` with:
- Heading: "Let's Build Something"
- Subtitle: "I'm always open to discussing new opportunities, interesting projects, or ways AI is changing how we build software."
- Email card: `evan.leon.j@gmail.com` (as `mailto:` link)
- Location card: "Framingham, MA"
- Social icons: GitHub (`https://github.com/Evan-Leon`) + LinkedIn (`https://www.linkedin.com/in/evan-leon/`) as circular buttons with inline SVGs

- [ ] **Step 8: Write the footer HTML and close document**

Close the `</main>` tag after the contact section. Then write the footer (outside `<main>`) with copyright "© 2026 Evan Leon" and links to GitHub, LinkedIn, and Resume. Then `<script src="assets/js/main.js"></script>` and closing `</body></html>`.

- [ ] **Step 9: Open index.html in browser and verify**

Open `index.html` in a browser. Verify:
- Nav renders with glassmorphism
- Starfield animates (twinkling stars)
- Hero content is centered and legible
- About section has two-column layout with photo
- Both project sections show card grids
- Contact section renders properly
- Footer at bottom
- Scroll fade-in triggers as you scroll
- Resize to mobile width: hamburger appears, nav links hide, grids collapse

Fix any visual issues before committing.

- [ ] **Step 10: Commit hub page**

```bash
git add index.html
git commit -m "feat: add hub page with all sections

Complete index.html with nav, hero (starfield), about, agentic
projects (5 cards), traditional projects (3 cards), contact, and
footer. All sections responsive with scroll fade-in animations."
```

---

## Task 5: Build Project Detail Pages

Create all 8 project detail pages using a consistent template. Each page has the same structure with different content.

**Files:**
- Create: `projects/budget-app.html`
- Create: `projects/nom-noms.html`
- Create: `projects/leons-mems.html`
- Create: `projects/el-blackjack.html`
- Create: `projects/classic-golf.html`
- Create: `projects/media-cloud-web-tools.html`
- Create: `projects/media-cloud-vitals.html`
- Create: `projects/showrunner-digest.html`

- [ ] **Step 1: Create Leon's Budget detail page**

Write `projects/budget-app.html` with the full HTML document structure. All asset paths use `../` prefix (e.g., `../assets/css/styles.css`). Include:
- Nav with "← Back to Projects" logo link (`../index.html#projects`)
- AI-Built badge + title "Leon's Budget" + tagline + GitHub link
- Demo placeholder (no asset yet)
- Problem/Solution: tracking finances across bank accounts → upload PDFs, auto-categorize, visualize trends
- Tech stack: Django, DRF, React, TypeScript, PDF Parsing, Chart.js
- Key features: PDF Upload & Parsing, Smart Categorization, Trend Visualization, Multi-Account
- Prev/Next: ← ShowRunner Digest (`showrunner-digest.html`) | Nom Nom's → (`nom-noms.html`)
- Footer
- GA tag + JS script

- [ ] **Step 2: Create Nom Nom's detail page**

Write `projects/nom-noms.html`. AI-Built badge.
- Title: "Nom Nom's"
- Tagline: Recipe scraper with LLM-assisted parsing, cook mode, and shop mode
- Problem: manually copying recipes from websites → paste URL, auto-scrape + LLM parse, organized recipe book
- Tech stack: FastAPI, React, TypeScript, LLM, Web Scraping
- Features: URL Recipe Scraping, LLM-Assisted Parsing, Cook Mode, Shop Mode
- Prev: ← Leon's Budget (`budget-app.html`) | Next: Leon's Mems → (`leons-mems.html`)

- [ ] **Step 3: Create Leon's Mems detail page**

Write `projects/leons-mems.html`. AI-Built badge.
- Title: "Leon's Mems"
- Tagline: Family photo app for organizing and sharing memories
- Tech stack: Supabase, React, TypeScript
- Features: Photo Upload & Organization, Family Sharing, Album Management, Memory Timeline
- Prev: ← Nom Nom's (`nom-noms.html`) | Next: El Blackjack → (`el-blackjack.html`)

- [ ] **Step 4: Create El Blackjack detail page**

Write `projects/el-blackjack.html`. AI-Built badge.
- Title: "El Blackjack"
- Tagline: Mobile blackjack trainer for learning optimal strategy
- Tech stack: React Native, TypeScript
- Features: Strategy Training, Real-time Feedback, Basic Strategy Chart, Session Stats
- Prev: ← Leon's Mems (`leons-mems.html`) | Next: The Classic → (`classic-golf.html`)

- [ ] **Step 5: Create The Classic detail page**

Write `projects/classic-golf.html`. AI-Built badge.
- Title: "The Classic"
- Tagline: Golf tournament management and scoring app
- Tech stack: Django, React, TypeScript
- Features: Tournament Management, Live Scoring, Leaderboard, Player Profiles
- Prev: ← El Blackjack (`el-blackjack.html`) | Next: Media Cloud Web Tools → (`media-cloud-web-tools.html`)

- [ ] **Step 6: Create Media Cloud Web Tools detail page**

Write `projects/media-cloud-web-tools.html`. No AI badge (traditional). Use `project-card--traditional` styling.
- Title: "Media Cloud Web Tools"
- Tagline: Media analysis platform for researchers and journalists
- Demo: `../images/search.gif` (with `loading="lazy"`)
- Tech stack: Django, React, Redux, D3.js, PostgreSQL
- Features: Media Search & Analysis, Data Visualization, Research Tools, Topic Mapping
- Prev: ← The Classic (`classic-golf.html`) | Next: Media Cloud Vitals → (`media-cloud-vitals.html`)

- [ ] **Step 7: Create Media Cloud Vitals detail page**

Write `projects/media-cloud-vitals.html`. No AI badge.
- Title: "Media Cloud Vitals"
- Tagline: Performance monitoring dashboard for the Media Cloud platform
- Demo: `../images/vitals.gif` (with `loading="lazy"`)
- Tech stack: Django, React, D3.js
- Features: Performance Metrics, System Health Monitoring, Usage Analytics, Alerting
- Prev: ← Media Cloud Web Tools (`media-cloud-web-tools.html`) | Next: ShowRunner Digest → (`showrunner-digest.html`)

- [ ] **Step 8: Create ShowRunner Digest detail page**

Write `projects/showrunner-digest.html`. No AI badge.
- Title: "ShowRunner Digest"
- Tagline: Data visualization platform for television industry insights
- Demo: `../images/ShowRunner.gif` (with `loading="lazy"`)
- Tech stack: JavaScript, D3.js, HTML, CSS
- Features: Interactive Charts, Data Filtering, Trend Analysis, Responsive Design
- Prev: ← Media Cloud Vitals (`media-cloud-vitals.html`) | Next: Leon's Budget → (`budget-app.html`)

- [ ] **Step 9: Verify all detail pages in browser**

Open each of the 8 project pages in a browser. Verify:
- Nav shows "← Back to Projects" and links back to hub
- Title, tagline, and badges render correctly
- Demo images load for traditional projects; placeholders show for agentic projects
- Problem/Solution two-column layout works
- Tech pills display
- Feature cards display in 2×2 grid
- Prev/Next links work and navigate correctly (including wrap-around: ShowRunner → Budget)
- Footer renders
- Responsive: check at mobile width

- [ ] **Step 10: Commit all detail pages**

```bash
git add projects/
git commit -m "feat: add 8 project detail pages

5 agentic project pages (Budget, Nom Nom's, Mems, Blackjack, Classic)
with AI-Built badges and demo placeholders.
3 traditional project pages (Media Cloud Web Tools, Vitals, ShowRunner)
with existing demo GIFs. All pages share consistent template with
prev/next navigation that wraps around."
```

---

## Task 6: Create 404 Page and Final Touches

Custom 404, resume file move, and final verification.

**Files:**
- Create: `404.html`
- Move: `images/Evan Leon Resume Main.pdf` → `assets/evan-leon-resume.pdf` (done in Task 1)

- [ ] **Step 1: Create custom 404 page**

Write `404.html` with the full HTML shell (same head as index.html). Body contains nav (linking to `/`) and a centered message:

```html
<main class="hero" style="min-height: 100vh;">
  <div class="starfield"></div>
  <div class="hero__content">
    <p class="hero__label">404</p>
    <h1 class="hero__name">Lost in Space</h1>
    <p class="hero__tagline">The page you're looking for has drifted into a black hole.</p>
    <div class="hero__ctas">
      <a href="/" class="btn btn--primary">Back to Earth</a>
    </div>
  </div>
</main>
```

Include the starfield JS so the 404 page has the animated background.

- [ ] **Step 2: Open 404 page in browser and verify**

Check that the 404 page renders with starfield, the message displays correctly, and the "Back to Earth" button links to `/`.

- [ ] **Step 3: Full end-to-end site walkthrough**

Open `index.html` and walk through the entire site:
1. Hero loads with starfield animation
2. Scroll down — sections fade in
3. About section: photo loads, pills display, links work
4. Click a project card → navigates to detail page
5. Detail page: back link works, prev/next navigation works
6. Navigate through all 8 projects using prev/next
7. Contact section: email link opens mail client, social links work
8. Resume link opens PDF
9. Test at mobile width: hamburger menu works, grids collapse
10. Check browser console for any JS errors

Fix any issues found.

- [ ] **Step 4: Commit 404 page**

```bash
git add 404.html
git commit -m "feat: add custom 404 page with space theme

'Lost in Space' 404 page with starfield animation and link back
to the hub. GitHub Pages serves this automatically."
```

- [ ] **Step 5: Final commit — update .gitignore and cleanup**

Verify no test files or temporary files remain. Ensure `.gitignore` includes `.superpowers/`. Run `git status` to check for any untracked files.

```bash
git status
```

If clean, the implementation is complete. If any stray files, add them to `.gitignore` or remove them.

---

## Summary

| Task | Description | Files | Commits |
|------|-------------|-------|---------|
| 1 | Clean up old template files | Remove ~20 files, move resume | 1 |
| 2 | Create stylesheet | `assets/css/styles.css` | 1 |
| 3 | Create JavaScript | `assets/js/main.js` | 1 |
| 4 | Build hub page | `index.html` | 1 |
| 5 | Build 8 project detail pages | `projects/*.html` | 1 |
| 6 | 404 page + final verification | `404.html` | 1-2 |

**Total: 6 tasks, ~6 commits, 12 files created**
