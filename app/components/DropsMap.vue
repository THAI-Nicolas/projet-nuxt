<script setup lang="ts">
import type { LatLngTuple, Map as LeafletMap } from "leaflet";
import type { Drop } from "~/types/api";

// Une épingle par drop reçu : la carte montre ce que la liste montre
const props = withDefaults(
  defineProps<{
    drops: Drop[];
    activeId?: number;
    // false : la molette fait défiler la page au lieu de zoomer (carte dans une page)
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

// Vue de départ, ensuite fit() cadre les épingles. Constante et pas `:center="[…]"` dans le template :
// un nouveau tableau à chaque rendu ferait recentrer LMap sur MMI et annulerait le cadrage.
const initialCenter: [number, number] = [MMI.lat, MMI.lng];

// Cadre toutes les épingles
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

// Recadre quand la liste change (filtre, nouveau drop) ou qu'un drop est déplacé, pas sur un like ou un commentaire
watch(
  () => props.drops.map((d) => `${d.id}:${latLng(d).join()}`).join(";"),
  fit,
);

// Survol de la liste : on met en avant sans déplacer la carte, sauf si l'épingle est hors de vue
watch(
  () => props.activeId,
  (id) => {
    const drop = find(id);
    if (!drop || !map.value) return;
    if (!map.value.getBounds().contains(latLng(drop)))
      map.value.panTo(latLng(drop));
  },
);

// Carte cachée au chargement (onglet « Liste » sur mobile) : Leaflet l'a mesurée à 0 px.
// À l'affichage, on la re-mesure et on recadre.
const root = useTemplateRef("root");
useResizeObserver(root, () => {
  if (!map.value) return;
  const wasHidden = map.value.getSize().x === 0;
  map.value.invalidateSize();
  if (wasHidden) fit();
});

// Appelé par la page (bouton « Voir sur la carte »), éventuellement juste après avoir affiché la carte
// shortcut: une épingle dans une bulle (drops au même endroit) reste groupée au zoom 17, et le survol ne la met pas en avant ; passer par cluster.zoomToShowLayer si c'est gênant.
function flyTo(id: number) {
  const drop = find(id);
  if (!drop || !map.value) return;
  map.value.invalidateSize();
  map.value.flyTo(latLng(drop), 17);
}

defineExpose({ flyTo });
</script>

<template>
  <!-- isolate : les calques Leaflet (z-index 400 à 1000) restent sous les barres sticky de la page -->
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
        <!-- Épingles proches regroupées en bulle numérotée (DropsCluster, L global requis) -->
        <DropsCluster>
          <LMarker
            v-for="drop in drops"
            :key="drop.id"
            :lat-lng="latLng(drop)"
            :z-index-offset="drop.id === activeId ? 1000 : 0"
            @click="emit('select', drop.id)"
          >
            <!-- Épingle Lucide en SVG (remplie via .drop-pin dans main.css), pointe en bas au centre -->
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
