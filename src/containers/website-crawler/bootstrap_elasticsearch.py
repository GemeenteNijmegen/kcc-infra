#!/usr/bin/env python3
# Ensures the Elasticsearch resources a crawl depends on exist before
# bin/crawler runs: the `search-*` index template (for the `_completion`
# mapping used by the autocomplete suggester) and the ingest pipeline that
# strips the site's title suffix. Both are created on first run only —
# Elasticsearch is the source of truth, this script just fills gaps.
#
# stdlib-only (urllib) so the container doesn't need a package manager step
# beyond installing python3 itself.

import base64
import json
import os
import sys
import urllib.error
import urllib.request

INDEX_TEMPLATE_NAME = "kiss-crawler-website"
PIPELINE_NAME = "kiss-crawler-website-pipeline"
TITLE_SUFFIX_PATTERN = r" - Gemeente Nijmegen$"


def es_request(method, path, body=None):
    endpoint = os.environ["ELASTIC_ENDPOINT"].rstrip("/")
    request = urllib.request.Request(
        f"{endpoint}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
    )
    if body is not None:
        request.add_header("Content-Type", "application/json")
    credentials = f"{os.environ['ELASTIC_USERNAME']}:{os.environ['ELASTIC_PASSWORD']}"
    request.add_header("Authorization", f"Basic {base64.b64encode(credentials.encode()).decode()}")
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def ensure_index_template():
    status, body = es_request("GET", f"/_index_template/{INDEX_TEMPLATE_NAME}")
    if status == 200:
        print(f"Index template '{INDEX_TEMPLATE_NAME}' already exists.")
        return
    if status != 404:
        sys.exit(f"ERROR: failed to check index template: {status} {body}")

    print(f"Index template '{INDEX_TEMPLATE_NAME}' not found, creating it...")
    template = {
        "index_patterns": ["search-*"],
        "template": {"mappings": {"properties": {"_completion": {"type": "completion"}}}},
    }
    status, body = es_request("PUT", f"/_index_template/{INDEX_TEMPLATE_NAME}", template)
    if status // 100 != 2:
        sys.exit(f"ERROR: failed to create index template: {status} {body}")
    print(f"Index template '{INDEX_TEMPLATE_NAME}' created.")


def ensure_ingest_pipeline():
    status, body = es_request("GET", f"/_ingest/pipeline/{PIPELINE_NAME}")
    if status == 200:
        print(f"Ingest pipeline '{PIPELINE_NAME}' already exists.")
        return
    if status != 404:
        sys.exit(f"ERROR: failed to check ingest pipeline: {status} {body}")

    print(f"Ingest pipeline '{PIPELINE_NAME}' not found, creating it...")
    # Strip the site's title suffix first, then defer to the default Open
    # Crawler pipeline so whitespace normalization and binary content
    # extraction (see crawler.template.yml binary_content_extraction_*)
    # keep working as before.
    pipeline = {
        "description": "Strips the ' - Gemeente Nijmegen' title suffix, then runs the default crawler ingestion pipeline.",
        "processors": [
            {
                "gsub": {
                    "field": "title",
                    "pattern": TITLE_SUFFIX_PATTERN,
                    "replacement": "",
                    "ignore_missing": True,
                }
            },
            {"pipeline": {"name": "ent-search-generic-ingestion"}},
        ],
    }
    status, body = es_request("PUT", f"/_ingest/pipeline/{PIPELINE_NAME}", pipeline)
    if status // 100 != 2:
        sys.exit(f"ERROR: failed to create ingest pipeline: {status} {body}")
    print(f"Ingest pipeline '{PIPELINE_NAME}' created.")


def main():
    ensure_index_template()
    ensure_ingest_pipeline()


if __name__ == "__main__":
    main()
