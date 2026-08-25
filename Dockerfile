FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY theater/package.json theater/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY theater/ theater/
RUN pnpm -C theater build

FROM nginx:alpine

# Copy the static portfolio files into nginx's webroot. .dockerignore keeps repo
# cruft (.git, docs, CNAME, *.md, etc.) out.
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Build inputs are part of the context (needed by the stage above) so they also
# land in the webroot via `COPY .` — drop them so they aren't served. Remove the
# theater source tree before replacing it with the production build.
RUN rm -f /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/package.json \
    /usr/share/nginx/html/pnpm-lock.yaml \
    /usr/share/nginx/html/pnpm-workspace.yaml \
    && rm -rf /usr/share/nginx/html/theater
COPY --from=build /app/theater/dist /usr/share/nginx/html/theater

EXPOSE 80
