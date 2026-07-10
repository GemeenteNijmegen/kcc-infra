# 1. load the elasticsearch password
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text)

# 2. Check if the "enterprise_search" user exists
curl -k -u elastic:$ES_PASSWORD https://localhost:9200/_security/user/enterprise_search

export ENT_PASSWORD=<password>

# 3. Reset the password (TODO insert password here)
curl -k -u elastic:$ES_PASSWORD -X POST \
  https://localhost:9200/_security/user/enterprise_search/_password \
  -H "Content-Type: application/json" \
  -d '{"password":"$ENT_PASSWORD"}'

# 4. List enterprise search API keys (TODO insert password here)
curl -k -u enterprise_search:$ENT_PASSWORD https://localhost:3002/api/as/v1/credentials

# 5. (optional) create a new API key
curl -k -u enterprise_search:$ENT_PASSWORD -X POST https://localhost:3002/api/as/v1/credentials \
  -H "Content-Type: application/json" \
  -d '{"name":"my-key","type":"private"}'