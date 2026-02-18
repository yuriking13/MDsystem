#!/bin/bash
# Setup Prometheus and Grafana for MDsystem monitoring
# Run as root: sudo bash setup-monitoring.sh

set -e

if [ -z "${METRICS_SCRAPE_TOKEN:-}" ]; then
  echo "ERROR: METRICS_SCRAPE_TOKEN is required for authenticated /metrics scraping"
  echo "Usage: METRICS_SCRAPE_TOKEN='<strong-random-token>' sudo -E bash setup-monitoring.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Installing Prometheus ==="
apt-get update
apt-get install -y prometheus prometheus-node-exporter

echo "=== Installing Grafana ==="
apt-get install -y apt-transport-https software-properties-common wget
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update
apt-get install -y grafana

echo "=== Configuring Prometheus ==="
# Backup original config
cp /etc/prometheus/prometheus.yml /etc/prometheus/prometheus.yml.bak

# Create bearer token file for Prometheus -> API /metrics auth
install -m 600 /dev/null /etc/prometheus/mdsystem-metrics.token
printf "%s" "$METRICS_SCRAPE_TOKEN" > /etc/prometheus/mdsystem-metrics.token
chown prometheus:prometheus /etc/prometheus/mdsystem-metrics.token

# Install alert rules
install -d -m 755 /etc/prometheus/rules
cp "$SCRIPT_DIR/alerts/mdsystem-alerts.yml" /etc/prometheus/rules/mdsystem-alerts.yml
chown prometheus:prometheus /etc/prometheus/rules/mdsystem-alerts.yml

# Copy MDsystem config
cat > /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/mdsystem-alerts.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'mdsystem-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    bearer_token_file: '/etc/prometheus/mdsystem-metrics.token'
    scrape_interval: 10s

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
EOF

echo "=== Starting services ==="
systemctl daemon-reload
systemctl enable prometheus
systemctl enable grafana-server
systemctl restart prometheus
systemctl restart grafana-server

echo "=== Waiting for Grafana to start ==="
sleep 5

echo "=== Adding Prometheus datasource to Grafana ==="
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Prometheus","type":"prometheus","url":"http://localhost:9090","access":"proxy","isDefault":true}' \
  http://admin:admin@localhost:3001/api/datasources 2>/dev/null || echo "Datasource may already exist"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Metrics token file: /etc/prometheus/mdsystem-metrics.token"
echo "Ensure API has matching METRICS_SCRAPE_TOKEN in systemd env."
echo ""
echo "Prometheus: http://your-server:9090"
echo "Grafana:    http://your-server:3001 (login: admin/admin)"
echo "Metrics:    http://your-server:3000/metrics"
echo ""
echo "To import the dashboard:"
echo "1. Open Grafana -> Dashboards -> Import"
echo "2. Upload /root/MDsystem/deploy/grafana-dashboard.json"
echo ""
