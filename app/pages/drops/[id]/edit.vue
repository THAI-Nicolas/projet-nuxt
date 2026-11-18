<script setup lang="ts">
import type { Category, Drop, DropBody } from "~/types/api";

definePageMeta({
  validate: (route) => /^\d+$/.test(String(route.params.id)),
});

const route = useRoute();
const api = useApi();
const toast = useToast();
const id = computed(() => String(route.params.id));
const dropPath = computed(() => `/drops/${id.value}`);

// Même clé que la page détail : cache partagé dans les deux sens
const { data: drop, error } = await useAsyncData(
  () => `drop-${id.value}`,
  () => api<Drop>(dropPath.value),
);

const { data: categories } = await useAsyncData("categories", () =>
  api<Category[]>("/categories"),
);

// Les erreurs remontent à DropForm, qui les affiche
async function update(body: DropBody) {
  if (!drop.value) return;
  const { title, content, category, imageUrl, location } = drop.value;
  const original: DropBody = {
    title,
    content: content ?? "",
    category,
    imageUrl: imageUrl ?? null,
    lat: location.lat,
    lng: location.lng,
  };
  // Seuls les champs modifiés partent : ne renvoie pas une position non touchée (zone, précision approx)
  const changes = Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => value !== original[key as keyof DropBody],
    ),
  ) as Partial<DropBody>;

  if (Object.keys(changes).length) {
    drop.value = await api<Drop>(dropPath.value, {
      method: "PATCH",
      body: changes,
    });
    toast.add({ title: "Drop modifié", icon: "i-lucide-check", color: "success" });
  }
  await navigateTo(dropPath.value);
}

useSeoMeta({ title: () => `Modifier ${drop.value?.title ?? "le drop"}` });
</script>

<template>
  <main class="px-4 py-6">
    <UButton
      :to="dropPath"
      icon="i-lucide-arrow-left"
      label="Retour au drop"
      color="neutral"
      variant="ghost"
      class="-ml-2.5"
    />

    <UEmpty
      v-if="error?.status === 404"
      icon="i-lucide-search-x"
      title="Drop introuvable"
      description="Il a peut-être été supprimé ou masqué."
      :actions="[{ label: 'Retour aux drops', to: '/drops' }]"
      class="mt-6"
    />
    <UEmpty
      v-else-if="error || !categories"
      role="alert"
      icon="i-lucide-circle-alert"
      title="Impossible de charger ce drop"
      description="Vérifie ta connexion puis réessaie."
      :actions="[{ label: 'Réessayer', icon: 'i-lucide-refresh-cw', onClick: () => refreshNuxtData() }]"
      class="mt-6"
    />
    <!-- Garde d'interface (URL tapée à la main) : l'API renverrait de toute façon 403 -->
    <UEmpty
      v-else-if="drop && !drop.isMine"
      role="alert"
      icon="i-lucide-lock"
      title="Action non autorisée"
      description="Tu ne peux modifier que tes propres drops."
      :actions="[{ label: 'Voir le drop', to: dropPath }]"
      class="mt-6"
    />

    <template v-else-if="drop">
      <h1 class="mt-4 text-2xl font-bold">Modifier le drop</h1>
      <DropForm
        :initial="drop"
        :categories="categories"
        submit-label="Enregistrer"
        :save="update"
        class="mt-6"
      />
    </template>
  </main>
</template>
