<script setup lang="ts">
import type { Drop } from "~/types/api";

// À n'afficher que si drop.isMine : le parent fait le v-if, l'API refuse de toute façon (403)
const props = defineProps<{
  drop: Drop;
}>();

const api = useApi();
const toast = useToast();

const open = ref(false);
const deleting = ref(false);
const errorMessage = ref("");
const requestId = ref("");

function openModal() {
  errorMessage.value = "";
  requestId.value = "";
}

async function leave(title: string) {
  open.value = false;
  toast.add({ title, icon: "i-lucide-trash-2", color: "success" });
  // La liste se recharge à l'arrivée sur /drops : pas de cache à vider à la main
  await navigateTo("/drops");
}

async function remove() {
  deleting.value = true;
  errorMessage.value = "";
  try {
    await api(`/drops/${props.drop.id}`, { method: "DELETE" });
    await leave("Drop supprimé");
  } catch (e) {
    const apiError = getApiError(e);
    // 404 : déjà supprimé (autre onglet) → même issue qu'une suppression réussie
    if (apiError?.status === 404) return await leave("Ce drop était déjà supprimé");
    errorMessage.value = apiError?.message ?? "Suppression impossible, réessaie.";
    requestId.value = apiError?.requestId ?? "";
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="flex gap-2">
    <UButton
      :to="`/drops/${drop.id}/edit`"
      icon="i-lucide-pencil"
      label="Modifier"
      color="neutral"
      variant="outline"
      size="sm"
    />

    <UModal
      v-model:open="open"
      title="Supprimer ce drop ?"
      :description="`« ${drop.title} » sera supprimé définitivement.`"
      :dismissible="!deleting"
      :close="!deleting"
      :ui="{ footer: 'justify-end' }"
    >
      <UButton
        icon="i-lucide-trash-2"
        label="Supprimer"
        color="error"
        variant="outline"
        size="sm"
        @click="openModal"
      />

      <template v-if="errorMessage" #body>
        <UAlert
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
          :description="requestId ? `Réf. ${requestId}` : undefined"
        />
      </template>

      <template #footer="{ close }">
        <UButton
          label="Annuler"
          color="neutral"
          variant="ghost"
          :disabled="deleting"
          @click="close"
        />
        <UButton
          icon="i-lucide-trash-2"
          label="Supprimer"
          color="error"
          :loading="deleting"
          @click="remove"
        />
      </template>
    </UModal>
  </div>
</template>
