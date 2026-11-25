<script setup lang="ts">
import type { PublicUser } from "~/types/api";

// Qui est en ligne (soi-même inclus, dédoublonné par utilisateur côté serveur).
// Monté dans l'en-tête (v-if user) : réutilise la connexion que le layout garde ouverte.

const online = ref<PublicUser[]>([]);
const status = useRealtimeStatus();
const me = useUser();

// Liste de départ à chaque ouverture, reconnexions comprises (un nouveau hello à chaque fois)
useRealtimeEvent("hello", (data) => (online.value = data.online));
// Ensuite, chaque presence:online remplace toute la liste
useRealtimeEvent("presence:online", ({ users }) => (online.value = users));

const label = computed(() => `${online.value.length} en ligne`);
</script>

<template>
  <!-- Socket fermée : la liste n'est plus à jour, on ne l'affiche pas -->
  <UPopover v-if="status.state === 'open' && online.length">
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="`${label}, voir qui`"
    >
      <UChip color="success" standalone inset aria-hidden="true" />
      {{ online.length }}
      <span class="hidden sm:inline">en ligne</span>
    </UButton>

    <template #content>
      <section class="w-64 p-3" aria-labelledby="online-title">
        <h2 id="online-title" class="mb-2 text-sm font-bold">{{ label }}</h2>
        <ul class="max-h-64 space-y-2 overflow-y-auto">
          <li v-for="user in online" :key="user.id">
            <UUser
              :name="user.displayName"
              :description="
                user.id === me?.id ? `@${user.username} · toi` : `@${user.username}`
              "
              :avatar="{ src: user.avatarUrl ?? undefined, alt: user.displayName }"
              :to="`/users/${user.username}`"
              size="sm"
            />
          </li>
        </ul>
      </section>
    </template>
  </UPopover>
</template>
