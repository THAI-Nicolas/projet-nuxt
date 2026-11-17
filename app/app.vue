<template>
  <UApp>
    <!-- Barre en haut de page pendant les changements de page (données chargées avant l'affichage) -->
    <NuxtLoadingIndicator color="var(--color-accent)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
