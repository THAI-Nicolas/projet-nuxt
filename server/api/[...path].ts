// Toutes les autres requêtes /api/* sont relayées vers l'API Drops, avec le token lu dans le cookie httpOnly
export default defineEventHandler((event) => {
  const { apiUrl } = useRuntimeConfig(event);
  const path = event.path.slice("/api".length); // ex. /drops?q=velo

  // Routes interdites côté client (AGENTS.md)
  if (path.startsWith("/admin")) {
    throw createError({ status: 403, statusText: "Forbidden" });
  }

  const token = getAuthCookie(event);

  return proxyRequest(event, apiUrl + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onResponse(event, response) {
      // Ici, une 401 veut toujours dire « session absente ou morte » (le login a sa propre route)
      if (response.status === 401) clearAuthCookie(event);
    },
  });
});
