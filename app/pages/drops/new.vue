<script setup lang="ts">
import type { Category, Drop, DropBody } from "~/types/api";

const api = useApi();
const toast = useToast();

const { data: categories, refresh } = await useAsyncData("categories", () =>
  api<Category[]>("/categories"),
);

async function create(body: DropBody) {
  const drop = await api<Drop>("/drops", { method: "POST", body });
  toast.add({ title: "Drop déposé", icon: "i-lucide-check", color: "success" });
  await navigateTo(`/drops/${drop.id}`);
}

useSeoMeta({ title: "Nouveau drop" });
</script>

<template>
  <main class="px-4 py-6">
    <UButton
      to="/drops"
      icon="i-lucide-arrow-left"
      label="Drops"
      color="neutral"
      variant="ghost"
      class="-ml-2.5"
    />
    <h1 class="mt-4 text-2xl font-bold">Nouveau drop</h1>

    <DropForm
      v-if="categories"
      :categories="categories"
      submit-label="Déposer le drop"
      :save="create"
      class="mt-6"
    />
    <UEmpty
      v-else
      role="alert"
      icon="i-lucide-circle-alert"
      title="Impossible de charger le formulaire"
      description="Vérifie ta connexion puis réessaie."
      :actions="[{ label: 'Réessayer', icon: 'i-lucide-refresh-cw', onClick: () => refresh() }]"
      class="mt-6"
    />
  </main>
</template>
