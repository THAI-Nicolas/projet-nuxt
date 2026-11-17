<script setup lang="ts">
import type { Category, DropPage } from "~/types/api";

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
  { watch: [q, category] },
);
</script>

<template>
  <main>
    <header class="space-y-4 border-b border-line px-4 py-6">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Drops</h1>
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
      </div>
      <DropSearch v-model="search" />
      <DropCategoryFilter
        v-if="categories"
        v-model="category"
        :categories="categories"
      />
    </header>

    <p
      v-if="status === 'pending' && !data"
      role="status"
      class="p-4 text-muted"
    >
      Chargement…
    </p>
    <div v-else-if="error" role="alert" class="p-4">
      <p>Impossible de charger les drops.</p>
      <button type="button" @click="refresh()" class="cursor-pointer">
        Réessayer
      </button>
    </div>
    <p v-else-if="data && data.items.length === 0" class="p-4 text-muted">
      {{
        q || category
          ? "Aucun drop ne correspond à ta recherche."
          : "Aucun drop pour l'instant."
      }}
    </p>
    <ul v-else-if="data">
      <li v-for="drop in data.items" :key="drop.id">
        <DropCard :drop="drop" />
      </li>
    </ul>
  </main>
</template>
