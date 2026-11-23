<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { PrivateUser } from "~/types/api";

const user = useUser();
const api = useApi();
const toast = useToast();

type ProfileState = { displayName: string; bio: string; avatarUrl: string };

// Page privée : le middleware garantit que `user` est rempli
const state = reactive<ProfileState>({
  displayName: user.value?.displayName ?? "",
  bio: user.value?.bio ?? "",
  avatarUrl: user.value?.avatarUrl ?? "",
});

const form = useTemplateRef("form");
const pending = ref(false);
const errorMessage = ref("");
const requestId = ref("");

// 429 : bouton désactivé pendant Retry-After
const rateLimited = ref(false);
const retryMs = ref(0);
const { start: startCooldown } = useTimeoutFn(
  () => (rateLimited.value = false),
  retryMs,
  { immediate: false },
);

async function onSubmit({ data }: FormSubmitEvent<ProfileState>) {
  if (!user.value) return;
  // Chaîne vide → null : l'API efface la bio / l'avatar
  const body = {
    displayName: data.displayName,
    bio: data.bio || null,
    avatarUrl: data.avatarUrl || null,
  };
  // Seuls les champs modifiés partent (l'API exige au moins un champ)
  const changes = Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => value !== user.value?.[key as keyof typeof body],
    ),
  );
  if (!Object.keys(changes).length) {
    toast.add({ title: "Aucune modification", icon: "i-lucide-info" });
    return;
  }

  pending.value = true;
  errorMessage.value = "";
  requestId.value = "";
  try {
    user.value = await api<PrivateUser>("/auth/me", { method: "PATCH", body: changes });
    toast.add({ title: "Profil mis à jour", icon: "i-lucide-check", color: "success" });
  } catch (e) {
    const apiError = getApiError(e);
    errorMessage.value = apiError?.message ?? "Enregistrement impossible, réessaie.";
    requestId.value = apiError?.requestId ?? "";

    if (apiError?.status === 422) {
      form.value?.setErrors(
        Object.entries(apiError.fields ?? {}).map(([name, messages]) => ({
          name,
          message: messages[0] ?? apiError.message,
        })),
      );
    } else if (apiError?.status === 429) {
      const retryAfter = Number(
        (e as { response?: Response }).response?.headers.get("Retry-After"),
      );
      retryMs.value = (retryAfter || 5) * 1000;
      rateLimited.value = true;
      startCooldown();
    }
  } finally {
    pending.value = false;
  }
}

useSeoMeta({ title: "Mon profil" });
</script>

<template>
  <main v-if="user" class="px-4 py-6">
    <h1 class="text-2xl font-bold">Mon profil</h1>

    <div class="mt-6 flex items-center gap-4">
      <UAvatar
        :src="state.avatarUrl || undefined"
        :alt="state.displayName || user.username"
        size="3xl"
      />
      <div class="min-w-0">
        <p class="truncate font-bold">@{{ user.username }}</p>
        <p class="truncate text-sm text-muted">{{ user.email }}</p>
      </div>
    </div>

    <UForm ref="form" :state="state" class="mt-6 space-y-5" @submit="onSubmit">
      <UFormField name="displayName" label="Nom affiché" required>
        <UInput v-model="state.displayName" class="w-full" />
      </UFormField>

      <UFormField name="bio" label="Bio">
        <UTextarea v-model="state.bio" :rows="3" autoresize class="w-full" />
      </UFormField>

      <UFormField
        name="avatarUrl"
        label="URL de l'avatar"
        help="Lien vers une image (pas d'envoi de fichier)."
      >
        <UInput v-model="state.avatarUrl" type="url" class="w-full" />
      </UFormField>

      <UAlert
        v-if="errorMessage"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
        :description="requestId ? `Réf. ${requestId}` : undefined"
      />

      <UButton
        type="submit"
        :label="rateLimited ? 'Trop de requêtes, patiente…' : 'Enregistrer'"
        :loading="pending"
        :disabled="rateLimited"
        block
      />
    </UForm>
  </main>
</template>
