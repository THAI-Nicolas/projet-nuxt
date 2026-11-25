<script setup lang="ts">
import type { RealtimeNotification } from "~/types/realtime";

const toast = useToast();

const MESSAGES: Record<
  RealtimeNotification["kind"],
  { action: string; icon: string }
> = {
  drop_liked: { action: "a aimé ton drop", icon: "i-lucide-thumbs-up" },
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
