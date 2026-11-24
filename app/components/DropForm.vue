<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Category, Drop, DropBody } from "~/types/api";

// Le formulaire ne connaît pas l'API : la page fournit `save` (POST ou PATCH), le formulaire affiche ses erreurs
const props = defineProps<{
  categories: Category[];
  initial?: Drop;
  submitLabel: string;
  save: (body: DropBody) => Promise<unknown>;
}>();

type DropState = {
  title: string;
  content: string;
  category: DropBody["category"];
  imageUrl: string;
  lat: number | null;
  lng: number | null;
};

const state = reactive<DropState>({
  title: props.initial?.title ?? "",
  content: props.initial?.content ?? "",
  category: props.initial?.category ?? "note",
  imageUrl: props.initial?.imageUrl ?? "",
  lat: props.initial?.location.lat ?? MMI.lat,
  lng: props.initial?.location.lng ?? MMI.lng,
});

const locating = ref(false);
const locateError = ref("");

function locate() {
  if (!navigator.geolocation) {
    locateError.value = "Géolocalisation indisponible : saisis la position.";
    return;
  }
  locating.value = true;
  locateError.value = "";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.lat = coords.latitude;
      state.lng = coords.longitude;
      locating.value = false;
    },
    () => {
      locateError.value = "Position refusée ou introuvable : saisis-la à la main.";
      locating.value = false;
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

const form = useTemplateRef("form");
const pending = ref(false);
const errorMessage = ref("");
const requestId = ref("");

// 429 : bouton désactivé pendant Retry-After
const rateLimited = ref(false);
const retryMs = ref(0);
const { start: startCooldown } = useTimeoutFn(
  () => (rateLimited.value = false),
  retryMs,
  { immediate: false },
);

async function onSubmit({ data }: FormSubmitEvent<DropState>) {
  if (data.lat === null || data.lng === null) {
    form.value?.setErrors([{ name: "location", message: "Indique une position." }]);
    return;
  }
  pending.value = true;
  errorMessage.value = "";
  requestId.value = "";
  try {
    // Corps explicite : l'API refuse tout champ inconnu (422) et attend des nombres pour lat/lng
    await props.save({
      title: data.title,
      content: data.content,
      category: data.category,
      imageUrl: data.imageUrl || null,
      lat: data.lat,
      lng: data.lng,
    });
  } catch (e) {
    const apiError = getApiError(e);
    errorMessage.value = apiError?.message ?? "Enregistrement impossible, réessaie.";
    requestId.value = apiError?.requestId ?? "";

    if (apiError?.status === 422) {
      // Erreurs de coordonnées (type, bornes, zone) rangées sous `location` par l'API
      form.value?.setErrors(
        Object.entries(apiError.fields ?? {}).map(([name, messages]) => ({
          name,
          message: messages[0] ?? apiError.message,
        })),
      );
    } else if (apiError?.status === 429) {
      const retryAfter = Number(
        (e as { response?: Response }).response?.headers.get("Retry-After"),
      );
      retryMs.value = (retryAfter || 5) * 1000;
      rateLimited.value = true;
      startCooldown();
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <UForm ref="form" :state="state" class="space-y-5" @submit="onSubmit">
    <UFormField name="title" label="Titre" required>
      <UInput v-model="state.title" class="w-full" />
    </UFormField>

    <UFormField name="content" label="Message" required>
      <UTextarea v-model="state.content" :rows="4" autoresize class="w-full" />
    </UFormField>

    <UFormField name="category" label="Catégorie" required>
      <USelect
        v-model="state.category"
        :items="categories"
        value-key="id"
        class="w-full"
      />
    </UFormField>

    <UFormField
      name="imageUrl"
      label="URL de l'image"
      :required="state.category === 'photo'"
      help="Obligatoire pour une photo (lien, pas d'envoi de fichier)."
    >
      <UInput v-model="state.imageUrl" type="url" class="w-full" />
    </UFormField>

    <UFormField
      name="location"
      label="Position"
      required
      :help="locateError || 'À 3 km au plus du département MMI.'"
    >
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Latitude" size="sm">
          <UInputNumber
            v-model="state.lat"
            :step="0.00001"
            :format-options="{ maximumFractionDigits: 6 }"
            :increment="false"
            :decrement="false"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Longitude" size="sm">
          <UInputNumber
            v-model="state.lng"
            :step="0.00001"
            :format-options="{ maximumFractionDigits: 6 }"
            :increment="false"
            :decrement="false"
            class="w-full"
          />
        </UFormField>
      </div>
      <UButton
        icon="i-lucide-locate"
        label="Utiliser ma position"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        :loading="locating"
        @click="locate"
      />
    </UFormField>

    <UAlert
      v-if="errorMessage"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errorMessage"
      :description="requestId ? `Réf. ${requestId}` : undefined"
    />

    <UButton
      type="submit"
      :label="rateLimited ? 'Trop de requêtes, patiente…' : submitLabel"
      :loading="pending"
      :disabled="rateLimited"
      block
    />
  </UForm>
</template>
