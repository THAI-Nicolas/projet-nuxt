import type { PrivateUser } from "~/types/api";

export function useAuth() {
  const api = useApi();
  const user = useUser();

  async function login(login: string, password: string) {
    user.value = await api<PrivateUser>("/auth/login", {
      method: "POST",
      body: { login, password },
    });
  }
  
  async function register(body: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) {
    user.value = await api<PrivateUser>("/auth/register", {
      method: "POST",
      body,
    });
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    user.value = null;
    await navigateTo("/login");
  }

  return { user, login, register, logout };
}
