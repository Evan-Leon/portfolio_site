#!/usr/bin/env bash
#
# Production-parity smoke: does nginx serve the theater's URLs the way
# `vite preview` does?
#
# WHY THIS IS NOT A PLAYWRIGHT SPEC
# ---------------------------------
# The Playwright suite runs against `vite preview`, deliberately — it is fast,
# it needs no Docker, and it is what a contributor can run. But `vite preview`
# has an SPA fallback: it answers *any* unmatched path with the app's
# index.html and a 200. nginx does not, and must not — the portfolio site is a
# multi-page static site, so `nginx.conf` uses `try_files … =404` with no
# catch-all. That difference is invisible to every browser test: a URL that is
# quietly 200-with-the-wrong-body under preview is a hard 404 in production, and
# the suite that "covers the theater" would be green either way.
#
# So the two halves are split on purpose. Playwright asserts what the page
# *does*; this asserts what the server *returns*. Verified here and nowhere
# else: `/theater/nope` is 404 under nginx and 200 under `vite preview` — run
# both and you can watch them disagree.
#
# Usage:
#   docker compose build && docker compose up -d --force-recreate
#   bash theater/e2e/nginx-parity.sh                 # http://portfolio-site.localhost
#   BASE_URL=https://portfolio-site.example bash theater/e2e/nginx-parity.sh
#
# Needs the local Traefik on `evo-net` to resolve `portfolio-site.localhost`,
# which is what `docker compose up` puts the container behind.
set -uo pipefail

BASE_URL="${BASE_URL:-http://portfolio-site.localhost}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_INDEX="${REPO_ROOT}/theater/dist/index.html"

failures=0

# Report one check. Every check prints a line whether it passed or not, so a
# run that silently skipped a case is visible rather than indistinguishable
# from a clean one.
report() {
    local label="$1" expected="$2" actual="$3"

    if [ "$expected" = "$actual" ]; then
        printf 'OK    %-46s %s\n' "$label" "$actual"
    else
        printf 'FAIL  %-46s expected %s, got %s\n' "$label" "$expected" "$actual"
        failures=$((failures + 1))
    fi
}

# Status code for a path, without following redirects — the redirect itself is
# one of the things under test.
status_of() {
    curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}$1"
}

# `<status> <location>` for a path, for the redirect check.
redirect_of() {
    curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "${BASE_URL}$1"
}

# The `Content-Type` header, lowercased, parameters stripped.
content_type_of() {
    curl -s -o /dev/null -D - "${BASE_URL}$1" \
        | tr -d '\r' \
        | awk 'tolower($1) == "content-type:" { print tolower($2) }' \
        | cut -d';' -f1 \
        | tail -n 1
}

echo "nginx parity against ${BASE_URL}"

# The theater itself, and the extensionless form a visitor types. `try_files`
# resolves `/theater` through its `$uri/` arm, which is a 301 to the directory
# — the one case where nginx is *supposed* to redirect rather than 404.
report "/theater/ serves the app" 200 "$(status_of /theater/)"
report "/theater redirects to /theater/" \
    "301 ${BASE_URL}/theater/" "$(redirect_of /theater)"

# The whole reason this file exists. Under `vite preview` this is 200.
report "/theater/nope is a real 404" 404 "$(status_of /theater/nope)"

# A hashed bundle, read out of the build rather than guessed: the filename
# changes every build, so a hardcoded one would 404 forever or — worse — a
# check written against a path pattern would pass on a server that answered
# everything with index.html.
if [ ! -f "${DIST_INDEX}" ]; then
    printf 'FAIL  %-46s no %s — run `pnpm -C theater build`\n' \
        "/theater/assets/*.js is served" "${DIST_INDEX#"${REPO_ROOT}/"}"
    failures=$((failures + 1))
else
    bundle="$(grep -o '/theater/assets/[^"]*\.js' "${DIST_INDEX}" | head -n 1)"

    if [ -z "${bundle}" ]; then
        printf 'FAIL  %-46s no hashed .js referenced by %s\n' \
            "/theater/assets/*.js is served" "${DIST_INDEX#"${REPO_ROOT}/"}"
        failures=$((failures + 1))
    else
        report "${bundle} is served" 200 "$(status_of "${bundle}")"

        # `text/javascript` or `application/javascript` depending on the nginx
        # build's mime.types; both are correct, and neither is `text/html` —
        # which is what a fallback that served index.html would return, with a
        # 200 beside it.
        js_type="$(content_type_of "${bundle}")"
        case "${js_type}" in
            *javascript*) report "${bundle} is JavaScript" "${js_type}" "${js_type}" ;;
            *) report "${bundle} is JavaScript" "*javascript*" "${js_type:-<none>}" ;;
        esac
    fi
fi

# The site's own files, one level above the theater. The lot's posters and its
# links are site-absolute (see `src/projects.ts`), so a theater served correctly
# in front of a site that is not shows eight dark screens and eight dead links.
report "/images/nom-noms/01.png is served" 200 \
    "$(status_of /images/nom-noms/01.png)"
report "/images/nom-noms/01.png is a PNG" image/png \
    "$(content_type_of /images/nom-noms/01.png)"
report "/projects/nom-noms.html is served" 200 \
    "$(status_of /projects/nom-noms.html)"

if [ "${failures}" -ne 0 ]; then
    echo "${failures} check(s) failed"
    exit 1
fi

echo "all checks passed"
