import type { PrivateUser } from "~/types/api";

// .global : s'exécute avant CHAQUE changement de page
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useUser();

  // Le navigateur ne peut pas lire le cookie httpOnly : on demande à l'API qui est connecté.
  // Une seule fois (au premier chargement), ensuite useState garde la réponse.
  if (user.value === undefined) {
    user.value = await $fetch<PrivateUser>("/api/auth/me", {
      headers: useRequestHeaders(["cookie"]),
    }).catch(() => null);
  }

  if (!user.value && to.meta.public !== true) return navigateTo("/login");
  if (user.value && to.path === "/login") return navigateTo("/drops");
});
