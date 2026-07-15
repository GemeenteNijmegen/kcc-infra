# Wraps the official Elastic Open Crawler image with a config template and
# an entrypoint that renders it from environment variables at runtime.
# Intended to be run as a one-shot task (e.g. a scheduled ECS task), not a service.

FROM docker.elastic.co/integrations/crawler:1.0.0

WORKDIR /app

COPY crawler.template.yml /app/config/crawler.template.yml
COPY entrypoint.sh /app/entrypoint.sh

# Base image may run as a non-root user by default; this only affects files
# we're adding here. If you hit a permission error running the container,
# check which user the base image's Dockerfile sets and chown accordingly.
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]