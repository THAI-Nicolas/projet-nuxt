<script setup lang="ts">
import type { Health } from "~/types/api";

definePageMeta({ public: true });

const api = useApi();
// useAsyncData : charge les données côté serveur ET client, et expose l'état de la requête
const { data, error, status, refresh } = await useAsyncData("health", () =>
  api<Health>("/health"),
);

// Temps réel : la page prend la connexion le temps d'être affichée (le ticket exige d'être connecté)
const user = useUser();
const realtime = useRealtimeStatus();
const realtimeLabel = computed(() => {
  if (!user.value) return "connexion requise";
  const { state, code } = realtime.value;
  if (state === "open") return "connecté";
  if (state === "connecting") return "connexion…";
  return code ? `déconnecté (code ${code})` : "déconnecté";
});

let release: (() => void) | undefined;
onMounted(() => {
  if (user.value) release = useRealtime().retain();
});
onBeforeUnmount(() => release?.());
</script>
<template>
  <main class="mx-auto max-w-md p-4">
    <h1 class="text-2xl font-bold">Statut de l'API</h1>

    <p v-if="status === 'pending'" role="status">Vérification…</p>

    <UAlert
      v-else-if="error"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="API indisponible"
      :description="`Erreur ${error.status}`"
      class="mt-4"
    />

    <dl v-else-if="data" class="mt-4 grid grid-cols-2 gap-2">
      <dt>API</dt>
      <dd>{{ data.status }}</dd>
      <dt>Base de données</dt>
      <dd>{{ data.db }}</dd>
    </dl>

    <dl class="mt-2 grid grid-cols-2 gap-2">
      <dt>Temps réel</dt>
      <dd aria-live="polite">{{ realtimeLabel }}</dd>
    </dl>

    <UButton
      label="Rafraîchir"
      icon="i-lucide-refresh-cw"
      variant="outline"
      color="neutral"
      class="mt-4"
      :loading="status === 'pending'"
      @click="refresh()"
    />
  </main>
</template>
