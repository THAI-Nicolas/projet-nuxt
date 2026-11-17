# AGENTS.md — Droppy

## Contexte

Front-end de **Droppy**, client de l'API Drops (module R505, BUT MMI Montbéliard) : réseau social géolocalisé
où l'on dépose, like et commente des messages (« drops ») sur une carte. L'API REST Node existe déjà (Railway) :
on ne développe que le client, déployé sur Netlify. Ce fichier évolue avec le projet : propose sa mise à jour quand une décision change.

## Stack

- Nuxt ^4.6 (Vue 3, `<script setup lang="ts">`, TypeScript strict, pas de `any`), Node 22+, npm.
- Tailwind CSS v4 via `@tailwindcss/vite`. Config dans `app/assets/css/main.css` (`@theme`), pas de `tailwind.config.js`.
- Carte : `@nuxtjs/leaflet` (pas `nuxt-leaflet`, obsolète). Toujours dans `<ClientOnly>`. Zone : Montbéliard.
- Temps réel : prévu, choix technique non arrêté. L'API n'expose aucun WebSocket. N'implémente rien sans validation.
- `server/` : uniquement le relais d'authentification (BFF) décrit plus bas. Pas de logique métier, l'API est la seule source de vérité.

## Structure

`app/pages` (vues), `app/components` (composants isolés), `app/composables` (logique), `app/middleware` (guards), `server/` (relais d'auth).
Un seul client HTTP côté app : `app/composables/useApi.ts` (base `/api`). Aucun `fetch` dispersé.

## Qualité du code

- Factorise quand un motif se répète une 3ᵉ fois. N'abstrais pas par anticipation.
- Un composant = une responsabilité. S'il dépasse ~200 lignes ou en mélange plusieurs, signale-le en fin de tâche sans le scinder de toi-même.
- Tailwind : classes utilitaires standard uniquement, aucune valeur arbitraire (`w-[32px]`).
  Si une valeur manque, ajoute un token dans `@theme` de `main.css`.
- Mobile-first obligatoire.
- Accessibilité : HTML sémantique, `aria-*` pertinents, contraste AA, navigation clavier.
- Jamais de `v-html` sur du contenu utilisateur.

## Authentification

- Objectif : le token n'est **jamais** lisible par le JavaScript du navigateur (protection contre le vol par XSS).
- Le navigateur appelle `/api/*` (serveur Nuxt), jamais l'API Drops directement. Le serveur Nuxt ajoute `Authorization: Bearer <token>`.
  - `server/api/auth/login.post.ts` : appelle `POST /auth/login`, pose le cookie, renvoie l'utilisateur sans le token.
  - `server/api/auth/logout.post.ts` : révoque le token côté API, supprime le cookie.
  - `server/api/[...path].ts` : relais vers l'API pour tout le reste ; `/admin/*` bloqué.
- Cookie `session` posé par le serveur : `httpOnly`, `secure` (hors dev), `sameSite: 'lax'`, `path: '/'`, expiration = `expiresAt`.
- `apiUrl` est une clé **privée** de `runtimeConfig` (`NUXT_API_URL`), lue seulement dans `server/`.
- Côté client, l'utilisateur connecté vit dans `useUser()` (`useState`), rempli via `GET /api/auth/me` par le middleware global.
- Toutes les pages sont privées (`middleware/auth.global.ts`), sauf celles qui déclarent `definePageMeta({ public: true })`.
- 401 `unauthorized` / `invalid_token` / `token_expired` / `token_revoked` : purge la session, redirige vers le login si la page est privée.
- 401 `invalid_credentials` : erreur affichée dans le formulaire de connexion, pas de déconnexion.

## Contrat API Drops

Base : `https://drops-api-production.up.railway.app`. Référence complète : `/contract.md` et `/openapi.json`.
Ne jamais inventer de route, de champ ou de code d'erreur.

```
POST   /auth/register        public   { username, email, password, displayName, bio? }
POST   /auth/login           public   { login, password }  → { user, token, expiresAt }
POST   /auth/logout          token
GET    /auth/me              token
PATCH  /auth/me              token    { displayName?, bio?, avatarUrl? }
GET    /users/{username}     token?
GET    /categories           public   note | photo | tip | riddle
GET    /drops                token?   ?page ?pageSize(≤50) ?q ?category ?author ?sort=recent|popular
GET    /drops/{id}           token?
POST   /drops                token    { title, content, category, imageUrl?, lat, lng }
PATCH  /drops/{id}           token    (auteur) mêmes champs, optionnels
DELETE /drops/{id}           token    (auteur)
POST   /drops/{id}/like      token    → { liked, likesCount }
DELETE /drops/{id}/like      token    → { liked, likesCount }
GET    /drops/{id}/comments  token?   ?page ?pageSize
POST   /drops/{id}/comments  token    { content }
DELETE /comments/{id}        token    (auteur)
POST   /drops/{id}/report    token    { reason: spam|offensive|personal_info|other, details? }
```

`token?` = facultatif (alimente `likedByMe`, `isMine`). **Depuis le 17/11/2026, toutes les routes sauf `GET /health` exigent un token** (sinon 401 `unauthorized`). Les routes `/admin/*` et `X-Admin-Key` sont interdites côté client.

Pièges :

- Corps stricts : un champ inconnu renvoie 422. Aucune conversion de type : `lat`/`lng` sont des `number`.
- Un drop ne peut être créé qu'à 3 km au plus du département MMI. Les erreurs de coordonnées arrivent sous `fields.location`.
- `photo` exige `imageUrl` (une URL : l'API ne gère pas d'upload).
- `GET /drops` n'a pas de filtre géographique : la carte parcourt les pages.
- Drop masqué : 404 pour tous sauf son auteur. Signaler son propre drop : 403.
- `locked`, `precision`, `opensCount` : sens non documenté. Affiche-les sans inventer de route.

## Erreurs

Format unique : `{ error: { status, code, message, fields, requestId, simulated } }`.

- 422 : affiche `fields[champ]` sous chaque input.
- 403 : message explicite et action masquée.
- 404 : état « introuvable ».
- 429 : bouton désactivé pendant `Retry-After`.
- 500/503 : état d'erreur avec « Réessayer ».
- Affiche `requestId` en discret pour le débogage.

## Outils pédagogiques

- `?delay=2000` pour les états de chargement, `?fail=422|500|…` pour les erreurs, `POST /auth/login?ttl=15` pour l'expiration.
- Activés uniquement en dev via une variable d'environnement, jamais en dur dans le code.
- Comptes : `mathis` / `drops2026`, et un 2ᵉ compte (`noah`, même mot de passe) pour tester le 403. `demo` est refusé.

## Charte du matin

- Avant toute modification : `git status`, puis lis le code concerné.
- Pose une question avant de générer un composant visuel complexe.

## Commits

Ne fais jamais de `git add`, de `commit` ni de `push` : c'est l'utilisateur qui commite.
À la fin d'une tâche, liste les fichiers modifiés et propose un message au format Conventional Commits (`feat:`, `fix:`, `docs:`…).
