<script setup lang="ts">
import type { Drop } from "~/types/api";

defineProps<{
  drop: Drop;
}>();
</script>

<template>
  <!-- relative : le lien du titre s'étend sur toute la carte (after:inset-0) -->
  <article
    class="relative flex gap-3 border-b border-line p-4 transition-colors hover:bg-surface/50"
  >
          <span
            aria-hidden="true"
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface font-bold"
          >
            {{ drop.author.displayName.charAt(0) }}
          </span>

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
            <p v-if="drop.content" class="mt-1">{{ drop.content }}</p>

            <img
              v-if="drop.imageUrl"
              :src="drop.imageUrl"
              alt=""
              loading="lazy"
              class="mt-3 w-50 rounded-2xl"
            />

            <div class="mt-3 flex items-center gap-6 text-sm text-muted">
              <!-- relative z-10 : passe au-dessus du lien qui couvre la carte, sinon le clic ouvrirait le drop -->
              <DropLikeButton
                :drop-id="drop.id"
                :liked-by-me="drop.likedByMe"
                :likes-count="drop.likesCount"
                class="relative z-10 -ml-2.5"
              />
              <div class="flex items-center justify-center gap-1">
                <UIcon name="i-lucide-message-circle" class="size-4" />
                <span>{{ drop.commentsCount }}</span>
                <span class="sr-only">commentaires</span>
              </div>
            </div>
          </div>
        </article>
</template>
