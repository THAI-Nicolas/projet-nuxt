export default defineEventHandler(async (event) => {
  const token = getAuthCookie(event);
  const { apiUrl } = useRuntimeConfig(event);

  if (token) {
    await $fetch("/auth/logout", {
      baseURL: apiUrl,
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  clearAuthCookie(event);
  setResponseStatus(event, 204);
});
