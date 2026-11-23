import type { RealtimeTicket } from "~/types/api";
import type {
  ClientMessage,
  RealtimeData,
  ServerMessage,
  ServerMessageType,
} from "~/types/realtime";

// Une seule socket par onglet, partagée par tous les composants.
// .client : ce plugin ne tourne jamais sur le serveur, où une variable partagée le serait entre TOUS les visiteurs.

// 4001 session_expired, 4008 rate_limited, 4009 too_many_connections : se reconnecter ne réglerait rien
const NO_RECONNECT = [4001, 4008, 4009];
// Laisse le temps à la page suivante de reprendre la connexion avant de la fermer (navigation)
const CLOSE_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

type AnyListener = (data: unknown) => void;

export default defineNuxtPlugin(() => {
  const api = useApi();
  const status = useRealtimeStatus();
  const user = useUser();
  const { logout } = useAuth();
  const toast = useToast();

  const listeners = new Map<ServerMessageType, Set<AnyListener>>();
  const openListeners = new Set<() => void>();
  let socket: WebSocket | null = null;
  let connecting = false;
  let consumers = 0;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleReconnect() {
    attempt += 1;
    // Délai croissant (2 s, 4 s, 8 s… 15 s max) + un peu d'aléa : après un 4010, tous les clients
    // ne doivent pas revenir à la même milliseconde
    const delay =
      Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS) +
      Math.random() * 500;
    reconnectTimer = setTimeout(connect, delay);
  }

  async function connect() {
    reconnectTimer = undefined;
    if (socket || connecting || consumers === 0) return;
    connecting = true;
    status.value = { state: "connecting", code: status.value.code };
    const forUser = user.value?.id;
    try {
      // Le relais server/api/[...path].ts ajoute le Bearer : le navigateur ne voit que le ticket (usage unique, 30 s)
      const { url } = await api<RealtimeTicket>("/realtime/ticket", {
        method: "POST",
      });
      // Le compte a pu changer pendant la demande : ce ticket serait celui de l'ancien
      if (consumers > 0 && !socket && user.value?.id === forUser) open(url);
    } catch (e) {
      status.value = { state: "closed" };
      // 401 : useApi a déjà purgé la session et renvoyé vers /login, inutile d'insister.
      // Autre échec (réseau, 429, 500…) : nouvel essai plus tard.
      if (getApiError(e)?.status !== 401 && consumers > 0) scheduleReconnect();
    } finally {
      connecting = false;
    }
    // Compte changé pendant la demande : le watch n'a pas pu relancer (connecting était vrai), on le fait ici
    if (user.value && user.value.id !== forUser && consumers > 0) connect();
  }

  function open(url: string) {
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      attempt = 0;
      status.value = { state: "open" };
      // Rappelé à chaque ouverture : après une reconnexion, chacun renvoie son état (presence:view…)
      openListeners.forEach((listener) => listener());
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try {
        // shortcut: on fait confiance au format documenté { type, data } ; valider si l'API devient moins fiable
        message = JSON.parse(event.data);
      } catch {
        return; // message illisible : on l'ignore plutôt que de casser la boucle
      }
      listeners.get(message.type)?.forEach((listener) => listener(message.data));
    };

    ws.onclose = (event) => {
      // Socket déjà remplacée ou fermée volontairement par disconnect() : rien à faire
      if (socket !== ws) return;
      socket = null;
      status.value = { state: "closed", code: event.code };
      if (event.code === 4001) return sessionExpired();
      // 1006 (coupure, ticket refusé), 4010, 4011… : nouveau ticket à chaque essai, jamais le même
      if (consumers === 0 || NO_RECONNECT.includes(event.code)) return;
      scheduleReconnect();
    };
  }

  // 4001 : le JWT a expiré ou a été révoqué (ex. déconnexion dans un autre onglet).
  // logout() supprime le cookie mort, vide useUser AVANT d'aller sur /login (sinon le middleware renverrait vers /drops).
  function sessionExpired() {
    toast.add({
      title: "Session expirée",
      description: "Reconnecte-toi pour continuer.",
      icon: "i-lucide-log-out",
      color: "warning",
    });
    logout();
  }

  function disconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    const ws = socket;
    socket = null; // avant close() : onclose verra que la fermeture est voulue
    ws?.close(1000);
    status.value = { state: "closed", code: ws ? 1000 : undefined };
  }

  // Déconnexion ou changement de compte : la socket est authentifiée pour l'ancien utilisateur,
  // on la ferme tout de suite (sans attendre CLOSE_DELAY_MS) et on en rouvre une si quelqu'un en a encore besoin
  watch(
    () => user.value?.id,
    (id) => {
      disconnect();
      if (id && consumers > 0) connect();
    },
  );

  // « J'ai besoin de la connexion. » Renvoie la fonction qui la relâche.
  function retain() {
    clearTimeout(closeTimer);
    consumers += 1;
    if (!socket && !connecting && !reconnectTimer) connect();

    let released = false;
    return () => {
      if (released) return; // un 2ᵉ appel ne doit pas fausser le compteur
      released = true;
      consumers -= 1;
      if (consumers === 0) closeTimer = setTimeout(disconnect, CLOSE_DELAY_MS);
    };
  }

  // Reçoit les data des messages de ce type. Renvoie le désabonnement.
  function subscribe<T extends ServerMessageType>(
    type: T,
    listener: (data: RealtimeData<T>) => void,
  ) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, (set = new Set()));
    const stored = listener as AnyListener;
    set.add(stored);
    return () => {
      set.delete(stored);
    };
  }

  // Rappelé à chaque ouverture, reconnexions comprises (et tout de suite si déjà ouverte).
  function onOpen(listener: () => void) {
    openListeners.add(listener);
    if (socket?.readyState === WebSocket.OPEN) listener();
    return () => {
      openListeners.delete(listener);
    };
  }

  // Envoie si la socket est ouverte, sinon rien : onOpen renverra l'état à la prochaine ouverture.
  function send(message: ClientMessage) {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  }

  return {
    provide: { realtime: { retain, subscribe, onOpen, send } },
  };
});
