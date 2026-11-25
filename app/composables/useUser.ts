import type { PrivateUser } from "~/types/api";

export const useUser = () =>
  useState<PrivateUser | null | undefined>("user", () => undefined);
