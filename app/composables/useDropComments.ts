import type { CommentPage, DropComment } from "~/types/api";

const PAGE_SIZE = 50;

// null : commentaires de premier niveau ; sinon id du commentaire racine dont on lit les réponses
type ParentId = number | null;

// Commentaires d'un drop : premier niveau (chargé avec la page) et fils de réponses (chargés au clic).
// Un seul jeu d'écouteurs temps réel pour toutes les listes. `total` compte racines et réponses (= Drop.commentsCount).
// Appeler dans le setup, puis `await ready` (rendu serveur du premier niveau).
export function useDropComments(dropId: number, initialTotal: number) {
  const api = useApi();
  const toast = useToast();
  const user = useUser();

  const rootsPath = `/drops/${dropId}/comments`;
  const roots = useAsyncData(`comments-${dropId}`, () =>
    api<CommentPage>(rootsPath, { query: { pageSize: PAGE_SIZE } }),
  );
  // Fils de réponses déjà chargés, par id du commentaire racine
  const replies = shallowRef<Record<number, CommentPage>>({});
  const total = ref(initialTotal);

  const getList = (parentId: ParentId) =>
    parentId === null ? roots.data.value : replies.value[parentId];

  // Les pages sont des shallowRef : on remplace l'objet entier, sinon rien ne se re-rend
  function setList(parentId: ParentId, page: CommentPage) {
    if (parentId === null) roots.data.value = page;
    else replies.value = { ...replies.value, [parentId]: page };
  }

  // Un commentaire en plus ou en moins : total du drop et, pour une réponse, repliesCount de sa racine
  function count(parentId: ParentId, delta: number) {
    total.value += delta;
    if (parentId !== null)
      updateList(null, (items) =>
        items.map((c) =>
          c.id === parentId
            ? { ...c, repliesCount: c.repliesCount + delta }
            : c,
        ),
      );
  }

  function updateList(
    parentId: ParentId,
    update: (items: DropComment[]) => DropComment[],
    delta = 0,
    // Différent de delta pour une trace : elle reste dans la liste mais ne compte plus dans le total du drop
    countDelta = delta,
  ) {
    const page = getList(parentId);
    if (!page) return;
    setList(parentId, {
      ...page,
      items: update(page.items),
      total: page.total + delta,
    });
    if (countDelta) count(parentId, countDelta);
  }

  // Racine supprimée qui a des réponses : l'API la garde en « trace » pour ne pas orpheliner le fil
  const toTrace = (comment: DropComment): DropComment => ({
    ...comment,
    deleted: true,
    content: "",
    isMine: false,
    author: {
      id: 0,
      username: "deleted",
      displayName: "Commentaire supprimé",
      avatarUrl: null,
    },
  });

  // Liste qui contient ce commentaire (premier niveau ou fil chargé), undefined si aucune
  function findParent(commentId: number): ParentId | undefined {
    if (roots.data.value?.items.some((c) => c.id === commentId)) return null;
    const entry = Object.entries(replies.value).find(([, page]) =>
      page.items.some((c) => c.id === commentId),
    );
    return entry ? Number(entry[0]) : undefined;
  }

  // shortcut: un ajout/retrait décale la pagination, une page suivante peut sauter ou répéter un commentaire
  // (on dédoublonne par id) ; passer à une pagination par curseur si l'API en propose une.
  const loading = ref(new Set<ParentId>());

  async function loadPage(parentId: ParentId, page: number) {
    loading.value.add(parentId);
    try {
      const path =
        parentId === null ? rootsPath : `/comments/${parentId}/replies`;
      const next = await api<CommentPage>(path, {
        query: { page, pageSize: PAGE_SIZE },
      });
      const current = page > 1 ? getList(parentId) : undefined;
      const knownIds = new Set(current?.items.map((c) => c.id));
      setList(parentId, {
        ...next,
        items: [
          ...(current?.items ?? []),
          ...next.items.filter((c) => !knownIds.has(c.id)),
        ],
      });
    } catch (e) {
      toast.add({
        title:
          parentId === null
            ? "Impossible de charger la suite"
            : "Impossible de charger les réponses",
        description:
          getApiError(e)?.message ?? "Vérifie ta connexion puis réessaie.",
        icon: "i-lucide-circle-alert",
        color: "error",
      });
    } finally {
      loading.value.delete(parentId);
    }
  }

  const canLoadMore = (parentId: ParentId) => {
    const page = getList(parentId);
    return !!page && page.page < page.totalPages;
  };
  const loadMore = (parentId: ParentId) =>
    loadPage(parentId, (getList(parentId)?.page ?? 0) + 1);

  // Fils dépliés, et racine à laquelle on est en train de répondre
  const openThreads = ref(new Set<number>());
  const replyTo = ref<number>();

  async function openThread(rootId: number) {
    openThreads.value.add(rootId);
    if (!replies.value[rootId]) await loadPage(rootId, 1);
  }

  function toggleThread(rootId: number) {
    if (openThreads.value.has(rootId)) openThreads.value.delete(rootId);
    else openThread(rootId);
  }

  // Répondre à une réponse revient à répondre à sa racine (un seul niveau) : on déplie le fil
  function startReply(rootId: number) {
    replyTo.value = rootId;
    openThread(rootId);
  }

  // Commentaire temporaire (ajout optimiste) : id négatif tant que l'API n'a pas répondu
  const isPending = (comment: DropComment) => comment.id < 0;
  let lastTempId = 0;

  async function addComment(content: string, parentId: ParentId = null) {
    if (!user.value) throw new Error("Session expirée");
    // Fil pas encore chargé : on le charge, pour y placer la réponse et dédoublonner la socket
    if (parentId !== null && !getList(parentId)) await openThread(parentId);

    const { id, username, displayName, avatarUrl } = user.value;
    const temp: DropComment = {
      id: --lastTempId,
      dropId,
      parentId,
      content,
      author: { id, username, displayName, avatarUrl },
      isMine: true,
      deleted: false,
      repliesCount: 0,
      likesCount: 0,
      dislikesCount: 0,
      likedByMe: false,
      dislikedByMe: false,
      createdAt: new Date().toISOString(),
    };
    updateList(parentId, (items) => [...items, temp], 1);

    try {
      const saved = await api<DropComment>(rootsPath, {
        method: "POST",
        body: parentId === null ? { content } : { content, parentId },
      });
      // Le comment:created de notre propre commentaire a pu arriver AVANT cette réponse :
      // il est alors déjà affiché, on retire juste le temporaire (et son +1)
      const alreadyShown = getList(parentId)?.items.some(
        (c) => c.id === saved.id,
      );
      updateList(
        parentId,
        (items) =>
          alreadyShown
            ? items.filter((c) => c.id !== temp.id)
            : items.map((c) => (c.id === temp.id ? saved : c)),
        alreadyShown ? -1 : 0,
      );
      if (parentId !== null) replyTo.value = undefined;
    } catch (e) {
      updateList(
        parentId,
        (items) => items.filter((c) => c.id !== temp.id),
        -1,
      );
      throw e; // le formulaire remet le texte et affiche l'erreur
    }
  }

  async function deleteComment(comment: DropComment) {
    const parentId = comment.parentId;
    const keepsTrace = parentId === null && comment.repliesCount > 0;
    // Optimiste : retiré tout de suite (ou changé en trace), en gardant sa place pour pouvoir le remettre
    const index =
      getList(parentId)?.items.findIndex((c) => c.id === comment.id) ?? -1;
    if (keepsTrace)
      updateList(
        parentId,
        (items) => items.map((c) => (c.id === comment.id ? toTrace(c) : c)),
        0,
        -1,
      );
    else
      updateList(
        parentId,
        (items) => items.filter((c) => c.id !== comment.id),
        -1,
      );

    try {
      await api(`/comments/${comment.id}`, { method: "DELETE" });
    } catch (e) {
      const apiError = getApiError(e);
      if (apiError?.status === 404) return; // déjà supprimé : le retrait est juste
      if (keepsTrace)
        updateList(
          parentId,
          (items) => items.map((c) => (c.id === comment.id ? comment : c)),
          0,
          1,
        );
      else
        updateList(
          parentId,
          (items) => [...items.slice(0, index), comment, ...items.slice(index)],
          1,
        );
      toast.add({
        title: "Impossible de supprimer ce commentaire",
        description: apiError?.message ?? "Vérifie ta connexion puis réessaie.",
        icon: "i-lucide-circle-alert",
        color: "error",
      });
    }
  }

  // En direct : commentaires et réponses des autres, et les nôtres envoyés depuis un autre onglet.
  // Dédoublonné par id : notre propre commentaire revient aussi par la socket.
  // Réponse d'un fil pas chargé : on compte seulement (elle sera lue en dépliant le fil).
  useRealtimeEvent("comment:created", ({ comment }) => {
    if (comment.dropId !== dropId) return;
    const list = getList(comment.parentId);
    if (list?.items.some((c) => c.id === comment.id)) return;
    if (list) updateList(comment.parentId, (items) => [...items, comment], 1);
    else count(comment.parentId, 1);
  });

  // Réactions changées (compteurs, et nos likedByMe / dislikedByMe : le message est construit pour nous)
  useRealtimeEvent("comment:updated", ({ comment }) => {
    if (comment.dropId !== dropId) return;
    // Devenu une trace (supprimé par son auteur, ailleurs) : il ne compte plus dans le total.
    // Déjà une trace chez nous (notre suppression optimiste) : déjà décompté.
    const previous = getList(comment.parentId)?.items.find(
      (c) => c.id === comment.id,
    );
    const becameTrace = comment.deleted && previous && !previous.deleted;
    updateList(
      comment.parentId,
      (items) => items.map((c) => (c.id === comment.id ? comment : c)),
      0,
      becameTrace ? -1 : 0,
    );
  });

  // shortcut: un commentaire supprimé qui n'est dans aucune liste chargée ne décrémente pas le total
  // (comment:deleted ne dit pas s'il s'agit d'une réponse, ni de quelle racine) ; un rechargement le recale.
  useRealtimeEvent("comment:deleted", ({ dropId: id, commentId }) => {
    if (id !== dropId) return;
    const parentId = findParent(commentId);
    if (parentId === undefined) return; // déjà retiré (le nôtre), ou pas chargé
    // Une trace part avec sa dernière réponse : elle-même n'était plus comptée, mais les réponses
    // qu'elle compte encore (fil pas chargé, leur suppression n'a pas pu être décomptée) le sont
    const removed = getList(parentId)?.items.find((c) => c.id === commentId);
    updateList(
      parentId,
      (items) => items.filter((c) => c.id !== commentId),
      -1,
      removed?.deleted ? -removed.repliesCount : -1,
    );
  });

  return {
    ready: roots,
    roots: roots.data,
    error: roots.error,
    refresh: roots.refresh,
    replies,
    total,
    loading,
    canLoadMore,
    loadMore,
    openThreads,
    toggleThread,
    replyTo,
    startReply,
    isPending,
    addComment,
    deleteComment,
  };
}
