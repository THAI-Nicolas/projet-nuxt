// Codes qui signifient « ta session n'est plus valide ».
// invalid_credentials (mauvais mot de passe) n'en fait PAS partie : pas de déconnexion.
const SESSION_ERRORS = ["invalid_token", "token_expired", "token_revoked"];

export function useApi() {
  const { apiUrl } = useRuntimeConfig().public;
  const token = useCookie<string | null>("auth_token");

  return $fetch.create({
    baseURL: apiUrl,
    onRequest({ options }) {
      if (token.value)
        options.headers.set("Authorization", `Bearer ${token.value}`);
    },
    onResponseError({ response }) {
      if (
        response.status === 401 &&
        SESSION_ERRORS.includes(response._data?.error?.code)
      ) {
        token.value = null; // supprime le cookie
      }
    },
  });
}
