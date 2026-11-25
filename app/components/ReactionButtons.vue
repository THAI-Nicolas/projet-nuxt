<script setup lang="ts">
import type { LikeState } from "~/types/api";

const props = defineProps<{
  target: { kind: "drop" | "comment"; id: number };
  likedByMe: boolean;
  dislikedByMe: boolean;
  likesCount: number;
  dislikesCount: number;
  disabled?: boolean;
}>();

type Reaction = "like" | "dislike";

const api = useApi();
const toast = useToast();

const state = ref<LikeState>(fromProps());
const isPending = ref(false);

function fromProps(): LikeState {
  return {
    liked: props.likedByMe,
    disliked: props.dislikedByMe,
    likesCount: props.likesCount,
    dislikesCount: props.dislikesCount,
  };
}


watch(
  () => [
    props.likedByMe,
    props.dislikedByMe,
    props.likesCount,
    props.dislikesCount,
  ],
  () => {
    if (!isPending.value) state.value = fromProps();
  },
);

function syncCounts(counts: { likesCount: number; dislikesCount: number }) {
  if (isPending.value) return;
  state.value = { ...state.value, ...counts };
}
useRealtimeEvent("like:updated", ({ dropId, likesCount, dislikesCount }) => {
  if (props.target.kind === "drop" && dropId === props.target.id)
    syncCounts({ likesCount, dislikesCount });
});
useRealtimeEvent("comment:updated", ({ comment }) => {
  if (props.target.kind === "comment" && comment.id === props.target.id)
    syncCounts(comment);
});

const nouns = { drop: "ce drop", comment: "ce commentaire" };

async function react(reaction: Reaction) {
  if (isPending.value || props.disabled) return;
  isPending.value = true;

  const previous = state.value;
  const isLike = reaction === "like";
  const wasActive = isLike ? previous.liked : previous.disliked;

  const liked = isLike ? !wasActive : wasActive ? previous.liked : false;
  const disliked = isLike
    ? wasActive
      ? previous.disliked
      : false
    : !wasActive;
  state.value = {
    liked,
    disliked,
    likesCount: previous.likesCount + Number(liked) - Number(previous.liked),
    dislikesCount:
      previous.dislikesCount + Number(disliked) - Number(previous.disliked),
  };

  try {
    const path = `/${props.target.kind}s/${props.target.id}/${reaction}`;
    state.value = await api<LikeState>(path, {
      method: wasActive ? "DELETE" : "POST",
    });
  } catch (e) {
    state.value = previous;
    toast.add({
      title: `Impossible de réagir à ${nouns[props.target.kind]}`,
      description:
        getApiError(e)?.message ?? "Vérifie ta connexion puis réessaie.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UButton
      icon="i-lucide-thumbs-up"
      :label="String(state.likesCount)"
      size="sm"
      :color="state.liked ? 'primary' : 'neutral'"
      :variant="state.liked ? 'soft' : 'ghost'"
      :disabled="disabled"
      :aria-pressed="state.liked"
      :aria-label="`${state.liked ? 'Retirer mon j’aime' : 'Aimer'} ${nouns[target.kind]}, ${state.likesCount} j’aime`"
      @click="react('like')"
    />
    <UButton
      icon="i-lucide-thumbs-down"
      :label="String(state.dislikesCount)"
      size="sm"
      :color="state.disliked ? 'error' : 'neutral'"
      :variant="state.disliked ? 'soft' : 'ghost'"
      :disabled="disabled"
      :aria-pressed="state.disliked"
      :aria-label="`${state.disliked ? 'Retirer mon je n’aime pas' : 'Ne pas aimer'} ${nouns[target.kind]}, ${state.dislikesCount} je n’aime pas`"
      @click="react('dislike')"
    />
  </div>
</template>
