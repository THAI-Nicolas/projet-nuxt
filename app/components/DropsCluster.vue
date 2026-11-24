<script setup lang="ts">
import { InjectionKeys } from "@vue-leaflet/vue-leaflet";
import type { MarkerCluster, MarkerClusterGroup } from "leaflet";

// Regroupe les LMarker enfants (plugin leaflet.markercluster), sur le modèle de LLayerGroup de vue-leaflet :
// les marqueurs s'ajoutent au groupe au lieu de la carte. À utiliser dans un LMap en use-global-leaflet.
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
  // Le plugin étend le L global, posé par LMap (use-global-leaflet)
  await import("leaflet.markercluster");
  const L = (globalThis as unknown as { L: typeof import("leaflet") }).L;
  cluster.value = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    // Seul un nombre est injecté dans le HTML, jamais de contenu utilisateur
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
