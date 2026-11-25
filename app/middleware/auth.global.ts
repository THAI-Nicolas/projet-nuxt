import type { PrivateUser } from "~/types/api";

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useUser();

  if (user.value === undefined) {
    user.value = await $fetch<PrivateUser>("/api/auth/me", {
      headers: useRequestHeaders(["cookie"]),
    }).catch(() => null);
  }

  if (!user.value && to.meta.public !== true) return navigateTo("/login");
  if (user.value && ["/login", "/register"].includes(to.path))
    return navigateTo("/drops");
});
