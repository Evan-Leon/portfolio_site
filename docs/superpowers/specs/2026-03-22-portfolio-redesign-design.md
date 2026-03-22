# Portfolio Site Redesign — Design Spec

## Overview

Redesign evanleon.com from the HTML5 UP "Hyperspace" template into a custom, space-themed portfolio that positions Evan Leon as a full-stack engineer and early mover in AI-augmented development. The site targets recruiters and fellow developers, with two distinct project sections: agentic coding projects (built with AI) and traditional projects.

## Constraints

- **Hosting**: GitHub Pages with custom domain `evanleon.com`
- **Stack**: Pure static HTML + CSS + vanilla JS. No build step, no framework.
- **Entry point**: `index.html` in project root
- **Theme**: Dark, spacey, expansive — "exploring the cosmos," not "hacking in a terminal"

## Site Structure

### Pages

```
index.html                          (Hub page)
projects/budget-app.html            (Leon's Budget)
projects/nom-noms.html              (Nom Nom's)
projects/leons-mems.html            (Leon's Mems)
projects/el-blackjack.html          (El Blackjack)
projects/classic-golf.html          (The Classic)
projects/media-cloud-web-tools.html (Media Cloud Web Tools)
projects/media-cloud-vitals.html    (Media Cloud Vitals)
projects/showrunner-digest.html     (ShowRunner Digest)
```

### Hub Page Sections (index.html)

1. **Navigation** — fixed top bar
2. **Hero** — full viewport, animated starfield
3. **About Me** — two-column layout
4. **Agentic Projects** — card grid (5 projects)
5. **Traditional Projects** — card grid (3 projects)
6. **Contact** — email, location, social links
7. **Footer** — minimal, repeated on all pages

## Section Details

### Navigation

- Fixed top bar on every page
- Left: "Evan Leon" text logo (links to hub)
- Right: About, Projects, Contact section links + highlighted "Resume" CTA button (links to PDF)
- Glassmorphism effect: `backdrop-filter: blur(12px)` with translucent dark background
- On project detail pages: "← Back to Projects" replaces the logo

### Hero

- Full viewport height (`100vh`)
- Animated starfield background: ~30-50 small `div` elements with CSS `@keyframes` for twinkling (opacity oscillation) and subtle vertical drift
- Soft nebula accents: 2-3 large radial gradients in purple/blue, positioned off-center
- Content (centered):
  - Role label: small, uppercase, letter-spaced, accent color — "SOFTWARE ENGINEER"
  - Name: large, bold — "Evan Leon"
  - Tagline: medium, muted — "Full-stack engineer building at the frontier of AI-augmented development."
  - Two CTAs: "View Projects" (primary filled gradient button) and "Get in Touch" (secondary outlined button)
  - Social icons: GitHub + LinkedIn, subtle until hovered
- Scroll indicator at bottom

### About Me

- Two-column layout (stacks vertically on mobile)
- Left column:
  - Circular profile photo with gradient border ring (purple→blue)
  - Tech pills below: Python, React, TypeScript, Django, FastAPI, Supabase
- Right column:
  - Section label: "About Me"
  - Heading: "Full-stack engineer exploring the frontier of AI-augmented development"
  - Two short paragraphs: what you build → how you build with AI → your stack
  - Resume (primary) + LinkedIn (secondary) buttons
- No skills bar charts — tech pills and projects tell the story

### Agentic Projects Section

- Section header: "🤖 Agentic Coding" label, "Built with AI" heading, subtitle explaining the approach
- 3-column card grid (2-col tablet, 1-col mobile)
- Each card:
  - Demo GIF/screenshot area at top
  - "AI-Built" badge (top-right of image area)
  - Project name (h3)
  - One-line description
  - Tech stack pills
  - Entire card is clickable → links to detail page
  - Hover: border glow (box-shadow) + slight lift (translateY: -4px)
- Card styling: subtle purple-tinted background, purple border
- Projects (5):
  1. Leon's Budget — Upload bank PDFs, categorize transactions, track spending trends
  2. Nom Nom's — Recipe scraper with LLM parsing, cook mode, shop mode
  3. Leon's Mems — Family photo app
  4. El Blackjack — Mobile blackjack trainer
  5. The Classic — Golf tournament app

### Traditional Projects Section

- Section header: "💻 Traditional Development" label, "Other Projects" heading
- Same 3-column card grid layout
- Cards styled with blue accent instead of purple, no "AI-Built" badge
- Projects (3):
  1. Media Cloud Web Tools — Django/React media analysis platform
  2. Media Cloud Vitals — Performance dashboard
  3. ShowRunner Digest — D3.js data visualization

### Contact

- Centered layout, max-width 600px
- Heading: "Let's Build Something"
- Subtitle: inviting copy about being open to opportunities
- Two info cards side-by-side: Email + Location
- Social icons: GitHub + LinkedIn as circular buttons
- No contact form — direct email link, avoids spam and backend complexity

### Footer

- Minimal bar on every page
- Left: "© 2026 Evan Leon"
- Right: GitHub, LinkedIn, Resume links
- Darkest background in the palette

## Project Detail Page Template

All 8 project pages use the same template with different content. Layout flow:

1. **Nav bar** with "← Back to Projects" link
2. **Project hero**: AI-Built badge (agentic only) + project title + tagline + GitHub/Demo buttons
3. **Demo GIF**: Large, prominent, full-width within container
4. **Problem / Solution**: Two-column block explaining why the project exists
5. **Tech Stack**: Pills layout
6. **Key Features**: 2×2 grid of feature cards (title + short description each)
7. **Prev / Next navigation**: Browse between projects without returning to hub
8. **Footer**

Traditional projects use the same template minus the AI badge.

## Visual Theme

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Deep Space | `#0a0520` | Primary background |
| Void | `#0f0a2a` | Secondary background, section alternation |
| Nebula Gradient | `#7c3aed → #3b82f6` | Primary buttons, accent gradient |
| Star White | `#f0f0ff` | Headings, primary text |
| Purple Accent | `#7c3aed` | Agentic badges, borders, labels |
| Blue Accent | `#3b82f6` | Traditional project accents |
| Light Purple | `#c4b5fd` | Links, secondary interactive elements |
| Body Text | `#a0a8c8` | Paragraph text |
| Muted | `#6b7280` | Captions, subtle text |
| Label Blue | `#7c8aff` | Section labels, uppercase text |

### Typography

- **Primary**: Inter (Google Fonts) — headings and body
- **Monospace**: JetBrains Mono (Google Fonts) — tech pills, code references
- **Fallback**: system-ui, sans-serif
- **Hierarchy**:
  - Section labels: 0.75rem / uppercase / wide letter-spacing / label blue
  - Page headings: 2.2rem / weight 800 / star white
  - Section headings: 1.4rem / weight 600 / star white
  - Body: 1rem / weight 400 / body text color / line-height 1.7
  - Code/tech: 0.8rem / JetBrains Mono

### Animations & Effects

- **Starfield**: CSS `@keyframes` twinkling (opacity 0.3↔1 over 2-4s, randomized delays) + subtle `translateY` drift. ~30-50 absolutely positioned small divs.
- **Scroll fade-in**: Sections start with `opacity: 0; transform: translateY(20px)` and animate in when intersecting viewport. Implemented with `IntersectionObserver` (~15 lines vanilla JS).
- **Card hover**: `box-shadow` glow transition + `transform: translateY(-4px)` over 0.2s.
- **Nav glassmorphism**: `backdrop-filter: blur(12px)` with translucent `rgba` background.
- **Nebula decorations**: Static radial gradients, not animated.
- **Accessibility**: All animations wrapped in `@media (prefers-reduced-motion: no-preference)` — disabled by default for users who prefer reduced motion.

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1024px) | 3-column project grid, side-by-side about, full nav |
| Tablet (768–1023px) | 2-column project grid, stacked about, horizontal nav |
| Mobile (<768px) | Single column, hamburger or simplified nav, full-width cards |

## Technical Approach

- **CSS**: Single stylesheet (`styles.css`) using CSS custom properties for the color palette. CSS Grid for all layouts. No preprocessor needed — modern CSS custom properties replace SCSS variables.
- **JS**: Vanilla only. IntersectionObserver for scroll effects, no jQuery. Minimal footprint.
- **Fonts**: Google Fonts (Inter + JetBrains Mono) loaded via `<link>` tags with `font-display: swap`.
- **Icons**: Font Awesome (already in project) for social icons, or switch to inline SVGs to reduce requests.
- **Images**: Optimized GIFs or WebP for project demos, lazy-loaded with `loading="lazy"`.
- **Shared nav/footer**: HTML duplicated per page. Acceptable for 9 pages and avoids JS templating complexity.
- **SEO**: Open Graph tags, meta descriptions, semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`).
- **GitHub Pages**: `index.html` at project root, `CNAME` file for custom domain, no build step.

## Files to Create

```
index.html                          — Hub page
projects/budget-app.html            — Leon's Budget detail
projects/nom-noms.html              — Nom Nom's detail
projects/leons-mems.html            — Leon's Mems detail
projects/el-blackjack.html          — El Blackjack detail
projects/classic-golf.html          — The Classic detail
projects/media-cloud-web-tools.html — Media Cloud Web Tools detail
projects/media-cloud-vitals.html    — Media Cloud Vitals detail
projects/showrunner-digest.html     — ShowRunner Digest detail
assets/css/styles.css               — Main stylesheet
assets/js/main.js                   — Scroll effects, starfield, interactions
```

## Files to Keep

- `CNAME` — custom domain config
- `images/` — existing demo GIFs and assets (will add new ones as needed)
- `images/Evan Leon Resume Main.pdf` — resume file
- `.gitignore`

## Files to Remove

- `elements.html` — unused template page
- `generic.html` — unused template page
- `README.txt` — template readme
- `LICENSE.txt` — template license (no longer using the template)
- `assets/sass/` — SCSS source (replacing with plain CSS)
- `assets/css/main.css` — old compiled CSS
- `assets/css/fontawesome-all.min.css` — if switching to inline SVGs (keep if staying with Font Awesome)
- `assets/css/noscript.css` — old template fallback
- `assets/js/jquery.min.js` — no longer needed
- `assets/js/jquery.scrollex.min.js` — replaced by IntersectionObserver
- `assets/js/jquery.scrolly.min.js` — replaced by native smooth scroll
- `assets/js/browser.min.js` — not needed
- `assets/js/breakpoints.min.js` — replaced by CSS media queries
- `assets/js/util.js` — template utility, not needed

## Out of Scope

- Backend or server-side functionality
- Contact form
- Blog or writing section
- CMS or content management
- Analytics (can be added later independently)
- Project hosting/deployment (projects are demo'd via GIFs, not live)
