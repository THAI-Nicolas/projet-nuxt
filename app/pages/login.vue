<script setup lang="ts">
definePageMeta({ public: true });

const { login } = useAuth();

const form = reactive({ login: "", password: "" });
const errorMessage = ref("");
const pending = ref(false);

async function onSubmit() {
  pending.value = true;
  errorMessage.value = "";
  try {
    await login(form.login, form.password);
    await navigateTo("/drops");
  } catch (e) {
    errorMessage.value =
      getApiError(e)?.message ?? "Connexion impossible, réessaie.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="p-4">
    <h1 class="text-xl font-bold">Connexion</h1>

    <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
      <div>
        <label for="login" class="block text-sm">Identifiant ou e-mail</label>
        <input
          id="login"
          v-model="form.login"
          autocomplete="username"
          required
          class="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <div>
        <label for="password" class="block text-sm">Mot de passe</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>

      <p v-if="errorMessage" role="alert" class="text-danger">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        :disabled="pending"
        class="rounded-full bg-accent px-4 py-2 font-bold text-bg disabled:opacity-50"
      >
        {{ pending ? "Connexion…" : "Se connecter" }}
      </button>
    </form>
  </main>
</template>
