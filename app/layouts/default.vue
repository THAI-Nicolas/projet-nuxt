<script setup lang="ts">
const { user, logout } = useAuth();
const year = new Date().getFullYear();
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <!-- Notifications en toast sur toutes les pages, uniquement connecté -->
    <RealtimeNotifications v-if="user" />

    <UHeader to="/drops" :toggle="false" :ui="{ container: 'max-w-2xl' }">
      <template #title>
        <span class="flex items-center gap-2 text-xl font-bold">
          <UIcon name="i-lucide-droplet" class="size-6 text-primary" />
          droppy
        </span>
      </template>

      <template #right>
        <div v-if="user" class="flex items-center gap-2">
          <OnlineUsers />
          <UUser
            :name="user.displayName"
            :description="`@${user.username}`"
            :avatar="{
              src: user.avatarUrl ?? undefined,
              alt: user.displayName,
            }"
            to="/profile"
            :ui="{ wrapper: 'hidden sm:block' }"
          />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Se déconnecter"
            @click="logout()"
          />
        </div>
      </template>
    </UHeader>

    <!-- div et pas <UMain> : chaque page porte déjà son <main> -->
    <div class="mx-auto w-full max-w-2xl flex-1">
      <slot />
    </div>

    <UFooter :ui="{ container: 'max-w-2xl' }">
      <template #left>
        <p class="text-sm text-muted">© {{ year }} Droppy</p>
      </template>
      <template #right>
        <ULink to="/status" class="text-sm">Voir la santé de l'API</ULink>
      </template>
    </UFooter>
  </div>
</template>
