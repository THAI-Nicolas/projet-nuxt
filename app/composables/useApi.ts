const SESSION_ERRORS = [
  "unauthorized",
  "invalid_token",
  "token_expired",
  "token_revoked",
];

export function useApi() {
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
          await nuxtApp.runWithContext(() => navigateTo("/login"));
        }
      }
    },
  });
}
