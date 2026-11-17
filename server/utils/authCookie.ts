import type { H3Event } from "h3";

const SESSION_COOKIE = "session";

export function setAuthCookie(
  event: H3Event,
  token: string,
  expiresAt: string,
) {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true, // illisible par le JavaScript du navigateur : une faille XSS ne peut pas voler le token
    secure: !import.meta.dev,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt), // le cookie meurt en même temps que le token
  });
}

export function getAuthCookie(event: H3Event) {
  return getCookie(event, SESSION_COOKIE);
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
}
