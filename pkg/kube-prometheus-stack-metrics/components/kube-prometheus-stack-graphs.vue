<template>
	<div class="page expert-metrics">
		<div v-if="isCheckingAvailability" class="availability-check">
			<div class="loading-spinner"></div>
			<p>Checking kube-prometheus-stack Grafana availability...</p>
		</div>

		<div v-else-if="!isGrafanaAvailable" class="not-available">
			<div class="not-available-icon">📊</div>
			<h2>Metrics Not Available</h2>
			<p class="not-available-message">
				Could not find a <strong>Grafana Ingress</strong> deployed by <code>kube-prometheus-stack</code> in this cluster.
			</p>
			<p class="not-available-details">
				The extension searched for Ingress resources matching <code>kube-prometheus-stack-grafana</code> or <code>grafana</code>
				in namespaces: <code>{{ GRAFANA_INGRESS_SEARCH_NAMESPACES.join(', ') }}</code>.
			</p>
			<p class="not-available-details">
				Ensure the kube-prometheus-stack Helm chart is installed and its Grafana Ingress is configured.
			</p>
			<p class="not-available-details" v-if="discoveryError"><strong>Details:</strong> {{ discoveryError }}</p>
			<button class="retry-btn" @click="checkGrafanaAvailability">Retry</button>
		</div>

		<template v-else>
			<header class="page-header">
				<h1>Expert Metrics</h1>
				<div class="controls">
					<label>
						Range
						<select v-model="selectedWindow">
							<option value="5m">5m</option>
							<option value="15m">15m</option>
							<option value="1h">1h</option>
							<option value="6h">6h</option>
							<option value="24h">24h</option>
						</select>
					</label>
					<label>
						Refresh
						<select v-model.number="refreshInterval">
							<option :value="0">Off</option>
							<option :value="15">15s</option>
							<option :value="30">30s</option>
							<option :value="60">60s</option>
						</select>
					</label>
					<button @click="refresh">Refresh</button>
				</div>
				<div class="debug">Resource: {{ resourceName }} ({{ resourceKind }}) — Namespace: {{ namespace }} — Cluster: {{ clusterId }} — Grafana: {{ resolvedGrafanaBaseUrl }}</div>
			</header>

			<section class="graphs">
				<div class="grafana-graph detail">
					<iframe
						:key="iframeKey"
						class="frame"
						:src="grafanaIframeUrl"
						frameborder="0"
						scrolling="no"
					></iframe>
					<div class="external-link">
						<a :href="grafanaExternalUrl" target="_blank" rel="noopener nofollow">Grafana</a>
					</div>
				</div>
			</section>
		</template>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';

const props = defineProps({
	resource: { type: Object, required: false }
});

function tabChange() {}
defineExpose({ tabChange });

// Access the Rancher Vuex store via the Vue instance
const $store = getCurrentInstance()?.proxy?.$store;

const selectedWindow = ref('5m');
const refreshInterval = ref(30);
const iframeKey = ref(0);

const isCheckingAvailability = ref(true);
const isGrafanaAvailable = ref(false);
const grafanaBaseUrl = ref('');
const discoveryError = ref('');

const GRAFANA_DASHBOARD_PATH = '/d/rancher-workload-pods-1/rancher-workload-pods';

// Discovery strategies (tried in order):
// 1. Helm labels: app.kubernetes.io/name=grafana + app.kubernetes.io/instance=kube-prometheus-stack
// 2. Name pattern + namespace fallback
const GRAFANA_INGRESS_SEARCH_NAMESPACES = ['prometheus', 'monitoring', 'cattle-monitoring-system'];
const GRAFANA_INGRESS_NAME_PATTERNS = ['kube-prometheus-stack-grafana', 'grafana'];

const clusterId = computed(() => {
	const pathMatch = window.location.pathname.match(/\/(?:c|k8s\/clusters)\/([^/]+)/);
	return pathMatch?.[1] || 'local';
});

const resourceKind = computed(() => props.resource?.kind || props.resource?.type || 'ReplicaSet');
const resourceName = computed(() => props.resource?.metadata?.name || props.resource?.name || 'sample');
const namespace = computed(() => props.resource?.metadata?.namespace || props.resource?.namespace || 'default');

/**
 * Extract a full Grafana URL from an Ingress resource's spec.rules[].host,
 * checking spec.tls to determine https vs http.
 */
function extractHostUrl(ing) {
	const rules = ing?.spec?.rules || [];
	for (const rule of rules) {
		const host = rule?.host;
		if (host) {
			const hasTls = (ing?.spec?.tls || []).some(t => (t.hosts || []).includes(host));
			const scheme = hasTls ? 'https' : 'http';
			return `${scheme}://${host}${GRAFANA_DASHBOARD_PATH}`;
		}
	}
	return '';
}

/**
 * Discover the Grafana Ingress via the Rancher cluster store.
 *
 * Uses $store.dispatch('cluster/findAll') to fetch Ingress resources,
 * then searches for one whose name matches kube-prometheus-stack-grafana
 * or grafana in the expected namespaces.
 */
async function discoverGrafanaIngress() {
	if (!$store) {
		discoveryError.value = 'Rancher store not available. Cannot query cluster resources.';
		return '';
	}

	try {
		// Ask the Rancher cluster store to fetch all Ingress resources
		const allIngresses = await $store.dispatch('cluster/findAll', { type: 'networking.k8s.io.ingress' });

		if (!allIngresses || !allIngresses.length) {
			discoveryError.value = 'No Ingress resources found in the cluster.';
			return '';
		}

		// Strategy 1: Match by Helm labels (most reliable)
		// kube-prometheus-stack sets app.kubernetes.io/name=grafana and app.kubernetes.io/instance=kube-prometheus-stack
		for (const ing of allIngresses) {
			const labels = ing?.metadata?.labels || {};
			const isGrafana = labels['app.kubernetes.io/name'] === 'grafana';
			const isKps = labels['app.kubernetes.io/instance'] === 'kube-prometheus-stack';

			if (isGrafana && isKps) {
				const url = extractHostUrl(ing);
				if (url) return url;
			}
		}

		// Strategy 2: Match by name pattern in known namespaces
		for (const ing of allIngresses) {
			const ns = ing?.metadata?.namespace || '';
			const name = ing?.metadata?.name || '';

			if (!GRAFANA_INGRESS_SEARCH_NAMESPACES.includes(ns)) continue;
			if (!GRAFANA_INGRESS_NAME_PATTERNS.some(p => name.includes(p))) continue;

			const url = extractHostUrl(ing);
			if (url) return url;
		}

		discoveryError.value = `No Grafana Ingress matching [${GRAFANA_INGRESS_NAME_PATTERNS.join(', ')}] found in namespaces [${GRAFANA_INGRESS_SEARCH_NAMESPACES.join(', ')}].`;
		return '';
	} catch (e) {
		discoveryError.value = `Error querying Ingress resources from store: ${e?.message || e}`;
		return '';
	}
}

async function checkGrafanaAvailability() {
	isCheckingAvailability.value = true;
	grafanaBaseUrl.value = '';
	discoveryError.value = '';

	try {
		const url = await discoverGrafanaIngress();

		if (url) {
			grafanaBaseUrl.value = url;
			new URL(url); // validate
			isGrafanaAvailable.value = true;
		} else {
			isGrafanaAvailable.value = false;
		}
	} catch {
		isGrafanaAvailable.value = false;
	} finally {
		isCheckingAvailability.value = false;
	}
}

const resolvedGrafanaBaseUrl = computed(() => {
	return (grafanaBaseUrl.value || '').trim() || '';
});

function buildGrafanaUrl(includeKiosk) {
	const url = new URL(resolvedGrafanaBaseUrl.value, window.location.origin);
	url.searchParams.set('orgId', '1');
	url.searchParams.set('from', `now-${selectedWindow.value}`);
	url.searchParams.set('to', 'now');

	if (refreshInterval.value > 0) {
		url.searchParams.set('refresh', `${refreshInterval.value}s`);
	} else {
		url.searchParams.delete('refresh');
	}

	url.searchParams.set('var-namespace', namespace.value);
	url.searchParams.set('var-kind', resourceKind.value);
	url.searchParams.set('var-workload', resourceName.value);
	url.searchParams.set('theme', 'light');

	if (includeKiosk) {
		url.searchParams.set('kiosk', '');
	} else {
		url.searchParams.delete('kiosk');
	}

	return url.toString();
}

const grafanaIframeUrl = computed(() => buildGrafanaUrl(true));
const grafanaExternalUrl = computed(() => buildGrafanaUrl(false));

function refresh() {
	iframeKey.value += 1;
}

watch([selectedWindow, refreshInterval, namespace, resourceKind, resourceName, resolvedGrafanaBaseUrl], refresh);

onMounted(async () => {
	await checkGrafanaAvailability();
	if (isGrafanaAvailable.value) {
		refresh();
	}
});
</script>

<style scoped>
.expert-metrics { display: grid; gap: 16px; }
.page-header { display: grid; gap: 8px; }
.controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.debug { color: #999; font-size: 12px; }

.graphs {
	height: 550px;
}

.grafana-graph {
	height: 100%;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 6px;
	overflow: hidden;
}

.frame {
	width: 100%;
	height: calc(100% - 34px);
	border: 0;
}

.external-link {
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 0 12px;
	border-top: 1px solid #eee;
}

.availability-check {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60px 20px;
	color: #666;
}

.loading-spinner {
	width: 40px;
	height: 40px;
	border: 3px solid #e0e0e0;
	border-top-color: #3d98d3;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 16px;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.not-available {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	text-align: center;
	max-width: 600px;
	margin: 0 auto;
}

.not-available-icon {
	font-size: 64px;
	margin-bottom: 16px;
	opacity: 0.6;
}

.not-available h2 {
	margin: 0 0 12px 0;
	color: #555;
	font-size: 24px;
}

.not-available-message {
	color: #666;
	font-size: 16px;
	margin: 0 0 8px 0;
}

.not-available-details {
	color: #888;
	font-size: 14px;
	margin: 0 0 20px 0;
}

.not-available-details code {
	background: #f5f5f5;
	padding: 2px 6px;
	border-radius: 3px;
	font-family: monospace;
}

.retry-btn {
	background: #3d98d3;
	color: white;
	border: none;
	padding: 10px 24px;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	transition: background 0.2s;
}

.retry-btn:hover {
	background: #2d7ab3;
}
</style>
