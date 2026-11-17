// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Nuxt UI branche lui-même Tailwind v4 (@tailwindcss/vite)
  modules: ["@vueuse/nuxt/module", "@nuxt/ui"],
  compatibilityDate: "2025-07-15",
  typescript: {
    typeCheck: true,
    strict: true,
  },
  runtimeConfig: {
    apiUrl: "", // privé : NUXT_API_URL, lu uniquement dans server/
  },
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  // App uniquement sombre : pas de color-mode (son localStorage peut forcer le clair), tokens posés dans main.css
  ui: { colorMode: false },
});
