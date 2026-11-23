import type { RealtimeData, ServerMessageType } from "~/types/realtime";

// Écoute un type de message temps réel tant que le composant est monté.
// Réutilise la socket de l'onglet (ou ouvre la seule de l'onglet si personne ne l'utilise encore).
// Pas besoin de l'astuce useRef du cours : en Vue, handler lit les props à jour au moment de l'appel.
export function useRealtimeEvent<T extends ServerMessageType>(
  type: T,
  handler: (data: RealtimeData<T>) => void,
) {
  let cleanup: (() => void) | undefined;

  // onMounted : le plugin temps réel n'existe que dans le navigateur
  onMounted(() => {
    const realtime = useRealtime();
    const release = realtime.retain();
    const unsubscribe = realtime.subscribe(type, handler);
    cleanup = () => {
      unsubscribe();
      release();
    };
  });

  onBeforeUnmount(() => cleanup?.());
}
