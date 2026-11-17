export function useApi() {
  const { apiUrl } = useRuntimeConfig().public;
  return $fetch.create({ baseURL: apiUrl });
}
