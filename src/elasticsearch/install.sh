#!/bin/bash
set -euo pipefail

# Variables injected by CDK (replaced before upload)
ES_VERSION="${ES_VERSION}"
SECRET_ID="${SECRET_ID}"
AWS_REGION="${AWS_REGION}"

# Install AWS CLI
dnf install -y aws-cli

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

# Set JVM heap
echo "-Xms2g" > /etc/elasticsearch/jvm.options.d/heap.options
echo "-Xmx2g" >> /etc/elasticsearch/jvm.options.d/heap.options

# Start Elasticsearch
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

# Wait for Elasticsearch to become available
echo "Waiting for Elasticsearch to start..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:9200 > /dev/null 2>&1; then
    echo "Elasticsearch is up after ${i} seconds"
    break
  fi
  sleep 1
done

# Fetch password from Secrets Manager and set it as the elastic user password
ES_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text)

echo "y" | /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i -s <<< "$ES_PASSWORD"

# Activate trial license for Enterprise features
sleep 5
curl -sf -X POST "http://localhost:9200/_license/start_trial?acknowledge=true" \
  -u "elastic:${ES_PASSWORD}" \
  -H "Content-Type: application/json"

echo "Elasticsearch ${ES_VERSION} installation complete"
