/**
 * Mapbox public token (browser-safe). Not used by the dynacard viewer yet;
 * read it from here when a well map is added.
 */
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const hasMapboxToken = () => MAPBOX_TOKEN.startsWith("pk.");
