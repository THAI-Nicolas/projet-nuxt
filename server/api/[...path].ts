export default defineEventHandler((event) => {
  const { apiUrl } = useRuntimeConfig(event);
  const path = event.path.slice("/api".length); 

  if (path.startsWith("/admin")) {
    throw createError({ status: 403, statusText: "Forbidden" });
  }

  const token = getAuthCookie(event);

  return proxyRequest(event, apiUrl + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onResponse(event, response) {
      if (response.status === 401) clearAuthCookie(event);
    },
  });
});
