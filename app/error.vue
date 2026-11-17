<script setup lang="ts">
import type { NuxtError } from "#app";

defineProps<{ error: NuxtError }>();
</script>

<template>
  <main class="p-4">
    <h1 class="text-xl font-bold">
      {{
        error.status === 404 ? "Page introuvable" : "Une erreur est survenue"
      }}
    </h1>
    <button
      type="button"
      class="mt-4 underline cursor-pointer"
      @click="clearError({ redirect: '/drops' })"
    >
      Retour aux drops
    </button>
  </main>
</template>
