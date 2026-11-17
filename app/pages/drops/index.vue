<script setup lang="ts">
import type { DropPage } from "~/types/api";

const api = useApi();

const { data, error, status, refresh } = await useAsyncData("drops", () =>
  api<DropPage>("/drops"),
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
        >
          {{ data.total }} {{ data.total > 1 ? "drops" : "drop" }}
        </UBadge>
      </div>
      <!-- À venir : barre de recherche + filtres par catégorie (badges), espacés par space-y-4 -->
    </header>

    <p v-if="status === 'pending'" role="status" class="p-4 text-muted">
      Chargement…
    </p>
    <div v-else-if="error" role="alert" class="p-4">
      <p>Impossible de charger les drops.</p>
      <button type="button" @click="refresh()" class="cursor-pointer">
        Réessayer
      </button>
    </div>
    <p v-else-if="error">Impossible de charger les drops.</p>
    <ul v-else-if="data">
      <li v-for="drop in data.items" :key="drop.id">
        <DropCard :drop="drop" />
      </li>
    </ul>
  </main>
</template>
