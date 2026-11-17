// invalid_credentials (mauvais mot de passe) n'en fait PAS partie : c'est le formulaire qui l'affiche.
const SESSION_ERRORS = [
  "unauthorized",
  "invalid_token",
  "token_expired",
  "token_revoked",
];

export function useApi() {
  // Pendant le rendu serveur, Nuxt s'appelle lui-même : il faut lui retransmettre le cookie du visiteur
  const headers = useRequestHeaders(["cookie"]);
  const nuxtApp = useNuxtApp();
  const route = useRoute();
  const user = useUser();

  return $fetch.create({
    baseURL: "/api",
    headers,
    async onResponseError({ response }) {
      if (
        response.status === 401 &&
        SESSION_ERRORS.includes(response._data?.error?.code)
      ) {
        user.value = null;
        if (route.meta.public !== true) {
          // runWithContext : navigateTo a besoin du contexte Nuxt, perdu après un await
          await nuxtApp.runWithContext(() => navigateTo("/login"));
        }
      }
    },
  });
}
