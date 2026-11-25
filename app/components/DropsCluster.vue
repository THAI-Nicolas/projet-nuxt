<script setup lang="ts">
import { InjectionKeys } from "@vue-leaflet/vue-leaflet";
import type { MarkerCluster, MarkerClusterGroup } from "leaflet";

const addToMap = inject(InjectionKeys.AddLayerInjection);
const removeFromMap = inject(InjectionKeys.RemoveLayerInjection);

const cluster = shallowRef<MarkerClusterGroup>();

provide(InjectionKeys.AddLayerInjection, (layer) =>
  cluster.value?.addLayer(layer.leafletObject),
);
provide(InjectionKeys.RemoveLayerInjection, (layer) =>
  cluster.value?.removeLayer(layer.leafletObject),
);

onMounted(async () => {
  await import("leaflet.markercluster");
  const L = (globalThis as unknown as { L: typeof import("leaflet") }).L;
  cluster.value = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    iconCreateFunction: (group: MarkerCluster) =>
      L.divIcon({
        className: "drop-cluster",
        iconSize: [40, 40],
        html: `${group.getChildCount()}<span class="sr-only"> drops</span>`,
      }),
  });
  addToMap?.({ leafletObject: cluster.value });
});

onBeforeUnmount(() => {
  if (cluster.value) removeFromMap?.({ leafletObject: cluster.value });
});
</script>

<template>
  <slot v-if="cluster" />
</template>
