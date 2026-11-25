<script setup lang="ts">
defineProps<{ loading?: boolean }>();

const search = defineModel<string>({ required: true });

const id = useId();
</script>

<template>
  <form role="search" @submit.prevent>
    <label :for="id" class="sr-only">Rechercher un drop</label>
    <UInput
      :id="id"
      v-model="search"
      type="search"
      icon="i-lucide-search"
      :loading="loading"
      placeholder="Rechercher un drop"
      size="lg"
      class="w-full"
    />
  </form>
</template>
