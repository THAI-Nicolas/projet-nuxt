<script setup lang="ts">
import type { Category } from "~/types/api";

defineProps<{ categories: Category[] }>();
const selected = defineModel<Category["id"] | undefined>();
</script>

<template>
  <div
    role="group"
    aria-label="Filtrer par catégorie"
    class="flex flex-wrap gap-2"
  >
    <UButton
      label="Toutes"
      size="sm"
      class="rounded-full"
      :color="selected ? 'neutral' : 'primary'"
      :variant="selected ? 'outline' : 'solid'"
      :aria-pressed="!selected"
      @click="selected = undefined"
    />
    <UButton
      v-for="category in categories"
      :key="category.id"
      :label="category.label"
      size="sm"
      class="rounded-full"
      :color="selected === category.id ? 'primary' : 'neutral'"
      :variant="selected === category.id ? 'solid' : 'outline'"
      :aria-pressed="selected === category.id"
      @click="selected = selected === category.id ? undefined : category.id"
    />
  </div>
</template>
