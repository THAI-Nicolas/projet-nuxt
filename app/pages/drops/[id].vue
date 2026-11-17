<script setup lang="ts">
import type { Category, Drop } from "~/types/api";

// Id non numérique (/drops/abc) → 404 Nuxt directement, sans appeler l'API
definePageMeta({
  validate: (route) => /^\d+$/.test(String(route.params.id)),
});

const route = useRoute();
const api = useApi();
const id = computed(() => String(route.params.id));

// Clé réactive : un cache par drop
const { data: drop, error, refresh } = await useAsyncData(
  () => `drop-${id.value}`,
  () => api<Drop>(`/drops/${id.value}`),
);

// Même clé que la liste : déjà en cache si on arrive depuis /drops
const { data: categories } = await useAsyncData("categories", () =>
  api<Category[]>("/categories"),
);
const categoryLabel = computed(
  () => categories.value?.find((c) => c.id === drop.value?.category)?.label,
);

// 404 : drop inexistant, ou masqué pour quelqu'un d'autre que son auteur
const notFound = computed(() => error.value?.status === 404);

useSeoMeta({ title: () => drop.value?.title ?? "Drop" });
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

    <UEmpty
      v-if="notFound"
      icon="i-lucide-search-x"
      title="Drop introuvable"
      description="Il a peut-être été supprimé ou masqué."
      :actions="[{ label: 'Retour aux drops', to: '/drops' }]"
      class="mt-6"
    />
    <UEmpty
      v-else-if="error"
      role="alert"
      icon="i-lucide-circle-alert"
      title="Impossible de charger ce drop"
      description="Vérifie ta connexion puis réessaie."
      :actions="[{ label: 'Réessayer', icon: 'i-lucide-refresh-cw', onClick: () => refresh() }]"
      class="mt-6"
    />

    <article v-else-if="drop" class="mt-4">
      <header class="space-y-4">
        <UUser
          :name="drop.author.displayName"
          :avatar="{ alt: drop.author.displayName }"
          size="lg"
        >
          <template #description>
            @{{ drop.author.username }} ·
            <NuxtTime
              :datetime="drop.createdAt"
              locale="fr-FR"
              date-style="long"
              time-style="short"
            />
          </template>
        </UUser>

        <div class="flex flex-wrap gap-2">
          <UBadge
            :label="categoryLabel ?? drop.category"
            variant="subtle"
            class="rounded-full"
          />
          <UBadge
            v-if="drop.locked"
            icon="i-lucide-lock"
            label="Verrouillé"
            color="neutral"
            variant="subtle"
            class="rounded-full"
          />
          <UBadge
            v-if="drop.hidden"
            icon="i-lucide-eye-off"
            label="Masqué"
            color="error"
            variant="subtle"
            class="rounded-full"
          />
        </div>

        <h1 class="text-2xl font-bold sm:text-3xl">{{ drop.title }}</h1>
      </header>

      <p v-if="drop.content" class="mt-4 whitespace-pre-line leading-relaxed">
        {{ drop.content }}
      </p>

      <img
        v-if="drop.imageUrl"
        :src="drop.imageUrl"
        :alt="`Photo du drop « ${drop.title} »`"
        class="mt-6 w-full rounded-xl border border-line"
      />

      <p class="mt-4 flex items-center gap-1 text-sm text-muted">
        <UIcon name="i-lucide-map-pin" class="size-4 shrink-0" />
        {{ drop.location.lat.toFixed(4) }}, {{ drop.location.lng.toFixed(4) }}
        <span v-if="drop.location.precision === 'approx'">
          · position approximative
        </span>
      </p>

      <footer
        class="mt-6 flex gap-6 border-y border-line py-3 text-sm text-muted"
      >
        <span class="flex items-center gap-1">
          <UIcon name="i-lucide-heart" class="size-4" />
          {{ drop.likesCount }}
          <span class="sr-only">j'aime</span>
        </span>
        <span class="flex items-center gap-1">
          <UIcon name="i-lucide-message-circle" class="size-4" />
          {{ drop.commentsCount }}
          <span class="sr-only">commentaires</span>
        </span>
        <span class="flex items-center gap-1">
          <UIcon name="i-lucide-eye" class="size-4" />
          {{ drop.opensCount }}
          <span class="sr-only">ouvertures</span>
        </span>
      </footer>
    </article>

    <section
      v-if="drop"
      aria-labelledby="comments-title"
      class="mt-6"
    >
      <h2 id="comments-title" class="text-lg font-bold">
        Commentaires ({{ drop.commentsCount }})
      </h2>
      <!-- À venir : liste des commentaires (GET /drops/{id}/comments), dans un composant DropComments -->
    </section>
  </main>
</template>
