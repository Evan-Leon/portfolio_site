---
name: rebuild-restart
description: Use after changing site files (index.html, projects/*.html, assets/, images/, 404.html), Dockerfile, nginx.conf, or docker-compose.yml — rebuild the nginx image and recreate the container so the change is served.
---

Read `../../../.claude/skills/rebuild-restart/SKILL.md` in full; it is the
canonical source of truth. Follow its `docker compose build && docker compose
up -d --force-recreate` rebuild flow and its curl-based verification steps.
Run the commands from the repo root. Resolve any files it names from there.
