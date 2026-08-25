---
name: rebuild-restart
description: Use after changing portfolio_site's site files (index.html, projects/*.html, assets/, images/, theater/**, 404.html), the Dockerfile, nginx.conf, or docker-compose.yml — rebuild the nginx image and recreate the container on evo-net so the change is served.
---

# Rebuild and Restart Portfolio Site

## When to use

This site is a plain static site (HTML/CSS/JS) baked into an nginx image at build
time — there are **no bind mounts and no hot reload**. Every change to anything the
image contains needs a rebuild:

- Site content: `index.html`, `projects/*.html`, `404.html`, `assets/**`, `images/**`, `theater/**`
- Serving config: `Dockerfile`, `nginx.conf`
- `docker-compose.yml`

The theater is compiled during the image build. A theater type error therefore
fails `docker compose build`, and every theater change needs this rebuild before
nginx can serve it.

## Commands

Run from the repo root (`/home/evan/EVOsystem/portfolio_site`):

```bash
docker compose build && docker compose up -d --force-recreate
```

`docker compose build` bakes the current files into `ghcr.io/evan-leon/portfolio-site:latest`;
`up -d --force-recreate` swaps the running container onto the freshly built image.

> **Use `--force-recreate`.** Because `build:` and `image:` share the same `:latest` tag,
> plain `docker compose up -d` after a build sometimes decides "nothing changed" and keeps
> serving the **old** image (observed during onboarding: a rebuild's change didn't appear
> until `--force-recreate`). `docker compose restart` is even worse — it never picks up a
> new image, it just restarts the existing container.
>
> After `--force-recreate` there's a brief (~1-2s) window where Traefik hasn't re-registered
> the new container yet and returns its own `404 page not found` (plain text, not the site's
> styled 404.html). Poll `/` until it returns 200 rather than concluding failure.

## Verify it worked

nginx serves immediately — no startup delay to wait out.

```bash
docker compose ps          # portfolio_site-portfolio-site-1 should be "Up"

# Core paths (pass the vhost explicitly — no browser needed)
for p in "/" "/projects/classic-golf.html" "/assets/css/styles.css" "/images/favicon.png"; do
  printf "%-34s %s\n" "$p" \
    "$(curl -s -o /dev/null -w '%{http_code}' -H "Host: portfolio-site.localhost" http://localhost$p)"
done
# expect 200 200 200 200

# Unknown path serves the site's own 404.html
curl -s -H "Host: portfolio-site.localhost" http://localhost/nope | grep -o "<title>[^<]*</title>"
# expect: <title>404 — Lost in Space | Evan Leon</title>

# Routers registered with Traefik
curl -s -H "Host: traefik.localhost" http://localhost/api/http/routers \
  | grep -o '"name":"portfolio-site[^"]*"'
# expect portfolio-site-web@docker and portfolio-site-secure@docker
```

## Proving the rebuild path (not just an edit)

Because nothing is bind-mounted, editing a file changes nothing in the running
container until you rebuild. To prove the rebuild actually took: add a marker to a
served file, rebuild, and confirm it appears.

```bash
# before
curl -s -H "Host: portfolio-site.localhost" http://localhost/ | grep -c REBUILD_TEST   # 0
echo '<!-- REBUILD_TEST -->' >> index.html
docker compose build && docker compose up -d --force-recreate
curl -s -H "Host: portfolio-site.localhost" http://localhost/ | grep -c REBUILD_TEST   # 1
# revert
git checkout index.html && docker compose build && docker compose up -d --force-recreate
```

## Notes

- The container has no `image:` pull on the droplet path here — locally you always
  `build`. The `image:` field in compose is for the (future, not-yet-cutover) droplet,
  where `docker compose pull` would use the ghcr.io image instead of building.
- `.dockerignore` keeps repo cruft (`.git`, `docs/`, `CNAME`, `*.md`, `.env`) out of the
  nginx webroot. If you add a new top-level asset dir, make sure it isn't ignored.
