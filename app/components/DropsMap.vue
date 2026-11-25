<script setup lang="ts">
import type { LatLngTuple, Map as LeafletMap } from "leaflet";
import type { Drop } from "~/types/api";

const props = withDefaults(
  defineProps<{
    drops: Drop[];
    activeId?: number;
    interactive?: boolean;
  }>(),
  { activeId: undefined, interactive: true },
);

const emit = defineEmits<{ select: [id: number] }>();

const map = shallowRef<LeafletMap>();

const latLng = (drop: Drop): LatLngTuple => [
  drop.location.lat,
  drop.location.lng,
];
const find = (id?: number) => props.drops.find((d) => d.id === id);


const initialCenter: [number, number] = [MMI.lat, MMI.lng];


function fit() {
  if (map.value && props.drops.length)
    map.value.fitBounds(props.drops.map(latLng), {
      padding: [32, 32],
      maxZoom: 16,
    });
}

function onReady(leafletMap: LeafletMap) {
  map.value = leafletMap;
  fit();
}


watch(
  () => props.drops.map((d) => `${d.id}:${latLng(d).join()}`).join(";"),
  fit,
);


watch(
  () => props.activeId,
  (id) => {
    const drop = find(id);
    if (!drop || !map.value) return;
    if (!map.value.getBounds().contains(latLng(drop)))
      map.value.panTo(latLng(drop));
  },
);

const root = useTemplateRef("root");
useResizeObserver(root, () => {
  if (!map.value) return;
  const wasHidden = map.value.getSize().x === 0;
  map.value.invalidateSize();
  if (wasHidden) fit();
});

function flyTo(id: number) {
  const drop = find(id);
  if (!drop || !map.value) return;
  map.value.invalidateSize();
  map.value.flyTo(latLng(drop), 17);
}

defineExpose({ flyTo });
</script>

<template>
  <div
    ref="root"
    role="region"
    aria-label="Carte des drops"
    class="isolate overflow-hidden rounded-xl border border-line bg-surface"
  >
    <ClientOnly>
      <LMap
        :zoom="14"
        :center="initialCenter"
        :use-global-leaflet="true"
        :options="{ scrollWheelZoom: interactive }"
        @ready="onReady"
      >
        <LTileLayer
          :url="TILE_URL"
          :attribution="TILE_ATTRIBUTION"
          layer-type="base"
          name="OpenStreetMap"
        />
        
        <DropsCluster>
          <LMarker
            v-for="drop in drops"
            :key="drop.id"
            :lat-lng="latLng(drop)"
            :z-index-offset="drop.id === activeId ? 1000 : 0"
            @click="emit('select', drop.id)"
          >
            
            <LIcon
              class-name="drop-marker"
              :icon-size="[36, 36]"
              :icon-anchor="[18, 34]"
              :tooltip-anchor="[0, -34]"
            >
              <UIcon
                name="i-lucide-map-pin"
                mode="svg"
                class="drop-pin size-9 origin-bottom transition-transform"
                :class="{ 'scale-125': drop.id === activeId }"
              />
            </LIcon>
            <LTooltip :options="{ direction: 'top' }">{{
              drop.title
            }}</LTooltip>
          </LMarker>
        </DropsCluster>
      </LMap>
    </ClientOnly>
  </div>
</template>
