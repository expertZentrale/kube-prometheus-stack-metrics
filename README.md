# kube-prometheus-stack-metrics

A Rancher UI Extension (v3) that adds a metrics tab to Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs, and Pods. The extension displays CPU, memory, network, and disk metrics from [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) with interactive charts.

## 🔄 Replaces Rancher Monitoring

> **Note:** Starting with Rancher 2.10, the built-in **rancher-monitoring** integration has been moved to [Rancher Prime](https://www.rancher.com/products/rancher-platform), which is a paid subscription service.

This extension provides a **free, open-source alternative** for users who want workload metrics visualization without a Rancher Prime subscription. It leverages the community-maintained [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart, which remains free and actively maintained.

### Why use this extension?

| Feature | rancher-monitoring (Prime) | kube-prometheus-stack-metrics |
|---------|---------------------------|-------------------------------|
| Cost | Paid (Rancher Prime subscription) | Free & Open Source |
| Prometheus Stack | Bundled | Uses community kube-prometheus-stack |
| Workload Metrics Tab | ✅ | ✅ |
| CPU/Memory/Network/Disk | ✅ | ✅ |
| Interactive Charts | ✅ | ✅ |
| Auto-refresh | ✅ | ✅ |

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

- 📊 **Real-time metrics visualization** for workloads and pods
- 📈 **Interactive charts** with hover tooltips showing exact values
- ⏱️ **Configurable timeframes**: 15m, 1h, 6h, 24h
- 🔄 **Auto-refresh** with configurable intervals (Off, 15s, 30s, 60s)
- 🎨 **High-resolution graphs** with 598+ data points for smooth visualization
- ✅ **Graceful fallback** when kube-prometheus-stack is not installed

### Metrics Displayed

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
- **kube-prometheus-stack** installed in the target cluster (in `prometheus` namespace)

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

If kube-prometheus-stack is not installed, the extension will display a helpful message with installation instructions:

<img width="1074" height="730" alt="kube-prometheus-stack not installed" src="https://github.com/user-attachments/assets/36e89ed8-a65b-4fb6-989c-af7a31ce6f3a" />

To install kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n prometheus --create-namespace
```

### Prometheus Namespace

The extension expects the Prometheus service at:
```
kube-prometheus-stack-prometheus.prometheus.svc:9090
```

If your installation uses a different namespace, you'll need to modify the extension source code.

## Troubleshooting

### Metrics not showing

1. **Check kube-prometheus-stack is installed**: Verify the Prometheus pods are running in the `prometheus` namespace
2. **Check service exists**: Ensure `kube-prometheus-stack-prometheus` service exists
3. **Check browser console**: Open developer tools and look for `[ExpertMetrics]` log messages

### Empty charts

- The workload may not have any pods running
- Prometheus may not have scraped metrics for this workload yet (wait a few minutes)
- Check that container metrics are being collected by kube-prometheus-stack

## Development

### Prerequisites

- Node.js >= 16
- Yarn

### Setup

```bash
cd kube-prometheus-stack-metrics
yarn install
```

### Development Server

```bash
yarn dev
```

### Build

```bash
yarn build
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






