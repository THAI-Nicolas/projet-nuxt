<script setup lang="ts">
import type { DropComment } from "~/types/api";


defineProps<{
  comment: DropComment;
  
  pending?: boolean;
}>();

const emit = defineEmits<{ reply: []; delete: [] }>();
</script>

<template>
  
  <p
    v-if="comment.deleted"
    class="flex items-center gap-2 text-sm text-muted italic"
  >
    <UIcon name="i-lucide-message-square-off" class="size-4 shrink-0" />
    Commentaire supprimé
  </p>
  <div
    v-else
    :aria-busy="pending"
    class="flex items-start gap-3 transition-opacity"
    :class="{ 'opacity-60': pending }"
  >
    <div class="min-w-0 flex-1">
      <UUser
        :name="comment.author.displayName"
        :avatar="{
          src: comment.author.avatarUrl ?? undefined,
          alt: comment.author.displayName,
        }"
        :to="`/users/${comment.author.username}`"
        size="sm"
      >
        <template #description>
          @{{ comment.author.username }} ·
          <span v-if="pending">Envoi…</span>
          <NuxtTime
            v-else
            :datetime="comment.createdAt"
            locale="fr-FR"
            relative
          />
        </template>
      </UUser>
      <p class="mt-2 whitespace-pre-line wrap-break-word">
        {{ comment.content }}
      </p>
      <div class="mt-1 -ml-2.5 flex items-center gap-1">
        <ReactionButtons
          :target="{ kind: 'comment', id: comment.id }"
          :liked-by-me="comment.likedByMe"
          :disliked-by-me="comment.dislikedByMe"
          :likes-count="comment.likesCount"
          :dislikes-count="comment.dislikesCount"
          :disabled="pending"
        />
        <UButton
          v-if="!pending"
          icon="i-lucide-reply"
          label="Répondre"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`Répondre à ${comment.author.displayName}`"
          @click="emit('reply')"
        />
      </div>
    </div>
    
    <UButton
      v-if="comment.isMine && !pending"
      icon="i-lucide-trash-2"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="Supprimer mon commentaire"
      @click="emit('delete')"
    />
  </div>
</template>
