<script setup lang="ts">
import type { Category, Drop, DropPage } from "~/types/api";

// Liste + carte côte à côte : la page a besoin de toute la largeur (voir layouts/default.vue)
definePageMeta({ wide: true });

const route = useRoute();
const router = useRouter();
const api = useApi();

const q = computed(() =>
  typeof route.query.q === "string" ? route.query.q : "",
);

const search = ref(q.value);

watchDebounced(
  search,
  (value) => {
    router.replace({ query: { ...route.query, q: value.trim() || undefined } });
  },
  { debounce: 300 },
);

watch(q, (value) => {
  if (search.value.trim() !== value) search.value = value;
});

// Chargées avant les drops : le filtre en dépend dès le premier rendu (ensuite servies depuis le cache)
const { data: categories } = await useAsyncData("categories", () =>
  api<Category[]>("/categories"),
);

// URL ⇄ filtre. get : ?category n'est gardé que s'il existe vraiment (sinon 422). set : écrit dans l'URL.
const category = computed({
  get: () => categories.value?.find((c) => c.id === route.query.category)?.id,
  set: (value) => {
    router.replace({ query: { ...route.query, category: value } });
  },
});

const { data, error, status, refresh } = await useAsyncData(
  "drops",
  () =>
    api<DropPage>("/drops", {
      query: { q: q.value || undefined, category: category.value },
    }),
  // lazy : en navigation client, la page s'affiche tout de suite (skeletons) au lieu d'attendre l'API.
  // Sans effet au rendu serveur, qui attend toujours les données.
  { watch: [q, category], lazy: true },
);

// Liste vivante : les événements temps réel sont fusionnés dans les données de useAsyncData.
// data est un shallowRef : on remplace l'objet entier, sinon rien ne se re-rend.
function updateItems(update: (items: Drop[]) => Drop[], delta = 0) {
  if (!data.value) return;
  data.value = {
    ...data.value,
    items: update(data.value.items),
    total: data.value.total + delta,
  };
}

const isShown = (dropId: number) =>
  data.value?.items.some((d) => d.id === dropId) ?? false;

useRealtimeEvent("drop:created", ({ drop }) => {
  if (isShown(drop.id)) return; // déjà là (rechargement arrivé entre-temps)
  // Ne pas afficher un drop qui ne correspond pas au filtre en cours.
  // shortcut: la recherche ?q est faite par l'API (règles inconnues côté client) : pendant une recherche,
  // on n'insère rien plutôt que de deviner ; le drop apparaîtra au prochain chargement.
  if (q.value || (category.value && drop.category !== category.value)) return;
  updateItems((items) => [drop, ...items], 1); // tri par défaut : les plus récents en premier
});

// Le drop est construit pour nous (isMine, likedByMe…) : on le remplace tel quel
useRealtimeEvent("drop:updated", ({ drop }) => {
  if (isShown(drop.id))
    updateItems((items) => items.map((d) => (d.id === drop.id ? drop : d)));
});

// Supprimé, ou masqué après signalements.
// shortcut: un drop absent de la page chargée ne décrémente pas le total (on ne sait pas s'il correspondait au filtre).
useRealtimeEvent("drop:deleted", ({ dropId }) => {
  if (isShown(dropId))
    updateItems((items) => items.filter((d) => d.id !== dropId), -1);
});

// Liste et carte se répondent : l'état de sélection vit ici, dans le parent commun
const activeId = ref<number>();
const map = useTemplateRef("map");
// Mobile uniquement (une seule vue à la fois) ; sur desktop les deux sont affichées
const view = ref("list");
const views = [
  { label: "Liste", value: "list", icon: "i-lucide-list" },
  { label: "Carte", value: "map", icon: "i-lucide-map" },
];

// Clic sur une épingle : on retrouve la carte dans la liste
async function selectFromMap(id: number) {
  activeId.value = id;
  view.value = "list";
  await nextTick();
  document
    .getElementById(`drop-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// « Voir sur la carte » depuis la liste
async function locate(id: number) {
  activeId.value = id;
  view.value = "map";
  await nextTick();
  map.value?.flyTo(id);
}
</script>

<template>
  <main class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
    <div>
      <!-- Filtres toujours accessibles au scroll. Desktop : tout l'en-tête reste fixé sous la barre du site.
           Mobile : seuls recherche et onglets restent (max-lg:contents rend leur bloc sticky dans toute la colonne).
           z-20 : au-dessus des boutons des cartes (z-10). -->
      <header
        class="max-lg:contents lg:sticky lg:top-appbar lg:z-20 lg:border-b lg:border-line lg:bg-bg"
      >
        <div class="space-y-4 px-4 pt-6">
          <div class="flex items-center justify-between gap-4">
            <h1 class="text-2xl font-bold">Drops</h1>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="data"
                icon="i-lucide-droplet"
                variant="subtle"
                size="lg"
                class="rounded-full"
                aria-live="polite"
              >
                {{ data.total }} {{ data.total > 1 ? "drops" : "drop" }}
              </UBadge>
              <UButton to="/drops/new" icon="i-lucide-plus" label="Nouveau" />
            </div>
          </div>
          <DropCategoryFilter
            v-if="categories"
            v-model="category"
            :categories="categories"
          />
        </div>
        <div
          class="sticky top-appbar z-20 space-y-3 border-b border-line bg-bg px-4 py-4 lg:static lg:border-0 lg:pb-6"
        >
          <DropSearch v-model="search" :loading="status === 'pending'" />
          <UTabs
            v-model="view"
            :items="views"
            :content="false"
            aria-label="Affichage"
            class="lg:hidden"
          />
        </div>
      </header>

      <div :class="{ 'max-lg:hidden': view === 'map' }">
        <div v-if="status === 'pending' && !data" role="status">
          <span class="sr-only">Chargement des drops…</span>
          <DropCardSkeleton v-for="n in 4" :key="n" />
        </div>
        <UEmpty
          v-else-if="error"
          role="alert"
          icon="i-lucide-circle-alert"
          title="Impossible de charger les drops"
          description="Vérifie ta connexion puis réessaie."
          :actions="[
            {
              label: 'Réessayer',
              icon: 'i-lucide-refresh-cw',
              onClick: () => refresh(),
            },
          ]"
          class="m-4"
        />

        <p v-else-if="data && data.items.length === 0" class="p-4 text-muted">
          {{
            q || category
              ? "Aucun drop ne correspond à ta recherche."
              : "Aucun drop pour l'instant."
          }}
        </p>
        <!-- Pendant une recherche, l'ancienne liste reste mais s'estompe -->
        <ul
          v-else-if="data"
          :aria-busy="status === 'pending'"
          class="transition-opacity"
          :class="{ 'opacity-50': status === 'pending' }"
        >
          <!-- Survol ou focus d'une carte : son épingle passe en avant -->
          <li
            v-for="drop in data.items"
            :id="`drop-${drop.id}`"
            :key="drop.id"
            @mouseenter="activeId = drop.id"
            @focusin="activeId = drop.id"
          >
            <DropCard
              :drop="drop"
              :active="drop.id === activeId"
              @locate="locate(drop.id)"
            />
          </li>
        </ul>
      </div>
    </div>

    <DropsMap
      ref="map"
      :drops="data?.items ?? []"
      :active-id="activeId"
      class="h-map max-lg:m-4 lg:sticky lg:top-header lg:my-4"
      :class="{ 'max-lg:hidden': view === 'list' }"
      @select="selectFromMap"
    />
  </main>
</template>
