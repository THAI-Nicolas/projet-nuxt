<script setup lang="ts">
import type { Drop } from "~/types/api";

const props = defineProps<{
  drop: Drop;
  active?: boolean;
}>();

const emit = defineEmits<{ locate: [] }>();

const commentsCount = ref(props.drop.commentsCount);
watch(
  () => props.drop.commentsCount,
  (count) => (commentsCount.value = count),
);

useRealtimeEvent("comment:created", ({ comment }) => {
  if (comment.dropId === props.drop.id) commentsCount.value += 1;
});
useRealtimeEvent("comment:deleted", ({ dropId }) => {
  if (dropId === props.drop.id) commentsCount.value -= 1;
});

const MAX_CHARS = 280;
const expanded = ref(false);
const content = computed(() => props.drop.content ?? "");
const long = computed(() => content.value.length > MAX_CHARS);
const text = computed(() =>
  long.value && !expanded.value
    ? `${content.value.slice(0, MAX_CHARS).trimEnd()}…`
    : content.value,
);
</script>

<template>
  <article
    class="relative flex gap-3 border-b border-line p-4 transition-colors hover:bg-surface/50"
    :class="{ 'bg-surface ring-1 ring-accent ring-inset': active }"
  >
    <NuxtLink
      :to="`/users/${drop.author.username}`"
      :aria-label="`Profil de ${drop.author.displayName}`"
      class="relative z-10 shrink-0 self-start rounded-full"
    >
      <UAvatar
        :src="drop.author.avatarUrl ?? undefined"
        :alt="drop.author.displayName"
        size="xl"
        aria-hidden="true"
      />
    </NuxtLink>

    <div class="min-w-0 flex-1">
      <p class="text-sm">
        <span class="font-bold">{{ drop.author.displayName }}</span>
        <span class="text-muted"> @{{ drop.author.username }}</span>
      </p>
      <p class="text-xs text-accent capitalize">{{ drop.category }}</p>

      <h2 class="mt-2 font-bold">
        <NuxtLink
          :to="`/drops/${drop.id}`"
          class="after:absolute after:inset-0"
        >
          {{ drop.title }}
        </NuxtLink>
      </h2>
      <p v-if="drop.content" class="mt-1 whitespace-pre-line">{{ text }}</p>
      <UButton
        v-if="long"
        :label="expanded ? 'Réduire' : 'Lire la suite'"
        variant="link"
        size="xs"
        :aria-expanded="expanded"
        class="relative z-10 -ml-1 px-1"
        @click="expanded = !expanded"
      />

      <img
        v-if="drop.imageUrl"
        :src="drop.imageUrl"
        alt=""
        loading="lazy"
        class="mt-3 w-50 rounded-2xl"
      />

      <div class="mt-3 flex items-center gap-6 text-sm text-muted">
        <ReactionButtons
          :target="{ kind: 'drop', id: drop.id }"
          :liked-by-me="drop.likedByMe"
          :disliked-by-me="drop.dislikedByMe"
          :likes-count="drop.likesCount"
          :dislikes-count="drop.dislikesCount"
          class="relative z-10 -ml-2.5"
        />
        <div class="flex items-center justify-center gap-1">
          <UIcon name="i-lucide-message-circle" class="size-4" />
          <span>{{ commentsCount }}</span>
          <span class="sr-only">commentaires</span>
        </div>
        <UButton
          icon="i-lucide-map-pin"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`Voir « ${drop.title} » sur la carte`"
          class="relative z-10 ml-auto"
          @click="emit('locate')"
        />
      </div>
    </div>
  </article>
</template>
