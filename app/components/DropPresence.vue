<script setup lang="ts">
import type { PublicUser } from "~/types/api";


const props = defineProps<{ viewers: readonly PublicUser[] }>();

const label = computed(() => {
  const n = props.viewers.length;
  return n > 1
    ? `${n} personnes regardent ce drop`
    : "1 personne regarde ce drop";
});
</script>

<template>

  <p v-if="viewers.length" class="flex items-center gap-2 text-sm text-muted">
    <UAvatarGroup :max="3" size="xs" aria-hidden="true">
      <UAvatar
        v-for="viewer in viewers"
        :key="viewer.id"
        :src="viewer.avatarUrl ?? undefined"
        :alt="viewer.displayName"
      />
    </UAvatarGroup>
    <span :title="viewers.map((v) => v.displayName).join(', ')">
      {{ label }}
    </span>
  </p>
</template>
