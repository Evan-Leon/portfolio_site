/*
 * The projects the lot drives past, in drive order.
 *
 * This is the theater's only piece of portfolio content, and it is written by
 * hand rather than generated: the site has no build step and no manifest to
 * read, so the list of projects exists in exactly two places — here, and the
 * hand-written exit-beat `<ul>` in `index.html` that a visitor with no
 * JavaScript sees instead of the lot. `projects.test.ts` asserts the two agree,
 * href for href and in order, because a drift between them is silent: the lot
 * would show one set of screens and the fallback list another.
 *
 * WHY THESE PATHS ARE SITE-ABSOLUTE AND NOT BUILT FROM `BASE_URL`
 * ---------------------------------------------------------------
 * `scenes/registry.ts` requires every asset URL it declares to be built from
 * `import.meta.env.BASE_URL`, because a theater asset is served from under
 * `/theater/` and moves with the app. **These are not theater assets.** The
 * poster is the same `images/<slug>/01.png` the portfolio site's own project
 * card uses and the page is the site's own `projects/<slug>.html`; both live at
 * the site root, one level above the theater, and are served by nginx whether
 * the theater exists or not. Prefixing them with the base would point the lot
 * at `/theater/images/…`, which 404s for every screen at once.
 *
 * The screens are ordered by the drive, not by date: `screenPlacement(0)` puts
 * the first entry on the left, and the alternation follows from the index.
 */

/** One project, as the lot and the exit list both need it. */
export interface TheaterProject {
  /** Directory and page stem — `images/<slug>/`, `projects/<slug>.html`. */
  slug: string;
  /** Display name. This is the marquee text, and the link's accessible name. */
  name: string;
  /** The site page a screen links to. Site-absolute — see the header. */
  href: string;
  /** The still shown on the screen surface, and what the ring waits for. */
  poster: string;
  /** The loop DT4 plays on the active screen. Not fetched in DT3. */
  clip: string;
}

/** The drive, in order. Screen 0 is on the left. */
export const projects: readonly TheaterProject[] = [
  {
    slug: "budget-app",
    name: "Leon's Budget",
    href: "/projects/budget-app.html",
    poster: "/images/budget-app/01.png",
    clip: "/images/budget-app/demo.mp4",
  },
  {
    slug: "nom-noms",
    name: "Nom Nom's",
    href: "/projects/nom-noms.html",
    poster: "/images/nom-noms/01.png",
    clip: "/images/nom-noms/demo.mp4",
  },
  {
    slug: "el-blackjack",
    name: "El Blackjack",
    href: "/projects/el-blackjack.html",
    poster: "/images/el-blackjack/01.png",
    clip: "/images/el-blackjack/demo.mp4",
  },
  {
    slug: "classic-golf",
    name: "The Classic",
    href: "/projects/classic-golf.html",
    poster: "/images/classic-golf/01.png",
    clip: "/images/classic-golf/demo.mp4",
  },
  {
    slug: "spead-read",
    name: "Spead Read",
    href: "/projects/spead-read.html",
    poster: "/images/spead-read/01.png",
    clip: "/images/spead-read/demo.mp4",
  },
  {
    slug: "chunk-norris",
    name: "Chunk Norris",
    href: "/projects/chunk-norris.html",
    poster: "/images/chunk-norris/01.png",
    clip: "/images/chunk-norris/demo.mp4",
  },
  {
    slug: "app-dash",
    name: "app-dash",
    href: "/projects/app-dash.html",
    poster: "/images/app-dash/01.png",
    clip: "/images/app-dash/demo.mp4",
  },
  {
    slug: "prompt-heus",
    name: "Prompt-heus",
    href: "/projects/prompt-heus.html",
    poster: "/images/prompt-heus/01.png",
    clip: "/images/prompt-heus/demo.mp4",
  },
  {
    slug: "voice-trainer",
    name: "Voice Trainer",
    href: "/projects/voice-trainer.html",
    poster: "/images/voice-trainer/01.png",
    clip: "/images/voice-trainer/demo.mp4",
  },
  {
    slug: "chudios",
    name: "chudios",
    href: "/projects/chudios.html",
    poster: "/images/chudios/01.png",
    clip: "/images/chudios/demo.mp4",
  },
  {
    slug: "chud",
    name: "CHUD",
    href: "/projects/chud.html",
    poster: "/images/chud/01.png",
    clip: "/images/chud/demo.mp4",
  },
  {
    slug: "co-host",
    name: "co-host",
    href: "/projects/co-host.html",
    poster: "/images/co-host/01.png",
    clip: "/images/co-host/demo.mp4",
  },
  {
    slug: "mind-palace",
    name: "Mind Palace",
    href: "/projects/mind-palace.html",
    poster: "/images/mind-palace/01.png",
    clip: "/images/mind-palace/demo.mp4",
  },
  {
    slug: "logson",
    name: "Logson",
    href: "/projects/logson.html",
    poster: "/images/logson/01.png",
    clip: "/images/logson/demo.mp4",
  },
  {
    slug: "graces-tree",
    name: "Grace's Tree",
    href: "/projects/graces-tree.html",
    poster: "/images/graces-tree/01.png",
    clip: "/images/graces-tree/demo.mp4",
  },
  {
    slug: "journow",
    name: "jourNOW",
    href: "/projects/journow.html",
    poster: "/images/journow/01.png",
    clip: "/images/journow/demo.mp4",
  },
  {
    slug: "co-author",
    name: "Co-Author",
    href: "/projects/co-author.html",
    poster: "/images/co-author/01.png",
    clip: "/images/co-author/demo.mp4",
  },
  {
    slug: "media-cloud-web-tools",
    name: "Media Cloud Web Tools",
    href: "/projects/media-cloud-web-tools.html",
    poster: "/images/media-cloud-web-tools/01.png",
    clip: "/images/media-cloud-web-tools/demo.mp4",
  },
  {
    slug: "media-cloud-vitals",
    name: "Media Cloud Vitals",
    href: "/projects/media-cloud-vitals.html",
    poster: "/images/media-cloud-vitals/01.png",
    clip: "/images/media-cloud-vitals/demo.mp4",
  },
  {
    slug: "showrunner-digest",
    name: "ShowRunner Digest",
    href: "/projects/showrunner-digest.html",
    poster: "/images/showrunner-digest/01.png",
    clip: "/images/showrunner-digest/demo.mp4",
  },
];
