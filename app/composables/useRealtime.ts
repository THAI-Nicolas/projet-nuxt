// La connexion temps réel de l'onglet (plugins/realtime.client.ts).
// N'existe que dans le navigateur : à appeler dans onMounted / onBeforeUnmount, jamais directement dans le setup.
export const useRealtime = () => useNuxtApp().$realtime;

// État de la socket, lisible partout (rendu serveur compris : « closed » par défaut). Seul le plugin l'écrit.
// code : code de la dernière fermeture (1000, 1006, 4001…), utile pour déboguer
export const useRealtimeStatus = () =>
  useState<{ state: "closed" | "connecting" | "open"; code?: number }>(
    "realtime-status",
    () => ({ state: "closed" }),
  );
