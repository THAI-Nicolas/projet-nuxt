<script setup lang="ts">
// Formulaire seul : la section fournit `save` (ajout optimiste), le formulaire affiche les erreurs
const props = defineProps<{
  save: (content: string) => Promise<unknown>;
}>();

const MAX_LENGTH = 500;

const state = reactive({ content: "" });
const form = useTemplateRef("form");

// 429 : bouton désactivé pendant Retry-After
const isRateLimited = ref(false);
const retryMs = ref(0);
const { start: startCooldown } = useTimeoutFn(
  () => (isRateLimited.value = false),
  retryMs,
  { immediate: false },
);

const canSubmit = computed(
  () => state.content.trim().length > 0 && !isRateLimited.value,
);

async function onSubmit() {
  const content = state.content.trim();
  if (!content) return;
  // Optimiste : le champ se vide tout de suite, le commentaire est déjà affiché par la section
  state.content = "";
  form.value?.clear();
  try {
    await props.save(content);
  } catch (e) {
    // Refusé : le texte revient, rien n'est perdu
    state.content = content;
    const apiError = getApiError(e);
    const message =
      apiError?.fields?.content?.[0] ??
      apiError?.message ??
      "Commentaire non publié, réessaie.";
    form.value?.setErrors([
      {
        name: "content",
        message: apiError?.requestId ? `${message} (réf. ${apiError.requestId})` : message,
      },
    ]);
    if (apiError?.status === 429) {
      const retryAfter = Number(
        (e as { response?: Response }).response?.headers.get("Retry-After"),
      );
      retryMs.value = (retryAfter || 5) * 1000;
      isRateLimited.value = true;
      startCooldown();
    }
  }
}
</script>

<template>
  <UForm ref="form" :state="state" class="space-y-3" @submit="onSubmit">
    <UFormField
      name="content"
      label="Ton commentaire"
      :help="`${state.content.length}/${MAX_LENGTH}`"
    >
      <UTextarea
        v-model="state.content"
        :maxlength="MAX_LENGTH"
        :rows="2"
        autoresize
        class="w-full"
      />
    </UFormField>
    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-send"
        :label="isRateLimited ? 'Trop de requêtes, patiente…' : 'Publier'"
        :disabled="!canSubmit"
      />
    </div>
  </UForm>
</template>
