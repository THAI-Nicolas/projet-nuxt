import type { PublicUser } from "~/types/api";

// Qui regarde ce drop en ce moment (soi-même inclus, dans l'ordre d'arrivée).
// UN SEUL appel par page : le serveur ne retient qu'un drop regardé par connexion,
// et le presence:leave d'un composant qui se démonte effacerait celui des autres.
export function usePresence(dropId: MaybeRefOrGetter<number>) {
  const viewers = ref<PublicUser[]>([]);
  let cleanup: (() => void) | undefined;

  // onMounted : le plugin temps réel n'existe que dans le navigateur
  onMounted(() => {
    const realtime = useRealtime();
    const release = realtime.retain();

    const view = () =>
      realtime.send({
        type: "presence:view",
        data: { dropId: toValue(dropId) },
      });

    const stopDrop = realtime.subscribe("presence:drop", (data) => {
      if (data.dropId === toValue(dropId)) viewers.value = data.viewers;
    });
    // À chaque ouverture, reconnexions comprises : le serveur a oublié ce qu'on regardait
    const stopOpen = realtime.onOpen(view);
    // Autre drop sans démonter la page : un nouveau presence:view remplace l'ancien, pas besoin de leave.
    // Ne réagit qu'à un vrai changement d'id (sinon envoi en boucle → fermeture 4008)
    const stopWatch = watch(
      () => toValue(dropId),
      () => {
        viewers.value = [];
        view();
      },
    );

    cleanup = () => {
      stopWatch();
      stopOpen();
      stopDrop();
      realtime.send({ type: "presence:leave", data: {} });
      release();
    };
  });

  onBeforeUnmount(() => cleanup?.());

  return readonly(viewers);
}
