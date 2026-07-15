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

# TODO replace below with a something more maintainable. For now this works (hopefully)
# The `_completion` field (populated by the extraction_rulesets in the
# rendered config) must be mapped as type `completion` for the search
# autocomplete suggester to work. Elasticsearch only applies this mapping on
# index creation, so the index template must exist before the crawler
# creates its output index. No curl/wget is available in this base image,
# so this uses the bundled JRuby instead.
echo "Ensuring Elasticsearch index template 'kiss-crawler-website' exists..."
ruby -rnet/http -ruri -rjson <<'RUBY'
endpoint = ENV.fetch('ELASTIC_ENDPOINT').chomp('/')
uri = URI("#{endpoint}/_index_template/kiss-crawler-website")

http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'

check = Net::HTTP::Get.new(uri)
check.basic_auth(ENV.fetch('ELASTIC_USERNAME'), ENV.fetch('ELASTIC_PASSWORD'))
response = http.request(check)

if response.code == '200'
  puts "Index template 'kiss-crawler-website' already exists."
elsif response.code == '404'
  puts "Index template 'kiss-crawler-website' not found, creating it..."
  put = Net::HTTP::Put.new(uri)
  put.basic_auth(ENV.fetch('ELASTIC_USERNAME'), ENV.fetch('ELASTIC_PASSWORD'))
  put['Content-Type'] = 'application/json'
  put.body = JSON.generate(
    index_patterns: ['search-*'],
    template: { mappings: { properties: { _completion: { type: 'completion' } } } },
  )
  create_response = http.request(put)
  unless create_response.code.start_with?('2')
    warn "ERROR: failed to create index template: #{create_response.code} #{create_response.body}"
    exit 1
  end
  puts "Index template 'kiss-crawler-website' created."
else
  warn "ERROR: unexpected response checking index template: #{response.code} #{response.body}"
  exit 1
end
RUBY

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
