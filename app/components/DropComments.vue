<script setup lang="ts">
import type { CommentPage, DropComment } from "~/types/api";

const props = defineProps<{
  dropId: number;
}>();

// Remonte le total au parent (compteur du footer) : il ne peut pas muter drop.commentsCount (shallowRef)
const total = defineModel<number>("total");

const api = useApi();
const toast = useToast();
const user = useUser();

const PAGE_SIZE = 50;
const commentsPath = computed(() => `/drops/${props.dropId}/comments`);

const { data, error, refresh } = await useAsyncData(
  () => `comments-${props.dropId}`,
  () =>
    api<CommentPage>(commentsPath.value, { query: { pageSize: PAGE_SIZE } }),
);

watchEffect(() => {
  total.value = data.value?.total;
});

// data est un shallowRef : on remplace l'objet entier, sinon rien ne se re-rend
function updateItems(
  update: (items: DropComment[]) => DropComment[],
  delta = 0,
) {
  if (!data.value) return;
  data.value = {
    ...data.value,
    items: update(data.value.items),
    total: data.value.total + delta,
  };
}

// Commentaire temporaire (ajout optimiste) : id négatif tant que l'API n'a pas répondu
const isPending = (comment: DropComment) => comment.id < 0;
let lastTempId = 0;

async function addComment(content: string) {
  if (!user.value) throw new Error("Session expirée");
  const { id, username, displayName, avatarUrl } = user.value;
  const temp: DropComment = {
    id: --lastTempId,
    dropId: props.dropId,
    parentId: null,
    content,
    author: { id, username, displayName, avatarUrl },
    isMine: true,
    deleted: false,
    repliesCount: 0,
    likesCount: 0,
    dislikesCount: 0,
    likedByMe: false,
    dislikedByMe: false,
    createdAt: new Date().toISOString(),
  };
  updateItems((items) => [...items, temp], 1);

  try {
    const saved = await api<DropComment>(commentsPath.value, {
      method: "POST",
      body: { content },
    });
    // Le comment:created de notre propre commentaire a pu arriver AVANT cette réponse :
    // il est alors déjà affiché, on retire juste le temporaire (et son +1)
    const alreadyShown = data.value?.items.some((c) => c.id === saved.id);
    updateItems(
      (items) =>
        alreadyShown
          ? items.filter((c) => c.id !== temp.id)
          : items.map((c) => (c.id === temp.id ? saved : c)),
      alreadyShown ? -1 : 0,
    );
  } catch (e) {
    updateItems((items) => items.filter((c) => c.id !== temp.id), -1);
    throw e; // le formulaire remet le texte et affiche l'erreur
  }
}

// En direct : commentaires des autres, et les nôtres envoyés depuis un autre onglet.
// Dédoublonné par id : notre propre commentaire revient aussi par la socket.
useRealtimeEvent("comment:created", ({ comment }) => {
  // Les réponses (parentId renseigné) n'ont pas leur place dans la liste des commentaires de premier niveau
  if (
    comment.dropId !== props.dropId ||
    comment.parentId !== null ||
    !data.value
  )
    return;
  if (data.value.items.some((c) => c.id === comment.id)) return;
  updateItems((items) => [...items, comment], 1);
});

// shortcut: un commentaire supprimé qui n'est pas dans les pages chargées ne décrémente pas le total
// (impossible de le distinguer de notre propre suppression optimiste, déjà comptée) ; un refresh le recale.
useRealtimeEvent("comment:deleted", ({ dropId, commentId }) => {
  if (dropId !== props.dropId) return;
  if (!data.value?.items.some((c) => c.id === commentId)) return; // déjà retiré (le nôtre)
  updateItems((items) => items.filter((c) => c.id !== commentId), -1);
});

// Une seule modale de confirmation pour toute la liste
const commentToDelete = ref<DropComment>();
const isDeleteModalOpen = computed({
  get: () => commentToDelete.value !== undefined,
  set: (isOpen) => {
    if (!isOpen) commentToDelete.value = undefined;
  },
});

async function deleteComment() {
  const comment = commentToDelete.value;
  if (!comment || !data.value) return;
  commentToDelete.value = undefined;

  // Optimiste : retiré tout de suite, en gardant sa place pour pouvoir le remettre
  const index = data.value.items.findIndex((c) => c.id === comment.id);
  updateItems((items) => items.filter((c) => c.id !== comment.id), -1);

  try {
    await api(`/comments/${comment.id}`, { method: "DELETE" });
  } catch (e) {
    const apiError = getApiError(e);
    if (apiError?.status === 404) return; // déjà supprimé : le retrait est juste
    updateItems(
      (items) => [...items.slice(0, index), comment, ...items.slice(index)],
      1,
    );
    toast.add({
      title: "Impossible de supprimer ce commentaire",
      description: apiError?.message ?? "Vérifie ta connexion puis réessaie.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

// shortcut: un ajout/retrait décale la pagination, une page suivante peut sauter ou répéter un commentaire
// (on dédoublonne par id) ; passer à une pagination par curseur si l'API en propose une.
const isLoadingMore = ref(false);
const canLoadMore = computed(
  () => !!data.value && data.value.page < data.value.totalPages,
);

async function loadMore() {
  if (!data.value) return;
  isLoadingMore.value = true;
  try {
    const next = await api<CommentPage>(commentsPath.value, {
      query: { page: data.value.page + 1, pageSize: PAGE_SIZE },
    });
    const knownIds = new Set(data.value.items.map((c) => c.id));
    data.value = {
      ...next,
      items: [
        ...data.value.items,
        ...next.items.filter((c) => !knownIds.has(c.id)),
      ],
    };
  } catch (e) {
    toast.add({
      title: "Impossible de charger la suite",
      description:
        getApiError(e)?.message ?? "Vérifie ta connexion puis réessaie.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    isLoadingMore.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="comments-title" class="space-y-4">
    <h2 id="comments-title" class="text-lg font-bold">
      Commentaires ({{ data?.total ?? 0 }})
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

    <template v-else-if="data">
      <p v-if="data.items.length === 0" class="text-sm text-muted">
        Aucun commentaire pour l'instant. Lance la discussion !
      </p>
      <ol v-else aria-live="polite" class="divide-y divide-line">
        <li
          v-for="comment in data.items"
          :key="comment.id"
          :aria-busy="isPending(comment)"
          class="flex items-start gap-3 py-3 transition-opacity"
          :class="{ 'opacity-60': isPending(comment) }"
        >
          <div class="min-w-0 flex-1">
            <UUser
              :name="comment.author.displayName"
              :avatar="{ alt: comment.author.displayName }"
              size="sm"
            >
              <template #description>
                @{{ comment.author.username }} ·
                <span v-if="isPending(comment)">Envoi…</span>
                <NuxtTime
                  v-else
                  :datetime="comment.createdAt"
                  locale="fr-FR"
                  relative
                />
              </template>
            </UUser>
            <p class="mt-2 whitespace-pre-line break-words">
              {{ comment.content }}
            </p>
          </div>
          <!-- Réservé à l'auteur (l'API renverrait 403 sinon) ; pas pendant l'envoi : pas encore d'id réel -->
          <UButton
            v-if="comment.isMine && !isPending(comment)"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Supprimer mon commentaire"
            @click="commentToDelete = comment"
          />
        </li>
      </ol>

      <UButton
        v-if="canLoadMore"
        label="Afficher plus de commentaires"
        color="neutral"
        variant="ghost"
        block
        :loading="isLoadingMore"
        @click="loadMore"
      />

      <DropCommentForm :save="addComment" />
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
          @click="deleteComment"
        />
      </template>
    </UModal>
  </section>
</template>
