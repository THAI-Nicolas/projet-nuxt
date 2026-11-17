<script setup lang="ts">
import type { DropPage } from "~/types/api";

const api = useApi();

const { data, error, status } = await useAsyncData("drops", () =>
  api<DropPage>("/drops"),
);
</script>

<template>
  <main>
    <h1>Drops</h1>
    <h2>Liste de tous les drops</h2>

    <p v-if="status === 'pending'">Chargement…</p>
    <p v-else-if="error">Impossible de charger les drops.</p>
    <ul v-else-if="data">
      <li v-for="drop in data.items" :key="drop.id">
        <DropCard :drop="drop" />
      </li>
    </ul>
  </main>
</template>
