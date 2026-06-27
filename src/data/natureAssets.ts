/**
 * Manifest for the Stylized Nature MegaKit assets used in the garden hub.
 *
 * Every model here is a low-poly glTF living in
 * public/models/stylized-nature/. Each entry records:
 *  - path: where the .gltf is served from (Vite serves /public at the root)
 *  - wind: which wind profile drives its sway (see WIND_PROFILES below)
 *  - baseScale: a per-asset multiplier so wildly different source sizes
 *    (a clover vs. a tree) end up sensibly proportioned in our world
 *
 * The MegaKit's meshes are authored at very different scales, so baseScale
 * is tuned by eye per asset rather than assumed uniform.
 */

export type WindCategory = "grass" | "flower" | "bush" | "tree" | "static";

export interface NatureAsset {
  key: string;
  path: string;
  wind: WindCategory;
  baseScale: number;
}

const BASE = "/models/stylized-nature";

export const NATURE_ASSETS = {
  grassCommonShort: { key: "grassCommonShort", path: `${BASE}/Grass_Common_Short.gltf`, wind: "grass", baseScale: 1 },
  grassCommonTall: { key: "grassCommonTall", path: `${BASE}/Grass_Common_Tall.gltf`, wind: "grass", baseScale: 1 },
  grassWispyShort: { key: "grassWispyShort", path: `${BASE}/Grass_Wispy_Short.gltf`, wind: "grass", baseScale: 1 },
  grassWispyTall: { key: "grassWispyTall", path: `${BASE}/Grass_Wispy_Tall.gltf`, wind: "grass", baseScale: 1 },
  bushCommon: { key: "bushCommon", path: `${BASE}/Bush_Common.gltf`, wind: "bush", baseScale: 1 },
  bushCommonFlowers: { key: "bushCommonFlowers", path: `${BASE}/Bush_Common_Flowers.gltf`, wind: "bush", baseScale: 1 },
  flower3: { key: "flower3", path: `${BASE}/Flower_3_Group.gltf`, wind: "flower", baseScale: 1 },
  flower4: { key: "flower4", path: `${BASE}/Flower_4_Group.gltf`, wind: "flower", baseScale: 1 },
  fern: { key: "fern", path: `${BASE}/Fern_1.gltf`, wind: "flower", baseScale: 1 },
  clover1: { key: "clover1", path: `${BASE}/Clover_1.gltf`, wind: "grass", baseScale: 1 },
  clover2: { key: "clover2", path: `${BASE}/Clover_2.gltf`, wind: "grass", baseScale: 1 },
  mushroom: { key: "mushroom", path: `${BASE}/Mushroom_Common.gltf`, wind: "static", baseScale: 1 },
  rockPathSmall: { key: "rockPathSmall", path: `${BASE}/RockPath_Round_Small_1.gltf`, wind: "static", baseScale: 1 },
  rockPathWide: { key: "rockPathWide", path: `${BASE}/RockPath_Round_Wide.gltf`, wind: "static", baseScale: 1 },
  pebble: { key: "pebble", path: `${BASE}/Pebble_Round_1.gltf`, wind: "static", baseScale: 1 },
  twistedTree: { key: "twistedTree", path: `${BASE}/TwistedTree_1.gltf`, wind: "tree", baseScale: 1 },
  commonTree: { key: "commonTree", path: `${BASE}/CommonTree_1.gltf`, wind: "tree", baseScale: 1 },
} as const satisfies Record<string, NatureAsset>;

export type NatureAssetKey = keyof typeof NATURE_ASSETS;

/** Every asset path, for preloading. */
export const ALL_ASSET_PATHS = Object.values(NATURE_ASSETS).map((a) => a.path);

/**
 * Wind profiles, shared across the whole garden so everything sways with
 * one coherent "breeze" -- but each plant type reads it at its own speed
 * and amplitude. This is the same idea as the old procedural WindFoliage,
 * now applied to the real models.
 *
 *  - grass: light + quick flutter
 *  - flower: gentle, slower sway
 *  - bush: slow, heavier rock, slightly lagged
 *  - tree: very subtle, very slow
 *  - static: no sway (mushrooms, rocks, pebbles, path stones)
 */
export const WIND_PROFILES: Record<WindCategory, { speed: number; amplitude: number; lag: number }> = {
  grass: { speed: 2.6, amplitude: 0.18, lag: 0 },
  flower: { speed: 1.5, amplitude: 0.12, lag: 0.1 },
  bush: { speed: 0.8, amplitude: 0.06, lag: 0.4 },
  tree: { speed: 0.5, amplitude: 0.025, lag: 0.6 },
  static: { speed: 0, amplitude: 0, lag: 0 },
};
