// Département MMI (exemple de l'OpenAPI) : centre des cartes et position par défaut d'un nouveau drop
export const MMI = { lat: 47.49561, lng: 6.80544 };

// Tuiles OpenStreetMap standard (claires) : gratuites sans clé, attribution obligatoire (politique d'usage OSM).
// shortcut: CARTO/Stadia demandent une clé API ; à reconsidérer si on veut un fond plus épuré.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
