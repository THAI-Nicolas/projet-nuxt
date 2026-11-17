import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@vueuse/nuxt/module"],
  compatibilityDate: "2025-07-15",
  typescript: {
    typeCheck: true,
    strict: true,
  },
  runtimeConfig: {
    public: {
      apiUrl: "",
    },
  },
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
});
