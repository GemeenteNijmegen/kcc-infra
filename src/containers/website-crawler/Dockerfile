# Wraps the official Elastic Open Crawler image with a config template and
# an entrypoint that renders it from environment variables at runtime.
# Intended to be run as a one-shot task (e.g. a scheduled ECS task), not a service.

FROM docker.elastic.co/integrations/crawler:1.0.0

WORKDIR /app

# Base image runs as non-root user "java" (uid/gid 1000). COPY defaults to
# root:root ownership regardless of the active USER, so without --chown the
# following chmod would fail with "Operation not permitted".
COPY --chown=java:java crawler.template.yml /app/config/crawler.template.yml
COPY --chown=java:java entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]