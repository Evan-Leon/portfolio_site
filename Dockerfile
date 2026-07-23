FROM nginx:alpine

# Static site — no build step. Copy the site files straight into nginx's
# webroot. .dockerignore keeps repo cruft (.git, docs, CNAME, *.md, etc.) out.
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# nginx.conf is part of the build context (needed for the COPY above) so it also
# lands in the webroot via `COPY .` — drop it so it isn't served.
RUN rm -f /usr/share/nginx/html/nginx.conf

EXPOSE 80
