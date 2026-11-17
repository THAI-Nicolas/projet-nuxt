import type { components } from "./schema";

type S = components["schemas"];

export type Drop = S["Drop"];
export type DropPage = S["DropPage"];
export type Category = S["Category"];
export type Health = S["Health"];
export type AuthResponse = S["AuthResponse"];
export type ApiError = S["ErrorResponse"]["error"];
export type PrivateUser = S["PrivateUser"];
