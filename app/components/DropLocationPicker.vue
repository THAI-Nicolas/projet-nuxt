<script setup lang="ts">
import type {
  DragEndEvent,
  LatLng,
  LatLngTuple,
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
} from "leaflet";


const lat = defineModel<number | null>("lat", { required: true });
const lng = defineModel<number | null>("lng", { required: true });

const map = shallowRef<LeafletMap>();


const position = computed<LatLngTuple | undefined>(() =>
  lat.value !== null && lng.value !== null ? [lat.value, lng.value] : undefined,
);

const initialCenter: [number, number] = [
  lat.value ?? MMI.lat,
  lng.value ?? MMI.lng,
];


const round = (n: number) => Math.round(n * 1e6) / 1e6;

function place({ lat: newLat, lng: newLng }: LatLng) {
  lat.value = round(newLat);
  lng.value = round(newLng);
}


watch(position, (p) => {
  if (p && map.value && !map.value.getBounds().contains(p)) map.value.panTo(p);
});
</script>

<template>
  
  <div
    role="region"
    aria-label="Choisir la position sur la carte"
    class="isolate overflow-hidden rounded-xl border border-line bg-surface"
  >
    <ClientOnly>
      <LMap
        :zoom="15"
        :center="initialCenter"
        :use-global-leaflet="false"
        :options="{ scrollWheelZoom: false }"
        @ready="(m: LeafletMap) => (map = m)"
        @click="(e: LeafletMouseEvent) => place(e.latlng)"
      >
        <LTileLayer
          :url="TILE_URL"
          :attribution="TILE_ATTRIBUTION"
          layer-type="base"
          name="OpenStreetMap"
        />
        <LMarker
          v-if="position"
          :lat-lng="position"
          draggable
          @dragend="
            (e: DragEndEvent) => place((e.target as Marker).getLatLng())
          "
        >
          
          <LIcon
            class-name="drop-marker"
            :icon-size="[36, 36]"
            :icon-anchor="[18, 34]"
          >
            <UIcon name="i-lucide-map-pin" mode="svg" class="drop-pin size-9" />
          </LIcon>
        </LMarker>
      </LMap>
    </ClientOnly>
  </div>
</template>
