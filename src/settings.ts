import { device } from "@shared/device";
import manifest from "./appmeta/manifest.json";

/** Stored values keyed by field id, groups as nested objects, as src/appmeta/settings.json names them. */
export type SettingsValues = Record<string, unknown>;

/**
 * Reads the app's saved settings from the bar's HTTP API (GET /api/apps/settings, allowed for the app's own id), or
 * null when the bar does not answer. `loadValues()` of @shared/settings reads a global `Settings` that firmware
 * 1.3.1 does not have, so it is always null there. The app reads its settings once, at its start.
 */
export async function loadValues(): Promise<SettingsValues | null> {
  try {
    const document = await device.AppsSettingsGet({ app_id: manifest.id });
    return (document.values ?? null) as SettingsValues | null;
  } catch (err) {
    console.error(`${manifest.id}: settings unavailable, using the defaults: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
