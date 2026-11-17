<script setup lang="ts">
import type { Drop } from "~/types/api";

defineProps<{
  drop: Drop;
}>();
</script>

<template>
  <article class="flex gap-3 border-b border-line p-4">
          <!-- Avatar : l'initiale du nom (aucun compte n'a encore de photo) -->
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

            <h2 class="mt-2 font-bold">{{ drop.title }}</h2>
            <p v-if="drop.content" class="mt-1">{{ drop.content }}</p>

            <img
              v-if="drop.imageUrl"
              :src="drop.imageUrl"
              alt=""
              loading="lazy"
              class="mt-3 w-50 rounded-2xl"
            />

            <p class="mt-3 flex gap-6 text-sm text-muted">
              <div class="flex align-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart preview-icon"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>
                <span>{{ drop.commentsCount }}</span>
              </div>
              <div class="flex align-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle preview-icon"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>
                <span>{{ drop.likesCount }}</span>
              </div>
              
              
            </p>
          </div>
        </article>
</template>
