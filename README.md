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
  - [Toolchain compatibility](#toolchain-compatibility)
  - [Developer Load (recommended)](#developer-load-recommended)
  - [Running the Development App (proxy mode)](#running-the-development-app-proxy-mode)
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

### Dev server login page has no username/password fields

`yarn dev` renders "Welcome to Rancher" but no login form, and the console shows a 404 for
`/v1-public/authproviders`. The proxy is fine — the Rancher backend genuinely does not serve that
endpoint. `@rancher/shell` >= 3.0.8 requires it; Rancher <= 2.12.x only provides
`/v3-public/authProviders`. See [Toolchain compatibility](#toolchain-compatibility); use
[Developer Load](#developer-load-recommended) instead.

### "Developer Load" appears to do nothing

The browser is blocking the bundle as mixed content — HTTPS Rancher page, HTTP `serve-pkgs` origin —
and Chrome does this **without a visible warning**. Allow insecure content for the Rancher origin
(address-bar icon → Site settings → Insecure content → Allow) and reload. Confirm the fetch
succeeded by looking for a `200` on the `.umd.min.js` request in the Network tab.

### Extension disappears after a page refresh

Expected. A dev-loaded extension exists only in the current SPA session. Navigate by clicking within
the UI, or tick "Persist extension by creating custom resource" when loading — and remember to
uninstall the resulting `uiplugin` afterwards, since it points at your local machine.

### `yarn install` fails with "engine node is incompatible"

`@rancher/shell` >= 3.0.10 requires Node 24. Run `nvm use` to pick up `.nvmrc`. If you must stay on
Node 20, also pin `@rancher/shell` to `3.0.9` — otherwise yarn keeps resolving to a version that
cannot install, which is the same failure that stalls Dependabot.

## Development

### Prerequisites

- Node.js >= 24 — required by `@rancher/shell` >= 3.0.10 (see [Toolchain compatibility](#toolchain-compatibility))
- Yarn 1.x classic — `yarn.lock` is v1 format, so use `--frozen-lockfile`, not Berry's `--immutable`
- A running Rancher instance (v2.10+) and an **admin** account — non-admins cannot load extensions

### Setup

```bash
nvm use            # picks up .nvmrc (node 24)
yarn install --frozen-lockfile
```

### Toolchain compatibility

Two version couplings are easy to trip over, because both fail in ways that give no useful error.

**`@rancher/shell` >= 3.0.10 requires Node 24.** On Node 20 `yarn install` aborts with
`The engine "node" is incompatible with this module`. This also breaks Dependabot: its npm job
resolves the newest matching `@rancher/shell`, hits the engine error, and the entire update run dies —
silently withholding *all* npm security updates, with no PR and no alert to show for it. If you pin
back to Node 20, pin `@rancher/shell` to `3.0.9` as well, or the pipeline stalls again.

**`@rancher/shell` >= 3.0.8 does not work with the proxy dev server against Rancher <= 2.12.x.**
The login flow moved from `/v3-public/authProviders` to `/v1-public/authproviders` in 3.0.8, and
Rancher 2.12.3 only serves the `/v3-public` form. The symptom is a login page that renders
"Welcome to Rancher" with **no username or password fields** and a 404 in the console. Nothing in the
UI hints at the cause.

| `@rancher/shell` | Auth endpoint | Node | Proxy dev mode vs Rancher <= 2.12.x |
|---|---|---|---|
| 3.0.7 | `/v3-public` | >= 20 | works |
| 3.0.8 – 3.0.9 | `/v1-public` | >= 20 | broken |
| 3.0.10 – 3.0.11 | `/v1-public` | >= 24 | broken |

Because 3.0.7 is the last version that works with proxy mode, and staying there re-breaks the
dependency pipeline, **Developer Load is the recommended workflow** until the Rancher backend is
new enough to serve `/v1-public`. It has a compensating advantage: it exercises the exact UMD bundle
that CI builds, rather than the source.

### Developer Load (recommended)

Builds the extension and loads it into any Rancher instance. This tests the real build artifact.

1. Build and serve the package:

   ```bash
   yarn build-pkg kube-prometheus-stack-metrics
   yarn serve-pkgs
   ```

   `serve-pkgs` listens on port **4500** and prints the exact URL to use.

2. In Rancher: **user avatar → Preferences** → enable **"Enable Extension developer features"**.
   Verify it stuck — the checkbox can silently revert. It is stored as the `plugin-developer`
   user preference and can be set directly if needed:

   ```bash
   curl -k -H "Authorization: Bearer $RANCHER_TOKEN" \
     "$RANCHER_URL/v1/userpreferences/<user-id>"     # read, set plugin-developer=true, PUT back
   ```

3. **Allow insecure content for the Rancher origin.** Rancher is served over HTTPS and
   `serve-pkgs` over plain HTTP, so the browser blocks the bundle as mixed content — **silently**,
   with the Load button appearing to do nothing. In Chrome: click the icon left of the address bar →
   **Site settings** → **Insecure content** → **Allow**, then reload.

4. **Extensions → ⋮ → Developer Load**, and enter the URL from step 1:

   ```
   http://127.0.0.1:4500/kube-prometheus-stack-metrics-0.1.6/kube-prometheus-stack-metrics-0.1.6.umd.min.js
   ```

   The module name auto-fills. Click **Load**.

5. **Navigate by clicking, not by pasting URLs.** A dev-loaded extension lives only in the current
   SPA session, so any full page load discards it. Ticking **"Persist extension by creating custom
   resource"** survives reloads, but writes a `uiplugin` CR pointing at *your* `127.0.0.1:4500` —
   broken for everyone else on that Rancher, and for you once the server stops. Uninstall it when done.

To confirm the extension actually initialised, look for these in the browser console:

```
[kube-prometheus-stack-metrics] Initializing plugin...
[kube-prometheus-stack-metrics] Plugin metadata loaded: kube-prometheus-stack-metrics 0.1.6
[kube-prometheus-stack-metrics] Tab registered for resource detail view
```

### Running the Development App (proxy mode)

> **Requires `@rancher/shell` 3.0.7, or a Rancher new enough to serve `/v1-public/authproviders`.**
> With the currently pinned shell version this produces a login page with no form — see
> [Toolchain compatibility](#toolchain-compatibility). Use Developer Load instead.

Runs a full Rancher UI locally with the extension compiled in and hot-reloading enabled. Because the
whole dashboard is served from localhost, there is no mixed-content problem and no manual load step.

```bash
API=https://your-rancher-instance.example.com yarn dev
```

Then open [https://127.0.0.1:8005](https://127.0.0.1:8005) and log in with your Rancher credentials.
The dev server uses a self-signed certificate, so expect a browser warning.

### Verifying a build

```bash
yarn verify      # typecheck + lint + build + bundle smoke check
```

`yarn verify-bundle` alone asserts the built UMD exists, clears a size floor, parses, and still
carries its UMD wrapper — the failure mode a green webpack build does not catch.

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






