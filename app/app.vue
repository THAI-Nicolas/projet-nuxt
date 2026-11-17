<script setup lang="ts">
// Textes internes de Nuxt UI en français (ex. « Afficher le mot de passe »)
import { fr } from "@nuxt/ui/locale";
</script>

<template>
  <UApp :locale="fr">
    <!-- Barre en haut de page pendant les changements de page (données chargées avant l'affichage) -->
    <NuxtLoadingIndicator color="var(--color-accent)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
