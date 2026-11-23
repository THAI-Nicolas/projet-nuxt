<script setup lang="ts">
import type { LikeState } from "~/types/api";

const props = defineProps<{
  dropId: number;
  likedByMe: boolean;
  likesCount: number;
}>();

const api = useApi();
const toast = useToast();

// État local : une prop est en lecture seule, et le like doit basculer tout de suite (optimiste)
const isLiked = ref(props.likedByMe);
const likesCount = ref(props.likesCount);
const isPending = ref(false);

// Le parent a rechargé le drop (refresh, nouvelle recherche) : l'API fait foi
watch(
  () => [props.likedByMe, props.likesCount] as const,
  ([liked, count]) => {
    isLiked.value = liked;
    likesCount.value = count;
  },
);

async function toggleLike() {
  // Une requête à la fois : deux requêtes croisées pourraient se terminer dans le désordre
  if (isPending.value) return;
  isPending.value = true;

  const wasLiked = isLiked.value;
  const previousCount = likesCount.value;

  // Optimiste : l'interface bascule tout de suite, sans attendre l'API
  isLiked.value = !wasLiked;
  likesCount.value = previousCount + (wasLiked ? -1 : 1);

  try {
    const state = await api<LikeState>(`/drops/${props.dropId}/like`, {
      method: wasLiked ? "DELETE" : "POST",
    });
    // Confirmé : on recale sur la réponse (le compteur a pu bouger à cause d'autres utilisateurs)
    isLiked.value = state.liked;
    likesCount.value = state.likesCount;
  } catch (e) {
    // Refusé : retour à l'état d'avant et on prévient
    isLiked.value = wasLiked;
    likesCount.value = previousCount;
    toast.add({
      title: wasLiked ? "Impossible de retirer ton j'aime" : "Impossible d'aimer ce drop",
      description: getApiError(e)?.message ?? "Vérifie ta connexion puis réessaie.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <UButton
    icon="i-lucide-heart"
    :label="String(likesCount)"
    size="sm"
    :color="isLiked ? 'error' : 'neutral'"
    :variant="isLiked ? 'soft' : 'ghost'"
    :aria-pressed="isLiked"
    :aria-label="`${isLiked ? 'Ne plus aimer' : 'Aimer'} ce drop, ${likesCount} j'aime`"
    @click="toggleLike"
  />
</template>
