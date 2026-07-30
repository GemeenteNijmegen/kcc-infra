#!/bin/sh
# Renders /app/config/crawler.yml.template into a real config using env vars,
# then runs a single Open Crawler crawl. Intended for a scheduled ECS task
# (e.g. triggered by EventBridge Scheduler) — this process exits when the
# crawl finishes, it does not stay running.

set -eu

TEMPLATE="/home/app/config/crawler.template.yml"
RENDERED="/tmp/crawler.yml"

required_vars="ELASTIC_ENDPOINT ELASTIC_USERNAME ELASTIC_PASSWORD OUTPUT_INDEX TARGET_URL"

missing=""
for var in $required_vars; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    missing="$missing $var"
  fi
done

if [ -n "$missing" ]; then
  echo "ERROR: missing required environment variable(s):$missing" >&2
  exit 1
fi

# Ensures the index template (for the `_completion` autocomplete field) and
# the title-cleanup ingest pipeline exist before the crawl starts, since
# Elasticsearch only applies index templates at index-creation time and
# crawler.template.yml references the pipeline by name.
echo "Bootstrapping Elasticsearch resources (index template + ingest pipeline)..."
python3 /home/app/bootstrap_elasticsearch.py

sed \
  -e "s|\${OUTPUT_INDEX}|${OUTPUT_INDEX}|g" \
  -e "s|\${TARGET_URL}|${TARGET_URL}|g" \
  -e "s|\${ELASTIC_ENDPOINT}|${ELASTIC_ENDPOINT}|g" \
  -e "s|\${ELASTIC_USERNAME}|${ELASTIC_USERNAME}|g" \
  -e "s|\${ELASTIC_PASSWORD}|${ELASTIC_PASSWORD}|g" \
  "$TEMPLATE" > "$RENDERED"

echo "Rendered crawler config (password redacted):"
sed -E 's/(password:).*/\1 ***REDACTED***/' "$RENDERED"

echo "Starting crawl of ${TARGET_URL} -> index ${OUTPUT_INDEX} on ${ELASTIC_ENDPOINT}"

exec bin/crawler crawl "$RENDERED"
