export default defineEventHandler(async (event) => {
  const token = getAuthCookie(event);
  const { apiUrl } = useRuntimeConfig(event);

  if (token) {
    // Révoque le token côté API ; même en cas d'échec, on supprime le cookie
    await $fetch("/auth/logout", {
      baseURL: apiUrl,
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  clearAuthCookie(event);
  setResponseStatus(event, 204);
});
