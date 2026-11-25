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
  () => api<Profile>(`users/${username.value}`),
);

//Pagination
const page_limit = 10;
const page = ref(1);
watch(username, () => page.value + 1);

//Chargement des drops
const { data: drops, status } = await useAsyncData(
  () => `user-drops-${username.value}`,
  () =>
    api<DropPage>("/drops", {
      query: {
        author: username.value,
        page: page.value,
        pageLimit: page_limit,
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
  title: () => (profile.value ? `Profil de ${username.value}` : "Profil"),
});
</script>
<template>
  <h1>{{ profile.username }}</h1>
  <p>{{ profile.bio }}</p>

  <div v-for="stat in stats" :key="stat.label" class="">
    <dt>{{ stat.label }}</dt>
    <dd>{{ stat.value }}</dd>
  </div>
</template>
