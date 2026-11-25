import type { H3Event } from "h3";
import type { AuthResponse } from "~~/app/types/api";

export async function relayAuth(event: H3Event, action: "login" | "register") {
  if (!getRequestHeader(event, "content-type")?.includes("application/json")) {
    throw createError({ status: 415, statusText: "Unsupported Media Type" });
  }

  const { apiUrl } = useRuntimeConfig(event);

  const res = await $fetch.raw<AuthResponse>(`/auth/${action}`, {
    baseURL: apiUrl,
    method: "POST",
    body: await readBody(event),
    query: getQuery(event),
    ignoreResponseError: true,
  });

  if (!res.ok || !res._data) {
    setResponseStatus(event, res.status);
    return res._data;
  }

  setAuthCookie(event, res._data.token, res._data.expiresAt);
  return res._data.user;
}
