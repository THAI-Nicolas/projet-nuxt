# Next vs Nuxt — notes de cours

## 1. État et cycle de vie

| Next (React)                       | Nuxt (Vue)                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| `const [n, setN] = useState(0)`    | `const n = ref(0)` → on modifie directement `n.value++`         |
| Objet : `useState({...})` + setter | `reactive({...})` (objet modifiable directement, sans `.value`) |
| `useEffect(() => {...}, [])`       | `onMounted(() => {...})`                                        |
| `useEffect(() => {...}, [dep])`    | `watch(dep, () => {...})` / `watchEffect()`                     |

- En Vue, pas de setter ni de tableau de dépendances : la réactivité suit automatiquement ce qui est lu.
- Piège : Nuxt a aussi un `useState()`, mais c'est un état **partagé** entre composants et serveur/client, pas l'équivalent du `useState` React.

## 2. Composants client, serveur et cache

- **Next** : composants **serveur par défaut**. `'use client'` pour l'interactivité, `'use cache'` (Cache Components) pour mettre en cache un composant ou une fonction.
- **Nuxt** : rendu **universel par défaut** : chaque composant est rendu côté serveur (SSR) puis hydraté côté client. Pas de directive à écrire.
  - Client uniquement : `<ClientOnly>` ou suffixe `.client.vue` (ex. la carte Leaflet).
  - Serveur uniquement : suffixe `.server.vue` (server components, encore expérimental).
  - Cache : `useFetch` / `useAsyncData` évitent le double appel serveur → client ; cache de page via `routeRules` dans `nuxt.config.ts` (`swr`, `isr`, `prerender`).

## 3. Routing

- **Next** : un dossier = une route, avec un `page.tsx` dedans → `app/drops/page.tsx` donne `/drops`.
- **Nuxt** : un fichier dans `app/pages/` = une route → `app/pages/drops.vue` (ou `drops/index.vue`) donne `/drops`.
- Routes dynamiques : `[id]/page.tsx` (Next) vs `[id].vue` (Nuxt).
- Dans Next, `app/` contient les routes. Dans Nuxt, `app/` contient tout le front, et seul `app/pages/` crée des routes.
- `pages/status/index.vue` marche aussi (proche de `status/page.tsx`), utile quand une section a des sous-pages.
- Mise en page : `app/layout.tsx` (Next) vs `app/layouts/default.vue` + `app.vue`, qui doit contenir `<NuxtPage />` pour afficher les pages.
- L'ancien Pages Router de Next (`pages/status.tsx`) fonctionnait déjà comme Nuxt.

## 4. Client API

- **Next** : `lib/api.ts`, un simple module de fonctions utilitaires.
- **Nuxt** : `app/composables/useApi.ts`, un composable **auto-importé** (pas d'`import` à écrire) qui peut utiliser les autres composables Nuxt (`useCookie`, `useRuntimeConfig`, `navigateTo`…) pour gérer le token et les erreurs.
- Un seul client, construit avec `$fetch.create()` : il gère toutes les méthodes HTTP et parse le JSON automatiquement.
- Le préfixe `use` signale un composable, à appeler dans le setup. On évite de l'appeler `useClient`, parce que « client » désigne le navigateur en Nuxt.
- Où ranger le code : `composables/` (fonctions `useXxx`), `utils/` (fonctions pures), `plugins/` (code lancé au démarrage, avec `defineNuxtPlugin`). Ces deux premiers dossiers sont auto-importés.
- Erreurs :
  - Next : `if (res.status === 404) notFound()`.
  - Nuxt : `createError({ fatal: true })` affiche la page d'erreur plein écran.
  - Dans le client, on ne gère que ce qui est identique partout (token, 401 de session) grâce aux hooks `onRequest` et `onResponseError`. Le reste (404, 422…) est géré par la page.

## 5. Variables d'environnement

- **Next** : `process.env.X`, et `NEXT_PUBLIC_X` pour exposer une variable au navigateur. Next lit `.env.local` tout seul.
- **Nuxt** : on déclare la clé dans `runtimeConfig` (`nuxt.config.ts`), puis on la lit avec `useRuntimeConfig()`.
  - `runtimeConfig.public.apiUrl` est rempli par `NUXT_PUBLIC_API_URL` et visible par le navigateur.
  - Une clé hors de `public` reste privée et n'est lisible que dans `server/`.
  - `process.env` ne s'utilise que dans `nuxt.config.ts`, car il vaut `undefined` dans le navigateur.
  - Nuxt lit seulement `.env` par défaut, pas `.env.local`.

## 6. Récupérer des données dans une page

- **Next** : `await fetch()` directement dans un composant serveur.
- **Nuxt** : `const { data, error, status, refresh } = await useAsyncData('clé', () => api('/health'))`. La requête s'exécute côté serveur, puis côté client si besoin, et l'état de la requête est exposé.
- Template Vue vs JSX : `v-if`/`v-else-if` au lieu de `&&` ou du ternaire, `:attr` pour lier une valeur, `@click` pour un événement, `{{ }}` pour afficher du texte échappé.

## 7. Types générés depuis l'OpenAPI

- Les deux frameworks utilisent le même outil, `openapi-typescript`. Seul l'emplacement change : `lib/api/schema.d.ts` + `types.ts` (Next) vs `app/types/schema.d.ts` + `api.ts` (Nuxt).
- Alias de chemin : `@/` (Next) vs `~/` (Nuxt, qui pointe sur `app/`).

## 8. Recherche synchronisée avec l'URL

| Next (React)                                       | Nuxt (Vue)                                                    |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `useSearchParams()` / prop `searchParams`          | `useRoute().query`                                            |
| `router.replace('?q=...')`                         | `useRouter().replace({ query: { q } })`                       |
| `useMemo(() => ..., [deps])`                       | `computed(() => ...)`, dont Vue trouve les dépendances seul    |
| Props `value` + `onChange` sur un composant enfant | `defineModel()` dans l'enfant, puis `v-model` dans le parent  |
| Hook de debounce maison                            | `watchDebounced` (VueUse, auto-importé via `@vueuse/nuxt`)    |
| Fragment `<>...</>`                                | `<template v-if>` (groupe des éléments sans ajouter de `<div>`) |
| `import` de chaque composant                       | Composants de `components/` auto-importés par leur nom de fichier |

- Le principe est le même dans les deux frameworks : l'URL est la source de vérité. Dans Nuxt, `useAsyncData(..., { watch: [q] })` relance la requête quand `q` change.
- `route.query.q` peut valoir `string`, `null` ou un tableau : on vérifie avec `typeof`, pas avec `as string`.

## 9. Filtre par catégorie (URL + cache)

| Next (React)                                             | Nuxt (Vue)                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Composant serveur `'use cache'` qui charge `/categories` | `useAsyncData('categories', ..., { getCachedData })` dans le composant  |
| `categories.map(c => <Link key={c.id} ...>)`             | `<li v-for="c in categories" :key="c.id">`                              |
| `<Link href="?category=photo">`                          | `<NuxtLink :to="{ query: { ...route.query, category: c.id } }">`        |
| `searchParams.category`                                  | `useRoute().query.category`                                             |

- Différence de cache :
  - `'use cache'` met la donnée en cache **sur le serveur**, partagée par tous les visiteurs.
  - `getCachedData` réutilise la donnée déjà chargée **dans le navigateur** de l'utilisateur, ce qui évite de refaire la requête.
- Un filtre écrit dans l'URL est une navigation : on utilise des liens (`<Link>` / `<NuxtLink>`), pas des boutons.
