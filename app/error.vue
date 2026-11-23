<script setup lang="ts">
import type { NuxtError } from "#app";
import { fr } from "@nuxt/ui/locale";

const props = defineProps<{ error: NuxtError }>();

const is404 = computed(() => props.error.status === 404);
useHead({ title: () => (is404.value ? "Page introuvable" : "Erreur") });
</script>

<template>
  <!-- error.vue remplace app.vue : il faut redonner UApp (locale fr, toasts) -->
  <UApp :locale="fr">
    <NuxtLayout>
      <main class="p-4">
        <UError
          :error="
            is404
              ? {
                  status: 404,
                  statusText: 'Page introuvable',
                  message: 'Cette page n\'existe pas (ou plus).',
                }
              : error
          "
          redirect="/drops"
        />
      </main>
    </NuxtLayout>
  </UApp>
</template>
