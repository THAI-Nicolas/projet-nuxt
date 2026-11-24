<script setup lang="ts">
import type { DropComment } from "~/types/api";

const props = defineProps<{
  dropId: number;
  // Drop.commentsCount : racines et réponses (le total de la liste ne compte que les racines)
  commentsCount: number;
}>();

// Remonte le total au parent (compteur du footer) : il ne peut pas muter drop.commentsCount (shallowRef)
const totalModel = defineModel<number>("total");

const {
  ready,
  roots,
  error,
  refresh,
  replies,
  total,
  loading,
  canLoadMore,
  loadMore,
  openThreads,
  toggleThread,
  replyTo,
  startReply,
  isPending,
  addComment,
  deleteComment,
} = useDropComments(props.dropId, props.commentsCount);
await ready;

watch(total, (value) => (totalModel.value = value), { immediate: true });

const repliesLabel = (count: number) =>
  `${count} réponse${count > 1 ? "s" : ""}`;

// Une seule modale de confirmation pour tous les commentaires et réponses
const commentToDelete = ref<DropComment>();
const isDeleteModalOpen = computed({
  get: () => commentToDelete.value !== undefined,
  set: (isOpen) => {
    if (!isOpen) commentToDelete.value = undefined;
  },
});

function confirmDelete() {
  const comment = commentToDelete.value;
  commentToDelete.value = undefined;
  if (comment) deleteComment(comment);
}
</script>

<template>
  <section aria-labelledby="comments-title" class="space-y-4">
    <h2 id="comments-title" class="text-lg font-bold">
      Commentaires ({{ total }})
    </h2>

    <UEmpty
      v-if="error"
      role="alert"
      icon="i-lucide-circle-alert"
      title="Impossible de charger les commentaires"
      description="Vérifie ta connexion puis réessaie."
      :actions="[
        {
          label: 'Réessayer',
          icon: 'i-lucide-refresh-cw',
          onClick: () => refresh(),
        },
      ]"
    />

    <template v-else-if="roots">
      <p v-if="roots.items.length === 0" class="text-sm text-muted">
        Aucun commentaire pour l'instant. Lance la discussion !
      </p>
      <ol v-else aria-live="polite" class="divide-y divide-line">
        <li v-for="comment in roots.items" :key="comment.id" class="py-3">
          <DropCommentItem
            :comment="comment"
            :pending="isPending(comment)"
            @reply="startReply(comment.id)"
            @delete="commentToDelete = comment"
          />

          <!-- Fil de réponses (un seul niveau), replié par défaut -->
          <div
            v-if="comment.repliesCount > 0 || replyTo === comment.id"
            class="mt-2 ml-4 space-y-2 border-l border-line pl-4"
          >
            <UButton
              v-if="comment.repliesCount > 0"
              :icon="
                openThreads.has(comment.id)
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              :label="
                openThreads.has(comment.id)
                  ? 'Masquer les réponses'
                  : `Voir ${repliesLabel(comment.repliesCount)}`
              "
              color="neutral"
              variant="link"
              size="sm"
              class="px-0"
              :loading="loading.has(comment.id)"
              :aria-expanded="openThreads.has(comment.id)"
              :aria-controls="`replies-${comment.id}`"
              @click="toggleThread(comment.id)"
            />
            <template v-if="openThreads.has(comment.id) && replies[comment.id]">
              <ol
                :id="`replies-${comment.id}`"
                :aria-label="`Réponses à ${comment.author.displayName}`"
                aria-live="polite"
                class="divide-y divide-line"
              >
                <li
                  v-for="reply in replies[comment.id]?.items"
                  :key="reply.id"
                  class="py-3"
                >
                  <DropCommentItem
                    :comment="reply"
                    :pending="isPending(reply)"
                    @reply="startReply(comment.id)"
                    @delete="commentToDelete = reply"
                  />
                </li>
              </ol>
              <UButton
                v-if="canLoadMore(comment.id)"
                label="Afficher plus de réponses"
                color="neutral"
                variant="ghost"
                size="sm"
                block
                :loading="loading.has(comment.id)"
                @click="loadMore(comment.id)"
              />
            </template>

            <DropCommentForm
              v-if="replyTo === comment.id"
              :label="`Ta réponse à ${comment.author.displayName}`"
              :save="(content) => addComment(content, comment.id)"
              :cancel="() => (replyTo = undefined)"
            />
          </div>
        </li>
      </ol>

      <UButton
        v-if="canLoadMore(null)"
        label="Afficher plus de commentaires"
        color="neutral"
        variant="ghost"
        block
        :loading="loading.has(null)"
        @click="loadMore(null)"
      />

      <DropCommentForm :save="(content) => addComment(content)" />
    </template>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Supprimer ce commentaire ?"
      description="Il sera supprimé définitivement."
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          label="Annuler"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          icon="i-lucide-trash-2"
          label="Supprimer"
          color="error"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </section>
</template>
