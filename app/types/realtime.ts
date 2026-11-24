import type { Drop, DropComment, PublicUser } from "./api";

// OpenAPI ne décrit pas les WebSocket : recopié à la main depuis le tag « Temps réel » de <base>/openapi.json.
// À tenir à jour si le contrat change (/contract.md, section Temps réel).

export interface RealtimeNotification {
  kind: "drop_liked" | "drop_commented";
  dropId: number;
  dropTitle: string;
  by: PublicUser;
  at: string;
}

export type ClientMessage =
  | { type: "presence:view"; data: { dropId: number } }
  | { type: "presence:leave"; data: Record<string, never> }
  | { type: "ping"; data: Record<string, never> };

export type ServerMessage =
  | {
      type: "hello";
      data: {
        user: PublicUser;
        serverTime: string;
        online: PublicUser[];
      };
    }
  | { type: "pong"; data: { serverTime: string } }
  | { type: "presence:online"; data: { users: PublicUser[] } }
  | { type: "presence:drop"; data: { dropId: number; viewers: PublicUser[] } }
  // Deux membres séparés (pas `type: "drop:created" | "drop:updated"`) : sinon RealtimeData ne les trouve pas
  | { type: "drop:created"; data: { drop: Drop } }
  | { type: "drop:updated"; data: { drop: Drop } }
  | { type: "drop:deleted"; data: { dropId: number } }
  | {
      type: "like:updated";
      data: { dropId: number; likesCount: number; dislikesCount: number };
    }
  | { type: "comment:created"; data: { comment: DropComment } }
  // Compteurs de réactions changés, ou commentaire supprimé gardé en trace (deleted: true)
  | { type: "comment:updated"; data: { comment: DropComment } }
  | { type: "comment:deleted"; data: { dropId: number; commentId: number } }
  | { type: "notification"; data: RealtimeNotification }
  | {
      type: "error";
      data: { code: "bad_message" | "drop_not_found"; message: string };
    };

export type ServerMessageType = ServerMessage["type"];

// Les data d'un type de message : RealtimeData<"drop:deleted"> = { dropId }
export type RealtimeData<T extends ServerMessageType> = Extract<
  ServerMessage,
  { type: T }
>["data"];
