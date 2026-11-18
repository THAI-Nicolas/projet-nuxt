import type { components, paths } from "./schema";

type S = components["schemas"];

// Corps de POST /drops (PATCH accepte les mêmes champs, tous optionnels)
export type DropBody =
  paths["/drops"]["post"]["requestBody"]["content"]["application/json"];

export type Drop = S["Drop"];
export type DropPage = S["DropPage"];
export type LikeState = S["LikeState"];
export type Category = S["Category"];
export type Health = S["Health"];
export type AuthResponse = S["AuthResponse"];
export type ApiError = S["ErrorResponse"]["error"];
export type PrivateUser = S["PrivateUser"];
