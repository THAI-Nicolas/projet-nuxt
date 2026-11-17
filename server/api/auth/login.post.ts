import type { AuthResponse } from "~~/app/types/api";

export default defineEventHandler(async (event) => {
  const { apiUrl } = useRuntimeConfig(event);

  const res = await $fetch.raw<AuthResponse>("/auth/login", {
    baseURL: apiUrl,
    method: "POST",
    body: await readBody(event),
    query: getQuery(event), // laisse passer ?ttl=15 (outil pédagogique)
    ignoreResponseError: true, // une 401 ou une 422 est renvoyée telle quelle au navigateur
  });

  if (!res.ok || !res._data) {
    setResponseStatus(event, res.status);
    return res._data; // le corps d'erreur de l'API, inchangé : getApiError() marche toujours
  }

  setAuthCookie(event, res._data.token, res._data.expiresAt);
  return res._data.user; // le token ne quitte jamais le serveur
});
