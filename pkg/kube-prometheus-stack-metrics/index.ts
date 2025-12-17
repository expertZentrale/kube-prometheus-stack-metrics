import { importTypes } from '@rancher/auto-import';
import { IPlugin, TabLocation } from '@shell/core/types';

// Init the package
export default function(plugin: IPlugin): void {
  console.log('[kube-prometheus-stack-metrics] Initializing plugin...');
  
  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide plugin metadata from package.json
  plugin.metadata = require('./package.json');
  console.log('[kube-prometheus-stack-metrics] Plugin metadata loaded:', plugin.metadata?.name, plugin.metadata?.version);

  // Load a product
  // plugin.addProduct(require('./product'));

  plugin.addTab(
    TabLocation.RESOURCE_DETAIL,
    {
      // Only show tab for workload types and pods
      resource: ['apps.deployment', 'apps.statefulset', 'apps.daemonset', 'apps.replicaset', 'batch.job', 'batch.cronjob', 'pod']
    },
    {
      name:       'expert-metrics',
      label:      'expert Metrics',
      showHeader: false,
      weight:     2,
      component:  () => import('./components/kube-prometheus-stack-graphs.vue'),
    }
  );
  
  console.log('[kube-prometheus-stack-metrics] Tab registered for resource detail view');
}
