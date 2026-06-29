#!/usr/bin/env bash
# Converts an AWS Secret Access Key to an Amazon SES SMTP password.
# Based on the algorithm documented at:
# https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html

set -euo pipefail

# ── Constants (must not be changed) ──────────────────────────────────────────
DATE="11111111"
SERVICE="ses"
MESSAGE="SendRawEmail"
TERMINAL="aws4_request"
VERSION="\x04"

VALID_REGIONS=(
  "us-east-2"
  "us-east-1"
  "us-west-2"
  "ap-south-1"
  "ap-northeast-2"
  "ap-southeast-1"
  "ap-southeast-2"
  "ap-northeast-1"
  "ca-central-1"
  "eu-central-1"
  "eu-west-1"
  "eu-west-2"
  "eu-south-1"
  "eu-north-1"
  "sa-east-1"
  "us-gov-west-1"
  "us-gov-east-1"
)

# ── Helpers ───────────────────────────────────────────────────────────────────
hmac_sha256_hex() {
  # hmac_sha256_hex <key-hex> <message>
  local key_hex="$1"
  local msg="$2"
  printf '%s' "$msg" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:${key_hex}" | awk '{print $2}'
}

str_to_hex() {
  printf '%s' "$1" | xxd -p | tr -d '\n'
}

is_valid_region() {
  local r="$1"
  for valid in "${VALID_REGIONS[@]}"; do
    [[ "$r" == "$valid" ]] && return 0
  done
  return 1
}

# ── Input ─────────────────────────────────────────────────────────────────────
echo "Amazon SES SMTP Password Generator"
echo "==================================="
echo ""

read -rp "AWS Region (e.g. us-east-1): " REGION

if ! is_valid_region "$REGION"; then
  echo ""
  echo "Error: '${REGION}' is not a supported SES SMTP region."
  echo "Valid regions:"
  printf '  %s\n' "${VALID_REGIONS[@]}"
  exit 1
fi

echo ""
read -rsp "AWS Secret Access Key (input hidden): " SECRET_KEY
echo ""
echo ""

if [[ -z "$SECRET_KEY" ]]; then
  echo "Error: Secret Access Key cannot be empty."
  exit 1
fi

# ── Key derivation ────────────────────────────────────────────────────────────
# Step 1: kDate = HMAC-SHA256("AWS4" + secret, "11111111")
KEY_HEX=$(str_to_hex "AWS4${SECRET_KEY}")
K_DATE=$(hmac_sha256_hex "$KEY_HEX" "$DATE")

# Step 2: kRegion = HMAC-SHA256(kDate, region)
K_REGION=$(hmac_sha256_hex "$K_DATE" "$REGION")

# Step 3: kService = HMAC-SHA256(kRegion, "ses")
K_SERVICE=$(hmac_sha256_hex "$K_REGION" "$SERVICE")

# Step 4: kTerminal = HMAC-SHA256(kService, "aws4_request")
K_TERMINAL=$(hmac_sha256_hex "$K_SERVICE" "$TERMINAL")

# Step 5: kMessage = HMAC-SHA256(kTerminal, "SendRawEmail")
K_MESSAGE=$(hmac_sha256_hex "$K_TERMINAL" "$MESSAGE")

# Step 6: Prepend version byte (0x04) and Base64-encode
SMTP_PASSWORD=$(
  printf "${VERSION}" | cat - <(printf '%s' "$K_MESSAGE" | xxd -r -p) | base64 | tr -d '\n'
)

# ── Output ────────────────────────────────────────────────────────────────────
echo "Your SES SMTP credentials for region '${REGION}':"
echo ""
echo "  SMTP Username : (your AWS Access Key ID)"
echo "  SMTP Password : ${SMTP_PASSWORD}"
echo ""
echo "SMTP Endpoint  : email-smtp.${REGION}.amazonaws.com"
echo "Port           : 587 (STARTTLS) or 465 (TLS)"
echo ""
echo "Note: Your SMTP Username is the AWS Access Key ID that belongs to this"
echo "Secret Access Key. The password above is valid only for region '${REGION}'."