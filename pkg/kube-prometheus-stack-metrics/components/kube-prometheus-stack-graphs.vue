<template>
	<div class="page expert-metrics">
		<header class="page-header">
			<h1>Expert Metrics</h1>
			<div class="controls">
				<label>
					Timeframe
					<select v-model="selectedWindow">
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
			<div class="debug">Resource: {{ resourceName }} ({{ resourceKind }}) — Namespace: {{ namespace }}</div>
		</header>

		<section class="grid">
			<article>
				<h3>CPU (cores)</h3>
				<ChartSeries :series="cpu" color="#2b8" unit="cores" />
				<SummaryRow :series="cpu" unit="cores" />
			</article>
			<article>
				<h3>Memory (bytes)</h3>
				<ChartSeries :series="memory" color="#28b" unit="bytes" />
				<SummaryRow :series="memory" unit="bytes" />
			</article>
			<article>
				<h3>Network RX (bytes/s)</h3>
				<ChartSeries :series="netRx" color="#b82" unit="bytes/s" />
				<SummaryRow :series="netRx" unit="bytes/s" />
			</article>
			<article>
				<h3>Network TX (bytes/s)</h3>
				<ChartSeries :series="netTx" color="#b28" unit="bytes/s" />
				<SummaryRow :series="netTx" unit="bytes/s" />
			</article>
			<article>
				<h3>Disk Read (bytes/s)</h3>
				<ChartSeries :series="diskRead" color="#282" unit="bytes/s" />
				<SummaryRow :series="diskRead" unit="bytes/s" />
			</article>
			<article>
				<h3>Disk Write (bytes/s)</h3>
				<ChartSeries :series="diskWrite" color="#822" unit="bytes/s" />
				<SummaryRow :series="diskWrite" unit="bytes/s" />
			</article>
		</section>

		<div v-if="error" class="error">{{ error }}</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue';

// Expect Rancher to pass the resource into the component when used as a tab
const props = defineProps({ resource: { type: Object, required: false } });

// Provide tabChange to satisfy shell expectations
function tabChange() {}
defineExpose({ tabChange });

// Chart + Summary subcomponents (inline for simplicity)
const ChartSeries = {
	name: 'ChartSeries',
	props: { series: { type: Array, required: true }, color: { type: String, default: '#2b8' }, unit: { type: String, default: '' } },
	setup(p) {
		const width = 460; const height = 160;
		const margin = { top: 10, right: 20, bottom: 22, left: 42 };
		const innerW = width - margin.left - margin.right;
		const innerH = height - margin.top - margin.bottom;
		const hoverX = ref(null);
		const hoverT = ref(0);

		const domain = computed(() => {
			const points = (p.series || []).flatMap(s => s.points || []);
			const minX = Math.min(...points.map(pt => pt.t), Date.now() - 3600000);
			const maxX = Math.max(...points.map(pt => pt.t), Date.now());
			const maxY = Math.max(...points.map(pt => pt.v), 1);
			return { minX, maxX, minY: 0, maxY };
		});

		function sx(t){ const { minX, maxX } = domain.value; const dx = Math.max(1, maxX - minX); return margin.left + ((t - minX)/dx) * innerW; }
		function sy(v){ const { minY, maxY } = domain.value; const dy = Math.max(1e-9, maxY - minY); return margin.top + innerH - ((v - minY)/dy) * innerH; }

		function pathFor(points){
			if (!points || !points.length) return '';
			let d = `M ${sx(points[0].t)} ${sy(points[0].v)}`;
			for (let i=1;i<points.length;i++){ d += ` L ${sx(points[i].t)} ${sy(points[i].v)}`; }
			return d;
		}

		function mkTicks(n){ return Array.from({length:n},(_,i)=>i); }
		const yTicks = computed(() => {
			const { minY, maxY } = domain.value; const n = 4;
			return mkTicks(n+1).map(i => minY + (i/n) * (maxY - minY));
		});
		const xTicks = computed(() => {
			const { minX, maxX } = domain.value; const n = 4;
			return mkTicks(n+1).map(i => Math.round(minX + (i/n) * (maxX - minX)));
		});

		function fmtVal(v){
			if (p.unit.includes('bytes')) {
				const units=['B','KiB','MiB','GiB','TiB']; let u=0; let x=v;
				while (x>=1024 && u<units.length-1){ x/=1024; u++; }
				return `${Math.round(x*100)/100} ${units[u]}`;
			}
			return `${Math.round(v*100)/100} ${p.unit}`.trim();
		}
		function fmtTs(ts){
			const d = new Date(ts); return d.toLocaleTimeString();
		}

		function onMove(ev){
			const svg = ev.currentTarget;
			const rect = svg.getBoundingClientRect();
			const x = ev.clientX - rect.left - margin.left;
			hoverX.value = Math.max(0, Math.min(innerW, x));
			const { minX, maxX } = domain.value; const dx = Math.max(1, maxX - minX);
			hoverT.value = Math.round(minX + (hoverX.value/innerW) * dx);
		}
		function onLeave(){ hoverX.value = null; }

		function closestAt(ts, pts){
			if (!pts || !pts.length) return null;
			let best = pts[0]; let bestD = Math.abs(ts - best.t);
			for (let i=1;i<pts.length;i++){ const d = Math.abs(ts - pts[i].t); if (d < bestD){ bestD = d; best = pts[i]; } }
			return best;
		}

		const palette = ['#2b8','#28b','#b82','#b28','#282','#822'];

		return () => {
			if (!p.series || !p.series.length) return h('div', { class: 'empty' }, 'No data');

			const axes = [
				// Y grid + labels
				...yTicks.value.map((v,i)=>h('g',{key:'y'+i},[
					h('line',{ x1: margin.left, y1: sy(v), x2: margin.left+innerW, y2: sy(v), stroke:'#eee'}),
					h('text',{ x: margin.left-6, y: sy(v)+4, 'text-anchor':'end', fill:'#666', style:'font-size:10px' }, fmtVal(v))
				])),
				// X ticks
				...xTicks.value.map((t,i)=>h('g',{key:'x'+i},[
					h('line',{ x1: sx(t), y1: margin.top+innerH, x2: sx(t), y2: margin.top+innerH+4, stroke:'#ccc'}),
					h('text',{ x: sx(t), y: margin.top+innerH+16, 'text-anchor':'middle', fill:'#666', style:'font-size:10px' }, fmtTs(t))
				])),
				// Axes lines
				h('line',{ x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top+innerH, stroke:'#ccc'}),
				h('line',{ x1: margin.left, y1: margin.top+innerH, x2: margin.left+innerW, y2: margin.top+innerH, stroke:'#ccc'}),
			];

			const paths = (p.series || []).map((s,idx)=>h('path', {
				key: 'p'+idx,
				d: pathFor(s.points || []),
				fill: 'none',
				stroke: palette[idx % palette.length],
				'stroke-width': 2
			}));

			const hoverLayer = hoverX.value!=null ? [
				h('line', { x1: margin.left + hoverX.value, y1: margin.top, x2: margin.left + hoverX.value, y2: margin.top+innerH, stroke:'#888','stroke-dasharray':'3,3'}),
				...(p.series || []).map((s,idx)=>{
					const pt = closestAt(hoverT.value, s.points||[]);
					return pt ? h('circle',{ cx: sx(pt.t), cy: sy(pt.v), r:3, fill: palette[idx%palette.length], stroke:'#fff'}) : null;
				}).filter(Boolean)
			] : [];

			const hoverReadout = hoverX.value!=null ? h('div', { class: 'hover-readout' }, [
				h('strong', null, fmtTs(hoverT.value)+' '),
				...(p.series||[]).map((s,idx)=>{
					const pt = closestAt(hoverT.value, s.points||[]);
					return h('span',{ style:`margin-left:8px;color:${palette[idx%palette.length]}` }, `${s.name || 'series'}: ${pt?fmtVal(pt.v):'–'}`);
				})
			]) : null;

			return h('div', { class: 'series' }, [
				h('svg', { width, height, style: 'cursor:crosshair', onMousemove: onMove, onMouseleave: onLeave }, [
					...axes,
					...paths,
					...hoverLayer
				]),
				hoverReadout
			]);
		};
	}
};

const SummaryRow = {
	name: 'SummaryRow',
	props: { series: { type: Array, required: true }, unit: { type: String, default: '' } },
	setup(p) {
		const last = computed(() => {
			const vals = (p.series || []).flatMap((s) => s.points || []).map((pt) => pt.v);
			return vals.length ? vals[vals.length - 1] : 0;
		});
		const mn = computed(() => {
			const vals = (p.series || []).flatMap((s) => s.points || []).map((pt) => pt.v);
			return vals.length ? Math.min(...vals) : 0;
		});
		const mx = computed(() => {
			const vals = (p.series || []).flatMap((s) => s.points || []).map((pt) => pt.v);
			return vals.length ? Math.max(...vals) : 0;
		});
		return () => h('div', { class: 'summary' }, [
			h('span', null, `Last: ${Math.round(last.value * 100) / 100} ${p.unit}`),
			h('span', null, `Min: ${Math.round(mn.value * 100) / 100} ${p.unit}`),
			h('span', null, `Max: ${Math.round(mx.value * 100) / 100} ${p.unit}`)
		]);
	}
};

// State
const selectedWindow = ref('1h');
const refreshInterval = ref(30);
let timer = null;

// Resource context
const resourceKind = computed(() => props.resource?.kind || props.resource?.type || 'Deployment');
const resourceName = computed(() => props.resource?.metadata?.name || props.resource?.name || 'sample');
const namespace = computed(() => props.resource?.metadata?.namespace || props.resource?.namespace || 'default');

// Series data
const cpu = ref([]);
const memory = ref([]);
const netRx = ref([]);
const netTx = ref([]);
const diskRead = ref([]);
const diskWrite = ref([]);
const error = ref('');

function parseWindow(win) {
	const now = Date.now();
	const map = { '15m': 15*60*1000, '1h': 60*60*1000, '6h': 6*60*60*1000, '24h': 24*60*60*1000 };
	const dur = map[win] || map['1h'];
	// Target at least 598 data points for smooth visualization
	const stepSec = Math.max(1, Math.floor(dur / (598 * 1000)));
	return { from: now - dur, to: now, stepSec };
}


async function promRangeQuery(query, range) {
	// Get cluster ID from current URL path (e.g., /c/c-m-xxxxx/... or /k8s/clusters/c-xxxxx/...)
	const pathMatch = window.location.pathname.match(/\/(?:c|k8s\/clusters)\/([^/]+)/);
	const clusterId = pathMatch?.[1] || 'local';
	
	// Build Rancher proxy URL dynamically
	const base = `/k8s/clusters/${clusterId}/api/v1/namespaces/prometheus/services/http:kube-prometheus-stack-prometheus:9090/proxy`;
	const url = new URL(window.location.origin + base + '/api/v1/query_range');
	url.searchParams.set('query', query);
	url.searchParams.set('start', String(range.from / 1000));
	url.searchParams.set('end', String(range.to / 1000));
	url.searchParams.set('step', String(range.stepSec));
	const full = url.toString();
	console.log('[ExpertMetrics] Prometheus request:', full, '(cluster:', clusterId, ')');
	const res = await fetch(full);
	if (!res.ok) throw new Error(`Prometheus ${res.status}: ${await res.text()}`);
	const json = await res.json();
	const result = json?.data?.result ?? [];
	return result.map(r => ({
		name: Object.values(r.metric || {}).join(' '),
		points: (r.values || []).map(([ts, val]) => ({ t: ts*1000, v: parseFloat(val) })),
	}));
}

function selectorFor(kind, ns, name) {
	if ((kind || '').toLowerCase() === 'pod') return `pod="${name}"`;
	// fallback: approximate pod name prefix
	return `namespace="${ns}",pod=~"${name}.*"`;
}

async function refresh() {
	try {
		error.value = '';
		const range = parseWindow(selectedWindow.value);

		const sel = selectorFor(resourceKind.value, namespace.value, resourceName.value);
		const cpuQ = `sum by (pod) (rate(container_cpu_usage_seconds_total{${sel}}[5m]))`;
		const memQ = `sum by (pod) (container_memory_working_set_bytes{${sel}})`;
		const rxQ = `sum by (pod) (rate(container_network_receive_bytes_total{${sel}}[5m]))`;
		const txQ = `sum by (pod) (rate(container_network_transmit_bytes_total{${sel}}[5m]))`;
		const rdQ = `sum by (pod) (rate(container_fs_reads_bytes_total{${sel}}[5m]))`;
		const wrQ = `sum by (pod) (rate(container_fs_writes_bytes_total{${sel}}[5m]))`;

		const [cpuS, memS, rxS, txS, rdS, wrS] = await Promise.all([
			promRangeQuery(cpuQ, range),
			promRangeQuery(memQ, range),
			promRangeQuery(rxQ, range),
			promRangeQuery(txQ, range),
			promRangeQuery(rdQ, range),
			promRangeQuery(wrQ, range),
		]);
		cpu.value = cpuS; memory.value = memS; netRx.value = rxS; netTx.value = txS; diskRead.value = rdS; diskWrite.value = wrS;
	} catch (e) {
		console.error('[ExpertMetrics] refresh error', e);
		error.value = e?.message || String(e);
	}
}

watch(selectedWindow, refresh);
watch(refreshInterval, () => {
	if (timer) clearInterval(timer);
	if (refreshInterval.value > 0) timer = setInterval(refresh, refreshInterval.value * 1000);
});

onMounted(() => {
	console.log('[ExpertMetrics] mounted', { kind: resourceKind.value, namespace: namespace.value, name: resourceName.value });
	refresh();
});
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.expert-metrics { display: grid; gap: 16px; }
.page-header { display: grid; gap: 8px; }
.controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
article { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fff; }
.series { display: flex; gap: 8px; flex-wrap: wrap; }
.summary { display: flex; gap: 16px; margin-top: 6px; color: #555; font-size: 12px; }
.empty { color: #888; }
.debug { color: #999; font-size: 12px; }
.error { color: #b00; }
</style>