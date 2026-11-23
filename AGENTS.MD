# AGENTS.md — Droppy

## Contexte

Front-end de **Droppy**, client de l'API Drops (module R505, BUT MMI Montbéliard) : réseau social géolocalisé
où l'on dépose, like et commente des messages (« drops ») sur une carte. L'API REST Node existe déjà (Railway) :
on ne développe que le client, déployé sur Netlify. Ce fichier évolue avec le projet : propose sa mise à jour quand une décision change.

## Stack

- Nuxt ^4.6 (Vue 3, `<script setup lang="ts">`, TypeScript strict, pas de `any`), Node 22+, npm.
- Nuxt UI v4 (`@nuxt/ui`) : composants `U*` en priorité avant tout composant maison. Textes Nuxt UI en français (`<UApp :locale="fr">`).
- Tailwind CSS v4, intégré par Nuxt UI (ne pas ajouter `@tailwindcss/vite`). Config dans `app/assets/css/main.css`, pas de `tailwind.config.js`.
  Thème sombre unique (`ui.colorMode: false`) : tokens dans `@theme`, reliés aux variables `--ui-*` de Nuxt UI sur `:root`.
- Icônes : Lucide en local (`@iconify-json/lucide`), noms `i-lucide-*` (`UIcon`, prop `icon`). Pas de SVG copié à la main.
- VueUse (`@vueuse/nuxt`) pour les utilitaires réactifs (`watchDebounced`, `useResizeObserver`…).
- Carte : `@nuxtjs/leaflet` (pas `nuxt-leaflet`, obsolète). Toujours dans `<ClientOnly>`. Zone : Montbéliard.
- Temps réel : WebSocket natif du navigateur vers l'API (voir « Temps réel » plus bas). Pas de lib (socket.io…).
- `server/` : uniquement le relais d'authentification (BFF) décrit plus bas. Pas de logique métier, l'API est la seule source de vérité.

## Structure

`app/pages` (vues), `app/layouts` (header/footer), `app/components` (composants isolés), `app/composables` (logique),
`app/middleware` (guards), `app/utils` (`getApiError`), `app/types` (`schema.d.ts` généré par `npm run api:types`, ne pas l'éditer
à la main ; alias lisibles dans `api.ts`), `server/` (relais d'auth).
Un seul client HTTP côté app : `app/composables/useApi.ts` (base `/api`). Aucun `fetch` dispersé.

## Conventions

- Nuxt n'a pas de Server/Client Components ni de Server Actions : composants universels (rendu serveur puis interactifs),
  routes `server/api/*` côté serveur. `.client.vue` / `<ClientOnly>` seulement si une API navigateur l'exige (Leaflet).
- Données de page : `await useAsyncData(clé, () => api(...))`. Pendant un rechargement, garder l'ancienne liste (pas de
  scintillement) et signaler le chargement (`loading` du champ, liste estompée, `<NuxtLoadingIndicator>` dans `app.vue`).
- Filtres de liste dans l'URL (`?q`, `?category`) : lus via `computed` avec garde `typeof`, écrits avec `router.replace`,
  `undefined` pour retirer une clé. Les composants de filtre ne connaissent ni l'URL ni l'API (`v-model`), la page fait le lien.
- Formulaires : `UAuthForm` / `UForm`. Les erreurs 422 vont sous chaque champ via `formRef.setErrors`.

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
  - `server/api/auth/login.post.ts` et `register.post.ts` : une ligne chacune, appellent `relayAuth()` (`server/utils/relayAuth.ts`)
    qui fait `POST /auth/{login|register}`, pose le cookie et renvoie l'utilisateur sans le token (même `{ user, token, expiresAt }`).
  - **Pas de route dynamique** (`[action].post.ts`) sous `server/api/auth/` : elle intercepterait `GET /api/auth/me`, qui
    tomberait sur le rendu Vue → le middleware rappelle `/api/auth/me` → boucle de rendu infinie (page blanche).
  - `server/api/auth/logout.post.ts` : révoque le token côté API, supprime le cookie.
  - `server/api/[...path].ts` : relais vers l'API pour tout le reste ; `/admin/*` bloqué.
- Cookie `session` posé par le serveur : `httpOnly`, `secure` (hors dev), `sameSite: 'lax'`, `path: '/'`, expiration = `expiresAt`.
- `apiUrl` est une clé **privée** de `runtimeConfig` (`NUXT_API_URL`), lue seulement dans `server/`.
- Côté client, l'utilisateur connecté vit dans `useUser()` (`useState`), rempli via `GET /api/auth/me` par le middleware global.
- Toutes les pages sont privées (`middleware/auth.global.ts`), sauf celles qui déclarent `definePageMeta({ public: true })`
  (`/login`, `/register`, `/status`). Un utilisateur connecté qui ouvre `/login` ou `/register` est renvoyé vers `/drops`.
- 401 `unauthorized` / `invalid_token` / `token_expired` / `token_revoked` : purge la session, redirige vers le login si la page est privée.
- 401 `invalid_credentials` : erreur affichée dans le formulaire de connexion, pas de déconnexion.

## Contrat API Drops

Base : `https://drops-api-production.up.railway.app`. Référence complète : `app/types/schema.d.ts` (généré) et `<base>/openapi.json` en ligne.
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
POST   /realtime/ticket      token    → { ticket, expiresAt, url }  (usage unique, 30 s)
```

`token?` = facultatif (alimente `likedByMe`, `isMine`). **Depuis le 17/11/2026, toutes les routes sauf `GET /health` exigent un token** (sinon 401 `unauthorized`). Les routes `/admin/*` et `X-Admin-Key` sont interdites côté client.

Pièges :

- Corps stricts : un champ inconnu renvoie 422. Aucune conversion de type : `lat`/`lng` sont des `number`.
- Un drop ne peut être créé qu'à 3 km au plus du département MMI. Les erreurs de coordonnées arrivent sous `fields.location`.
- `photo` exige `imageUrl` (une URL : l'API ne gère pas d'upload).
- `GET /drops` n'a pas de filtre géographique : la carte parcourt les pages.
- Drop masqué : 404 pour tous sauf son auteur. Signaler son propre drop : 403.
- `locked`, `precision`, `opensCount` : sens non documenté. Affiche-les sans inventer de route.

## Temps réel

Protocole complet : tag « Temps réel » de `<base>/openapi.json` (OpenAPI ne décrit pas les WebSocket). Messages typés à la main
dans `app/types/realtime.ts`.

- Ticket : le navigateur appelle `POST /api/realtime/ticket` via `useApi` ; le relais `[...path].ts` ajoute le Bearer.
  Le JWT ne passe jamais dans l'URL du WebSocket. Un nouveau ticket à chaque (re)connexion.
- **Une seule socket par onglet** : `app/plugins/realtime.client.ts` (jamais côté serveur), exposé par `useRealtime()`.
  Aucun autre `new WebSocket`. Les composants l'utilisent dans `onMounted` / `onBeforeUnmount` uniquement :
  `retain()` (renvoie `release`), `subscribe(type, fn)` et `onOpen(fn)` (renvoient le désabonnement), `send(message)`.
- Après une reconnexion, l'état côté serveur est perdu : renvoyer `presence:view` dans `onOpen`.
- Écouter un message : `useRealtimeEvent(type, handler)` (retain + subscribe, nettoyage au démontage).
- Présence : `usePresence(dropId)` **une seule fois par page** (le `presence:leave` d'un composant efface celui des
  autres), la page passe `viewers` aux enfants (`DropPresence`).
- Fermetures : 1000 rien ; 1006, 4010, 4011 → nouveau ticket et délai croissant (≤ 15 s) ; 4001 → `/login` ;
  4008 et 4009 → pas de reconnexion (bug à corriger côté client).
- `drop:opened` : ignoré (va être supprimé de l'API), ni typé ni écouté.
- Limite : 20 messages client par 10 s (sinon 4008), 5 connexions par utilisateur (sinon 4009).
- Test : DevTools › Réseau › WS › Messages, `<base>/ws-playground`, deux comptes dans deux navigateurs.

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
