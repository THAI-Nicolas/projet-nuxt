<script setup lang="ts">
import type {
  DragEndEvent,
  LatLng,
  LatLngTuple,
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
} from "leaflet";

// Choix de la position d'un drop : épingle déplaçable, synchronisée avec les champs latitude / longitude du formulaire
const lat = defineModel<number | null>("lat", { required: true });
const lng = defineModel<number | null>("lng", { required: true });

// Zone autorisée par l'API (erreur 422 sous `location` au-delà)
const ZONE_RADIUS_M = 3000;

const map = shallowRef<LeafletMap>();

// Pas d'épingle tant qu'un des deux champs est vide
const position = computed<LatLngTuple | undefined>(() =>
  lat.value !== null && lng.value !== null ? [lat.value, lng.value] : undefined,
);

// Valeur de départ seulement : ensuite la carte suit l'épingle (voir le watch).
// [number, number] et pas LatLngTuple : la prop `center` de LMap est typée PointExpression
const initialCenter: [number, number] = [
  lat.value ?? MMI.lat,
  lng.value ?? MMI.lng,
];

// 6 décimales (~10 cm), comme l'affichage des champs
const round = (n: number) => Math.round(n * 1e6) / 1e6;

function place({ lat: newLat, lng: newLng }: LatLng) {
  lat.value = round(newLat);
  lng.value = round(newLng);
}

// Saisie à la main ou « Utiliser ma position » : la carte suit l'épingle si elle sort de la vue
watch(position, (p) => {
  if (p && map.value && !map.value.getBounds().contains(p)) map.value.panTo(p);
});
</script>

<template>
  <!-- isolate : les calques Leaflet (z-index 400 à 1000) restent sous les éléments de la page -->
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
        <!-- Non interactif : un clic dans la zone pose l'épingle au lieu d'être capté par le cercle -->
        <LCircle
          :lat-lng="[MMI.lat, MMI.lng]"
          :radius="ZONE_RADIUS_M"
          :interactive="false"
          color="#7b71ff"
          :weight="1"
          :fill-opacity="0.08"
        />
        <LMarker
          v-if="position"
          :lat-lng="position"
          draggable
          @dragend="
            (e: DragEndEvent) => place((e.target as Marker).getLatLng())
          "
        >
          <!-- Même épingle que la carte des drops (.drop-pin dans main.css) -->
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
