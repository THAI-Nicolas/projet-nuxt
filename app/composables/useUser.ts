import type { PrivateUser } from "~/types/api";

// undefined = pas encore vérifié, null = pas connecté
export const useUser = () =>
  useState<PrivateUser | null | undefined>("user", () => undefined);
