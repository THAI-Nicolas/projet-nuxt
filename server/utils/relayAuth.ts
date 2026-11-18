import type { H3Event } from "h3";
import type { AuthResponse } from "~~/app/types/api";

// Login et register : l'API renvoie le même { user, token, expiresAt } → même traitement.
// Appelé par deux routes statiques (login.post.ts, register.post.ts) et pas par une route [action] :
// une route dynamique sous /api/auth/ intercepterait aussi GET /api/auth/me (boucle de rendu SSR).
export async function relayAuth(event: H3Event, action: "login" | "register") {
  // JSON uniquement : un formulaire HTML d'un autre site ne peut pas en envoyer → pas de connexion forcée (login CSRF)
  if (!getRequestHeader(event, "content-type")?.includes("application/json")) {
    throw createError({ status: 415, statusText: "Unsupported Media Type" });
  }

  const { apiUrl } = useRuntimeConfig(event);

  const res = await $fetch.raw<AuthResponse>(`/auth/${action}`, {
    baseURL: apiUrl,
    method: "POST",
    body: await readBody(event),
    query: getQuery(event), // laisse passer ?ttl=15 (outil pédagogique)
    ignoreResponseError: true, // une 401, 409 ou 422 est renvoyée telle quelle au navigateur
  });

  if (!res.ok || !res._data) {
    setResponseStatus(event, res.status);
    return res._data; // le corps d'erreur de l'API, inchangé : getApiError() marche toujours
  }

  setAuthCookie(event, res._data.token, res._data.expiresAt);
  return res._data.user; // le token ne quitte jamais le serveur
}
