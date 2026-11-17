import type { PrivateUser } from "~/types/api";

export function useAuth() {
  const api = useApi();
  const user = useUser();

  async function login(login: string, password: string) {
    // Le serveur Nuxt pose le cookie httpOnly et ne nous renvoie que l'utilisateur
    user.value = await api<PrivateUser>("/auth/login", {
      method: "POST",
      body: { login, password },
    });
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    user.value = null;
    await navigateTo("/login");
  }

  return { user, login, logout };
}
