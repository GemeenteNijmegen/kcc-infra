#!/bin/bash
set -euo pipefail

# Variables injected by CDK (exported before this script runs)
ES_VERSION="${ES_VERSION}"
SECRET_ID="${SECRET_ID}"
AWS_REGION="${AWS_REGION}"

# System tuning for Elasticsearch
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# Add Elasticsearch repository
rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
cat > /etc/yum.repos.d/elasticsearch.repo << 'REPO'
[elasticsearch]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
REPO

# Install Elasticsearch
dnf install -y "elasticsearch-${ES_VERSION}"

# Stop elasticsearch if it was auto-started during install
systemctl stop elasticsearch 2>/dev/null || true

# Configure Elasticsearch for single-node (test) usage
cat > /etc/elasticsearch/elasticsearch.yml << 'ESCONFIG'
cluster.name: kcc-elasticsearch
node.name: es-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
xpack.security.enabled: true
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
ESCONFIG

# Remove auto-generated security artifacts and data from install
rm -rf /etc/elasticsearch/certs
rm -rf /var/lib/elasticsearch/*
rm -f /etc/elasticsearch/elasticsearch.keystore

# Create fresh keystore and set bootstrap password BEFORE first start
/usr/share/elasticsearch/bin/elasticsearch-keystore create
# Fetch password from Secrets Manager and set as bootstrap password
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text)
echo "${ES_PASSWORD}" | /usr/share/elasticsearch/bin/elasticsearch-keystore add -xf "bootstrap.password"

# Set JVM heap
echo "-Xms3g" > /etc/elasticsearch/jvm.options.d/heap.options
echo "-Xmx3g" >> /etc/elasticsearch/jvm.options.d/heap.options

# Ensure correct ownership
chown -R elasticsearch:elasticsearch /etc/elasticsearch
chown -R elasticsearch:elasticsearch /var/lib/elasticsearch

# Start Elasticsearch
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

# Wait for Elasticsearch to become available with our password
echo "Waiting for Elasticsearch to start..."
for i in $(seq 1 90); do
  if curl -sf -u "elastic:${ES_PASSWORD}" http://localhost:9200 > /dev/null 2>&1; then
    echo "Elasticsearch is up after ${i} seconds"
    break
  fi
  sleep 1
done

# Activate trial license for Enterprise features
curl -sf -X POST "http://localhost:9200/_license/start_trial?acknowledge=true" \
  -u "elastic:${ES_PASSWORD}" \
  -H "Content-Type: application/json"

# Install Enterprise Search
dnf install -y "enterprise-search-${ES_VERSION}"

# Enterprise Search needs Java in PATH. Use the JDK bundled with Elasticsearch
ln -sf /usr/share/elasticsearch/jdk/bin/java /usr/local/bin/java

# Generate encryption key for Enterprise Search
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Configure Enterprise Search
cat > /usr/share/enterprise-search/config/enterprise-search.yml << ENTCONFIG
secret_management.encryption_keys: [${ENCRYPTION_KEY}]
elasticsearch.host: http://127.0.0.1:9200
elasticsearch.username: elastic
elasticsearch.password: ${ES_PASSWORD}
elasticsearch.ssl.enabled: false
ent_search.external_url: http://localhost:3002
ent_search.listen_host: 0.0.0.0
ent_search.listen_port: 3002
kibana.host: http://localhost:5601
allow_es_settings_modification: true
ENTCONFIG

# Cap Enterprise Search JVM memory (otherwise it's unconstrained and can
# compete with Elasticsearch for RAM on the same host)
mkdir -p /etc/systemd/system/enterprise-search.service.d
cat > /etc/systemd/system/enterprise-search.service.d/override.conf << 'ENTOVERRIDE'
[Service]
Environment=JAVA_OPTS=-Xms3g -Xmx3g
ENTOVERRIDE

# Start Enterprise Search
systemctl daemon-reload
systemctl enable enterprise-search
systemctl start enterprise-search

echo "Elasticsearch ${ES_VERSION} + Enterprise Search installation complete"
