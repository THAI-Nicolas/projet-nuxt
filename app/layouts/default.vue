<script setup lang="ts">
const { user, logout } = useAuth();
const year = new Date().getFullYear();

const route = useRoute();
const width = computed(() => (route.meta.wide ? "max-w-7xl" : "max-w-2xl"));
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <RealtimeNotifications v-if="user" />

    <UHeader
      to="/drops"
      :toggle="false"
      :ui="{ root: 'bg-bg backdrop-blur-none', container: width }"
    >
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

    <div class="mx-auto w-full flex-1" :class="width">
      <slot />
    </div>

    <UFooter :ui="{ container: width }">
      <template #left>
        <p class="text-sm text-muted">© {{ year }} Droppy</p>
      </template>
      <template #right>
        <ULink to="/status" class="text-sm">Voir la santé de l'API</ULink>
      </template>
    </UFooter>
  </div>
</template>
