import type { ApiError } from "~/types/api";

// $fetch range le JSON d'erreur de l'API dans `data`, mais TypeScript ne peut pas le savoir.
// shortcut: on fait confiance au format documenté { error: {...} } ; valider le corps si l'API devient moins fiable.
export function getApiError(e: unknown): ApiError | undefined {
  if (e instanceof Error && "data" in e) {
    const data = e.data as { error?: ApiError } | undefined;
    return data?.error;
  }
}
