# kube-prometheus-stack-metrics

A Rancher UI Extension (v3) that adds a metrics tab to Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs, and Pods. The extension displays CPU, memory, network, and disk metrics from [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Grafana dashboards with interactive charts.

## 📊 Workload Metrics for Rancher UI

> **Background:** Starting with Rancher 2.10, the built-in **rancher-monitoring** integration has been moved to [Rancher Prime](https://www.rancher.com/products/rancher-platform), a paid subscription service. This means the workload metrics tab that was previously available in the Rancher UI is no longer included in the free version.

This extension **restores the workload metrics dashboard** in the Rancher UI for users running the community [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack). It provides the same metrics visualization experience directly in the resource detail views—without requiring a Rancher Prime subscription.

### What this extension provides

| Feature | Description |
|---------|-------------|
| Workload Metrics Tab | Adds a metrics tab to Deployments, StatefulSets, Pods, etc. |
| CPU/Memory/Network/Disk | Displays key resource metrics with interactive Grafana charts |
| Grafana Integration | Embeds Grafana dashboards directly in the Rancher UI |
| Free & Open Source | No subscription required |

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Add Extension Repository](#add-extension-repository)
  - [Install Extension](#install-extension)
- [Usage](#usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Features

- 📊 **Grafana dashboard visualization** embedded directly in Rancher UI
- 📈 **Interactive charts** from Rancher monitoring dashboards
- ⏱️ **Configurable timeframes**: 5m, 15m, 1h, 6h, 24h
- 🔄 **Auto-refresh** with configurable intervals (Off, 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h, 2h, 1d)
- 🎨 **Clean kiosk mode** hides Grafana UI elements for seamless integration
- ✅ **Automatic discovery** of Grafana Ingress from kube-prometheus-stack
- 🔍 **Smart workload mapping** automatically finds ReplicaSets for Deployments

### Metrics Displayed

The extension uses Rancher monitoring dashboards to display:

| Metric | Description |
|--------|-------------|
| CPU | Core usage over time |
| Memory | Working set bytes |
| Network RX | Received bytes per second |
| Network TX | Transmitted bytes per second |
| Disk Read | Read bytes per second |
| Disk Write | Write bytes per second |

## Requirements

- **Rancher** >= 2.10.0
- **UI Extensions** >= 3.0.0 < 4.0.0
- **kube-prometheus-stack** installed in the target cluster with:
  - Grafana with Ingress enabled
  - Rancher monitoring dashboards imported (see [Configuration](#configuration))
- **Ingress controller** to expose Grafana (e.g., nginx-ingress, traefik)

## Installation

### Add Extension Repository

Add the extension repository URL to Rancher:

```
https://expertzentrale.github.io/kube-prometheus-stack-metrics
```

<img width="1869" height="1498" alt="Add extension repository" src="https://github.com/user-attachments/assets/93bcf299-81b6-4504-8d98-1f055c9a4be3" />

<img width="1868" height="1499" alt="Repository added" src="https://github.com/user-attachments/assets/21e66b80-2930-4239-a799-847f6e9ea064" />

### Install Extension

Navigate to Extensions and install the kube-prometheus-stack-metrics extension:

<img width="1831" height="1524" alt="Install extension" src="https://github.com/user-attachments/assets/930ef2f5-6838-45fb-b7c4-0f86954c59fe" />

## Usage

Once installed, a new **"expert Metrics"** tab appears in the detail view of:

- Deployments
- StatefulSets
- DaemonSets
- ReplicaSets
- Jobs
- CronJobs
- Pods

<img width="1333" height="1630" alt="Metrics tab displayed" src="https://github.com/user-attachments/assets/657ad523-e394-43b9-b641-8055899bba73" />

## Configuration

### kube-prometheus-stack Setup

This extension requires kube-prometheus-stack with Grafana and an Ingress to access it.

#### 1. Install kube-prometheus-stack with Ingress enabled

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install with Grafana Ingress enabled
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n prometheus --create-namespace \
  --set grafana.ingress.enabled=true \
  --set grafana.ingress.hosts[0]=grafana.your-domain.com
```

If kube-prometheus-stack is not installed, the extension will display a helpful message:

<img width="1074" height="730" alt="kube-prometheus-stack not installed" src="https://github.com/user-attachments/assets/36e89ed8-a65b-4fb6-989c-af7a31ce6f3a" />

#### 2. Import Rancher Monitoring Dashboards

**This extension requires Rancher monitoring dashboards to be imported into Grafana.**

The dashboards are available in the [Rancher charts repository](https://github.com/rancher/charts). You need to import them from:

```
charts/rancher-monitoring/{VERSION}/files/rancher
```

Where `{VERSION}` is the rancher-monitoring version (e.g., `105.1.4+up61.3.2-rancher.5`).

##### Required Dashboards

Import these dashboards from the folder above:

```bash
# Dashboards matching Rancher UI metrics tabs
cluster/rancher-cluster.json
cluster/rancher-cluster-nodes.json
nodes/rancher-node.json
nodes/rancher-node-detail.json
pods/rancher-pod.json
pods/rancher-pod-containers.json
workloads/rancher-workload.json
workloads/rancher-workload-pods.json
```

##### Quick Import Script

```bash
# Set your rancher-monitoring version
VERSION="105.1.4+up61.3.2-rancher.5"
BASE_URL="https://raw.githubusercontent.com/rancher/charts/main/charts/rancher-monitoring/${VERSION}/files/rancher"

# Download dashboards
DASHBOARDS=(
    "cluster/rancher-cluster.json"
    "cluster/rancher-cluster-nodes.json"
    "nodes/rancher-node.json"
    "nodes/rancher-node-detail.json"
    "pods/rancher-pod.json"
    "pods/rancher-pod-containers.json"
    "workloads/rancher-workload.json"
    "workloads/rancher-workload-pods.json"
)

mkdir -p rancher-dashboards
for dashboard in "${DASHBOARDS[@]}"; do
    echo "Downloading $dashboard..."
    curl -fsSL "${BASE_URL}/${dashboard}" -o "rancher-dashboards/$(basename $dashboard)"
done

echo "Dashboards downloaded to rancher-dashboards/"
echo "Import them manually via Grafana UI: Dashboards → Import → Upload JSON file"
```

**Important:** The extension specifically uses the `rancher-workload-pods` dashboard for displaying workload metrics.

### Grafana Discovery

The extension automatically discovers the Grafana Ingress by searching for:

1. **Helm labels**: `app.kubernetes.io/name=grafana` and `app.kubernetes.io/instance=kube-prometheus-stack`
2. **Name patterns**: Ingress named `kube-prometheus-stack-grafana` or `grafana`

Searched in these namespaces (in order):
- `prometheus`
- `monitoring`
- `cattle-monitoring-system`

### Custom Dashboards

If you prefer to create your own dashboard instead of using Rancher's monitoring dashboards, the extension requires:

#### Dashboard UID and URL Slug

The dashboard must have:
- **UID**: `rancher-workload-pods-1`
- **URL slug**: `rancher-workload-pods`

This results in the dashboard path: `/d/rancher-workload-pods-1/rancher-workload-pods`

#### Required Variables

Your custom dashboard must define these variables:

| Variable Name | Type | Description | Example Values |
|--------------|------|-------------|----------------|
| `namespace` | Query or Custom | Kubernetes namespace | `default`, `kube-system` |
| `kind` | Query or Custom | Resource kind | `ReplicaSet`, `StatefulSet`, `DaemonSet`, `Pod` |
| `workload` | Query or Custom | Workload name | `nginx-deployment-7d64f8d9c7` |

**Note:** For Deployments, the extension automatically:
1. Maps the kind to `ReplicaSet` (since Deployments manage ReplicaSets)
2. Resolves the actual ReplicaSet name (e.g., `deploy-name-6c6644b6b6`)

#### Example Variable Configuration

In Grafana dashboard JSON:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(kube_pod_info, namespace)",
        "current": {
          "text": "default",
          "value": "default"
        }
      },
      {
        "name": "kind",
        "type": "custom",
        "query": "ReplicaSet,StatefulSet,DaemonSet,Pod",
        "current": {
          "text": "ReplicaSet",
          "value": "ReplicaSet"
        }
      },
      {
        "name": "workload",
        "type": "query",
        "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
        "current": {
          "text": "nginx-7d64f8d9c7-abc123",
          "value": "nginx-7d64f8d9c7-abc123"
        }
      }
    ]
  }
}
```

#### Example Metrics Queries

Use these variables in your panel queries:

```promql
# CPU Usage
sum(rate(container_cpu_usage_seconds_total{namespace="$namespace",pod=~"$workload.*"}[5m]))

# Memory Usage
sum(container_memory_working_set_bytes{namespace="$namespace",pod=~"$workload.*"})

# Network Receive
sum(rate(container_network_receive_bytes_total{namespace="$namespace",pod=~"$workload.*"}[5m]))

# Network Transmit
sum(rate(container_network_transmit_bytes_total{namespace="$namespace",pod=~"$workload.*"}[5m]))
```

### Prometheus Namespace

If your kube-prometheus-stack is installed in a different namespace than `prometheus`, the extension will still discover it as long as the Ingress exists in one of the searched namespaces.

## Troubleshooting

### Metrics not showing

1. **Check Grafana Ingress exists**: The extension searches for Grafana Ingress in `prometheus`, `monitoring`, or `cattle-monitoring-system` namespaces
2. **Check Rancher dashboards are imported**: Verify that `rancher-workload-pods` dashboard exists in Grafana
3. **Check browser console**: Open developer tools and look for `[expert-metrics]` log messages showing:
   - Resource kind detection
   - ReplicaSet lookup (for Deployments)
   - Grafana URL being constructed
4. **Verify Grafana is accessible**: Try opening the Grafana link at the bottom of the metrics tab

### "Metrics Not Available" message

- kube-prometheus-stack Grafana Ingress is not found
- Check that Grafana Ingress is enabled and deployed
- Check the searched namespaces match your installation

### Empty charts / "No data"

- The dashboards may not be imported (see [Configuration](#configuration))
- The workload may not have any pods running
- Prometheus may not have scraped metrics for this workload yet (wait a few minutes)
- For Deployments: Check that at least one ReplicaSet exists
- Check that the dashboard variables (namespace, kind, workload) are correct in the debug line

### Wrong workload name for Deployments

The extension automatically finds the active ReplicaSet for Deployments (e.g., `deploy-name-6c6644b6b6`). Check the debug line to see if the workload name is being resolved correctly.

## Development

### Prerequisites

- Node.js >= 20 (tested with v20.17.0)
- Yarn (`npm install -g yarn`)
- A running Rancher instance (v2.10+)

### Setup

```bash
cd kube-prometheus-stack-metrics
yarn install
```

### Running the Development App

The development app gives you a full Rancher UI with your extension automatically loaded and hot-reloading enabled.

Point `API` to your Rancher backend URL and start the dev server:

```bash
API=https://your-rancher-instance.example.com yarn dev
```

Then open [https://127.0.0.1:8005](https://127.0.0.1:8005) in your browser. Log in with your Rancher credentials — the extension will be loaded automatically and you can see changes in real time as you edit the source.

> **Note:** You must be an admin user to test extensions in the Rancher UI.

### Developer Load (testing a built extension)

You can also build the extension and load it dynamically into any Rancher instance:

1. Build the extension package:

   ```bash
   yarn build-pkg kube-prometheus-stack-metrics
   ```

2. Serve the built package locally:

   ```bash
   yarn serve-pkgs
   ```

   This starts a local server on port 4500 and prints the URL for the built extension.

3. In Rancher, go to **user avatar → Preferences → Advanced Features** and enable **"Extension developer features"**.

4. Go to **Extensions → ⋮ → Developer Load** and enter the URL printed by `yarn serve-pkgs`, e.g.:

   ```
   https://127.0.0.1:8005/pkg/kube-prometheus-stack-metrics-0.2.0/kube-prometheus-stack-metrics-0.2.0.umd.min.js
   ```

5. Click **Load**. The extension will appear immediately. Check **"Persist extension by creating custom resource"** to keep it across reloads.

### Build

```bash
yarn build-pkg kube-prometheus-stack-metrics
```

### Project Structure

```
kube-prometheus-stack-metrics/
├── pkg/kube-prometheus-stack-metrics/
│   ├── index.ts                              # Extension entry point
│   ├── package.json                          # Extension metadata
│   └── components/
│       └── kube-prometheus-stack-graphs.vue  # Metrics component
├── package.json
└── README.md
```

## License

MIT






