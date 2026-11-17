<script setup lang="ts">
interface Health {
  status: string;
  time: string;
  uptimeSeconds: number;
  db: string;
}

const api = useApi();
// useAsyncData : charge les données côté serveur ET client, et expose l'état de la requête
const { data, error, status, refresh } = await useAsyncData("health", () =>
  api<Health>("/health"),
);
</script>
<template>
  <main class="mx-auto max-w-md p-4">
    <h1 class="text-2xl font-bold">Statut de l'API</h1>

    <p v-if="status === 'pending'" role="status">Vérification…</p>
    <p v-else-if="error" role="alert" class="text-red-700">
      API indisponible (erreur {{ error.statusCode }})
    </p>
    <dl v-else-if="data" class="mt-4 grid grid-cols-2 gap-2">
      <dt>API</dt>
      <dd>{{ data.status }}</dd>
      <dt>Base de données</dt>
      <dd>{{ data.db }}</dd>
    </dl>

    <button
      type="button"
      class="mt-4 rounded border px-3 py-1"
      :disabled="status === 'pending'"
      @click="refresh()"
    >
      Rafraîchir
    </button>
  </main>
</template>
