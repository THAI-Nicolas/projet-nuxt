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
- `server/` : pas de logique métier, l'API est la seule source de vérité.

## Structure

`app/pages` (vues), `app/components` (composants isolés), `app/composables` (logique), `app/middleware` (guards).
Un seul client HTTP : `app/composables/useApi.ts`. Aucun `fetch` dispersé.

## Qualité du code

- Factorise quand un motif se répète une 3ᵉ fois. N'abstrais pas par anticipation.
- Un composant = une responsabilité. S'il dépasse ~200 lignes ou en mélange plusieurs, signale-le en fin de tâche sans le scinder de toi-même.
- Tailwind : classes utilitaires standard uniquement, aucune valeur arbitraire (`w-[32px]`).
  Si une valeur manque, ajoute un token dans `@theme` de `main.css`.
- Mobile-first obligatoire.
- Accessibilité : HTML sémantique, `aria-*` pertinents, contraste AA, navigation clavier.
- Jamais de `v-html` sur du contenu utilisateur.

## Authentification

- `Authorization: Bearer <token>`. L'API ne pose aucun cookie.
- Token stocké via `useCookie` (`sameSite: 'strict'`, `secure`), expiration calée sur `expiresAt`.
- Middleware de route sur toutes les pages privées.
- 401 `invalid_token` / `token_expired` / `token_revoked` : purge le token, redirige vers le login si la page est privée.
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

`token?` = facultatif (alimente `likedByMe`, `isMine`). Les routes `/admin/*` et `X-Admin-Key` sont interdites côté client.

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
- Comptes : `demo` / `drops2026`, et un 2ᵉ compte (`lea`, même mot de passe) pour tester le 403.

## Charte du matin

- Avant toute modification : `git status`, puis lis le code concerné.
- Pose une question avant de générer un composant visuel complexe.

## Commits

Ne fais jamais de `git add`, de `commit` ni de `push` : c'est l'utilisateur qui commite.
À la fin d'une tâche, liste les fichiers modifiés et propose un message au format Conventional Commits (`feat:`, `fix:`, `docs:`…).
