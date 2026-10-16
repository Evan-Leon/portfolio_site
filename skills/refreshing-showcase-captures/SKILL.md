---
name: refreshing-showcase-captures
description: "Finds the showcase apps whose UI changed since their portfolio clip was captured, then re-records each one's demo clip and screenshots through the portfolio-showcase meta-prompt, one app at a time. Use when Evan asks to re-record, re-capture or refresh the portfolio's clips or screenshots after app UI work, or to check which captures are stale."
---

# Refreshing showcase captures

The per-app capture recipe already exists and is not repeated here:
`/home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase.md`
(read it with the Read tool, in two pages; `cat` truncates it). This skill adds
the two things it lacks: deciding **which** apps are stale, and running the
recipe as a **refresh** (clip and screenshots both replaced) over several apps.

## 1. Find the stale captures

```bash
python3 scripts/showcase/stale_captures.py            # --threshold N, --subjects K
```

It pairs each app repo with its portfolio slug from the meta-prompt's Coverage
table, takes the capture time from the git history of `images/<slug>/demo.mp4`,
and counts UI-source churn in the app repo since then (markup, components and
styles; tests, `docs/` and archives excluded). `STALE?` means at least 300 UI
lines changed. It is a candidate list, not a verdict:

- Read the printed commit subjects. A redesign, a new screen or a reworked
  layout on a view the clip shows is stale. iOS home-screen tags, a self-hosted
  font, an app icon, a logout button or a test-only change is not.
- An app Evan names as unchanged is unchanged; note it if the script disagrees.
- The remote projects (Media Cloud Web Tools, Media Cloud Vitals, ShowRunner
  Digest, spead-read) are not checked. Re-record one only on request.

Then check that each stale app is **serving** its new UI. First grep its
compose file for `./frontend:/app`. Many frontends (app-dash, chud, Prompt-heus,
mind-palace, chunk-norris) bind-mount the source into a Vite dev server. For
those the image date means nothing: fetch a module that only the newest UI work
has (`curl -s http://<app>.localhost/src/<file>.tsx | grep <new identifier>`). A
404 from `/` on a container that is up means the mount came up empty
(`docker compose exec frontend ls /app` shows only `node_modules`; mind-palace,
2026-10-16). `docker compose up -d --force-recreate frontend` restores it. For a
prebuilt frontend (logson, voice-trainer), compare the image date with the
newest UI commit:

```bash
cd /home/evan/EVOsystem/<repo> && docker compose ps --format '{{.Service}} {{.Image}}' \
  | while read s img; do echo "$s $(docker image inspect $img --format '{{.Created}}')"; done
git -C /home/evan/EVOsystem/<repo> log -1 --format=%cI -- '*.tsx' '*.jsx' '*.svelte' '*.css'
```

A frontend image older than the newest UI commit means a re-record films the
old UI. Redeploying an app is Evan's call: put it to him with the list.

## 2. Agree the list and the flows with Evan, once

Put to Evan in **one** question: the stale apps (with one line each on what
changed), the apps whose deployed build is behind, and a proposed demo flow per
app. Start each flow from the app's Coverage note in the meta-prompt (what the
last capture walked). Where the UI change touches those beats, run the
meta-prompt's STEP 0.5 recon first, so the proposal names real views. Ask also
whether the screenshot count may change. The default is the same count, so the
card and page markup stay untouched.

## 3. Re-record, one app at a time

Runs are **sequential**. Every run rebuilds the same portfolio_site container
and commits in the same tree. Start each run only when
`git -C /home/evan/EVOsystem/portfolio_site status --short` is empty.

For each app, fill the meta-prompt's Section A (slug, URL, auth and GitHub come
from the Coverage row and the disk) with the agreed `{{DEMO_FLOW}}`, and add
this line above it:

> This is a **refresh** of an existing capture: clip-only mode, plus Evan's
> explicit screenshot refresh. STEP 4 copies `0?.png` over the existing set at
> the same count, as well as `demo.mp4`.

Run it either way:
- **A fresh session in the app repo**: the meta-prompt's default.
- **An Opus sub-agent from portfolio_site**: this is how the 2026-09-09 remote runs were done. The agent does
  STEPs 0–3 (capture, contact sheet, teardown) and returns the media path and
  its report. This session reviews the contact sheet, then does STEPs 4–8. Pass
  `model: "opus"` explicitly; never Fable, never a fork.

What changes from a first capture:
- **Screenshots are replaced at the same count**, `01.png` stays the poster,
  and `index.html` and `projects/<slug>.html` are not edited. If Evan approved a
  different count, sync both swipers with the `adding-project-screenshots` skill.
- **Page copy is not rewritten.** If the redesign makes the page's
  feature cards or tech pills wrong, report it; rewriting them is a separate request.
- Commit message: `feat(dt9): <slug> re-capture (clip + screenshots)`.

## 4. Data safety (the meta-prompt's rules, restated as the gotchas)

- No app has a committed `scripts/showcase_demo.*` seed yet
  (`docs/planning/showcase-demo-seeds/brief.md`). A flow that needs seeded data
  goes into a throwaway store, never the real database, and the run writes and
  commits its seed in the app repo. If the app cannot be pointed at a throwaway
  store without a code change, STOP and ask Evan.
- A flow that only reads (or writes and reverts against a baseline) needs no
  store. The Coverage note says which kind the last capture was.
- Read the contact sheet, not only the screenshots, for personal data.

## 5. Record

Per app: the meta-prompt's STEP 8 (Coverage note gains `re-captured <date>
(<commit>)`, a runlog line, a session log in the app repo when the run started
there). After the batch, write this session's log in portfolio_site with the
`writing-session-logs` skill. Do not push: a push to `main` deploys, and that is Evan's call.
