<script setup lang="ts">
import type { Drop } from "~/types/api";

// À n'afficher que si drop.isMine : le parent fait le v-if, l'API refuse de toute façon (403)
defineProps<{
  drop: Drop;
}>();
</script>

<template>
  <div class="flex gap-2">
    <UButton
      :to="`/drops/${drop.id}/edit`"
      icon="i-lucide-pencil"
      label="Modifier"
      color="neutral"
      variant="outline"
      size="sm"
    />
  </div>
</template>
