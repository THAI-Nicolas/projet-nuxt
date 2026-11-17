<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ public: true });

const { login } = useAuth();

// UAuthForm génère les champs (label relié, œil sur le mot de passe) depuis ce tableau
const fields: AuthFormField[] = [
  {
    name: "login",
    type: "text",
    label: "Identifiant ou e-mail",
    autocomplete: "username",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Mot de passe",
    autocomplete: "current-password",
    required: true,
  },
];

const errorMessage = ref("");
const pending = ref(false);

async function onSubmit(
  event: FormSubmitEvent<{ login: string; password: string }>,
) {
  pending.value = true;
  errorMessage.value = "";
  try {
    await login(event.data.login, event.data.password);
    await navigateTo("/drops");
  } catch (e) {
    // 401 invalid_credentials : message dans le formulaire, pas de déconnexion
    errorMessage.value =
      getApiError(e)?.message ?? "Connexion impossible, réessaie.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="flex justify-center px-4 py-12 sm:py-20">
    <UCard class="w-full max-w-sm">
      <UAuthForm
        :fields="fields"
        icon="i-lucide-droplet"
        title="Connexion"
        description="Content de te revoir sur Droppy."
        :submit="{ label: 'Se connecter' }"
        :loading="pending"
        @submit="onSubmit"
      >
        <template #validation>
          <UAlert
            v-if="errorMessage"
            role="alert"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />
        </template>
      </UAuthForm>
    </UCard>
  </main>
</template>
