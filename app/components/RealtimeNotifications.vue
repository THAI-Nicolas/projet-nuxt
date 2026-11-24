<script setup lang="ts">
import type { RealtimeNotification } from "~/types/realtime";

// Sans affichage : transforme chaque message `notification` en toast.
// Monté dans le layout (v-if user) pour être actif sur toutes les pages, et seulement connecté.
// Le serveur n'envoie qu'à l'auteur du drop, jamais pour ses propres actions : aucun filtre à faire.

const toast = useToast();

const MESSAGES: Record<
  RealtimeNotification["kind"],
  { action: string; icon: string }
> = {
  drop_liked: { action: "a aimé ton drop", icon: "i-lucide-heart" },
  drop_commented: {
    action: "a commenté ton drop",
    icon: "i-lucide-message-circle",
  },
};

useRealtimeEvent("notification", ({ kind, dropId, dropTitle, by }) => {
  const message = MESSAGES[kind];
  if (!message) return;
  toast.add({
    title: `${by.displayName} ${message.action}`,
    description: dropTitle,
    icon: message.icon,
    actions: [
      {
        label: "Voir",
        to: `/drops/${dropId}`,
        color: "neutral",
        variant: "outline",
      },
    ],
  });
});
</script>

<template>
  <!-- rien à afficher : les toasts sont rendus par <UApp> -->
</template>
