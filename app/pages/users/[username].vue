<script setup lang="ts">
import type { DropPage, Profile } from "~/types/api";

const route = useRoute();
const api = useApi();
const username = computed(() => String(route.params.username));

//Chargement du profil
const {
  data: profile,
  error,
  refresh,
} = await useAsyncData(
  () => `user-${username.value}`,
  () => api<Profile>(`/users/${username.value}`),
);

//Pagination
const page_limit = 5;
const page = ref(1);
watch(username, () => (page.value = 1));

//Chargement des drops
const { data: drops, status } = await useAsyncData(
  () => `user-drops-${username.value}`,
  () =>
    api<DropPage>("/drops", {
      query: {
        author: username.value,
        page: page.value,
        pageSize: page_limit,
      },
    }),
  { watch: [page] },
);

//Stats
const stats = computed(() =>
  profile.value
    ? [
        { label: "Drops", value: profile.value.stats.dropsCount },
        { label: "Commentaires", value: profile.value.stats.commentsCount },
        { label: "Likes reçus", value: profile.value.stats.likesReceived },
      ]
    : [],
);

useSeoMeta({
  title: () =>
    profile.value ? `Profil de ${profile.value.displayName}` : "Profil",
});
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
      v-if="error?.status === 404"
      icon="i-lucide-user-x"
      title="Utilisateur introuvable"
      :actions="[{ label: 'Retour aux drops', to: '/drops' }]"
      class="mt-6"
    />
    <UEmpty
      v-else-if="error"
      role="alert"
      icon="i-lucide-circle-alert"
      title="Impossible de charger ce profil"
      description="Vérifie ta connexion puis réessaie."
      :actions="[
        {
          label: 'Réessayer',
          icon: 'i-lucide-refresh-cw',
          onClick: () => refresh(),
        },
      ]"
      class="mt-6"
    />

    <template v-else-if="profile">
      <header class="mt-4 flex items-center gap-4">
        <UAvatar
          :src="profile.avatarUrl ?? undefined"
          :alt="profile.displayName"
          size="3xl"
          class="shrink-0"
        />
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-bold">{{ profile.displayName }}</h1>
          <p class="truncate text-sm text-muted">@{{ profile.username }}</p>
          <p class="text-xs text-muted">
            Inscrit le
            <NuxtTime
              :datetime="profile.createdAt"
              locale="fr-FR"
              date-style="long"
            />
          </p>
        </div>
      </header>

      <p v-if="profile.bio" class="mt-4 whitespace-pre-line">
        {{ profile.bio }}
      </p>

      <dl class="mt-6 grid grid-cols-3 gap-2 text-center">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-xl border border-line p-3"
        >
          <dt class="text-xs text-muted">{{ stat.label }}</dt>
          <dd class="text-xl font-bold">{{ stat.value }}</dd>
        </div>
      </dl>

      <section class="mt-8" aria-labelledby="user-drops-title">
        <h2 id="user-drops-title" class="text-lg font-bold">
          Drops de {{ profile.displayName }}
        </h2>

        <p v-if="drops && drops.items.length === 0" class="mt-2 text-muted">
          Aucun drop publié.
        </p>

        <ul
          v-else-if="drops"
          :aria-busy="status === 'pending'"
          class="mt-2 border-t border-line transition-opacity"
          :class="{ 'opacity-50': status === 'pending' }"
        >
          <li v-for="drop in drops.items" :key="drop.id">
            <DropCard :drop="drop" @locate="navigateTo(`/drops/${drop.id}`)" />
          </li>
        </ul>

        <UPagination
          v-if="drops && drops.totalPages > 1"
          v-model:page="page"
          :total="drops.total"
          :items-per-page="page_limit"
          class="mt-4 flex justify-center"
        />
      </section>
    </template>
  </main>
</template>
