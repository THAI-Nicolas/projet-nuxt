<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ public: true });

const { register } = useAuth();

const fields: AuthFormField[] = [
  {
    name: "username",
    type: "text",
    label: "Nom d'utilisateur",
    autocomplete: "username",
    required: true,
  },
  {
    name: "displayName",
    type: "text",
    label: "Nom affiché",
    autocomplete: "name",
    required: true,
  },
  {
    name: "email",
    type: "email",
    label: "E-mail",
    autocomplete: "email",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Mot de passe",
    autocomplete: "new-password",
    required: true,
  },
];

type RegisterData = {
  username: string;
  displayName: string;
  email: string;
  password: string;
};

const authForm = useTemplateRef("authForm");
const errorMessage = ref("");
const pending = ref(false);

async function onSubmit(event: FormSubmitEvent<RegisterData>) {
  pending.value = true;
  errorMessage.value = "";
  try {
    // Corps explicite : l'API refuse tout champ inconnu (422)
    const { username, displayName, email, password } = event.data;
    await register({ username, displayName, email, password });
    await navigateTo("/drops");
  } catch (e) {
    const apiError = getApiError(e);
    const fieldErrors = Object.entries(apiError?.fields ?? {});
    if (apiError?.status === 422 && fieldErrors.length) {
      // Message global aussi : un champ absent du formulaire (ex. bio) ne s'afficherait nulle part
      errorMessage.value = apiError.message;
      // 422 : chaque message s'affiche sous son champ
      authForm.value?.formRef?.setErrors(
        fieldErrors.map(([name, messages]) => ({
          name,
          message: messages[0] ?? apiError.message,
        })),
      );
    } else {
      // 409 (pseudo ou e-mail déjà pris) et le reste : message global
      errorMessage.value =
        apiError?.message ?? "Inscription impossible, réessaie.";
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="flex justify-center px-4 py-12 sm:py-20">
    <UCard class="w-full max-w-sm">
      <UAuthForm
        ref="authForm"
        :fields="fields"
        icon="i-lucide-droplet"
        title="Créer un compte"
        description="Rejoins Droppy et dépose tes premiers drops."
        :submit="{ label: 'Créer mon compte' }"
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
        <template #footer>
          Déjà un compte ?
          <ULink to="/login" class="font-medium text-primary">
            Se connecter
          </ULink>
        </template>
      </UAuthForm>
    </UCard>
  </main>
</template>
