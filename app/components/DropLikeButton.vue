<script setup lang="ts">
import type { Drop, LikeState } from "~/types/api";

const props = defineProps<{
  drop: Drop;
}>();

const api = useApi();
const toast = useToast();

// État local : les données de useAsyncData sont un shallowRef (Nuxt 4), muter drop.likedByMe ne re-rendrait rien
const isLiked = ref(props.drop.likedByMe);
const likesCount = ref(props.drop.likesCount);
const isPending = ref(false);

// Le parent a rechargé le drop (refresh, nouvelle recherche) : l'API fait foi
watch(
  () => [props.drop.likedByMe, props.drop.likesCount] as const,
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
    const state = await api<LikeState>(`/drops/${props.drop.id}/like`, {
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
