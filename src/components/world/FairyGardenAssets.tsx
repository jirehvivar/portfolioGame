import { useGLTF } from "@react-three/drei";
import { NATURE_ASSETS, ALL_ASSET_PATHS, type NatureAssetKey } from "../../data/natureAssets";
import { PLACEMENTS } from "../../data/placements";
import { InstancedNature } from "./InstancedNature";

interface FairyGardenAssetsProps {
  reducedMotion: boolean;
}

/**
 * Renders the entire Stylized Nature MegaKit dressing for the garden:
 * grass, flowers, ferns, clover, mushrooms, bushes, path stones, pebbles,
 * and a few edge trees -- each as a single instanced draw per primitive.
 *
 * This sits inside the outdoor world group in SceneController and replaces
 * the old hand-built procedural foliage. The landmarks, Glowpuff, ground,
 * fog, and controls are all untouched.
 *
 * Must be rendered inside a <Suspense> boundary (it is, in SceneController)
 * because useGLTF suspends while the models stream in.
 */
export function FairyGardenAssets({ reducedMotion }: FairyGardenAssetsProps) {
  return (
    <group>
      {(Object.keys(PLACEMENTS) as NatureAssetKey[]).map((key) => {
        const instances = PLACEMENTS[key];
        const asset = NATURE_ASSETS[key];
        if (!instances || instances.length === 0 || !asset) return null;
        return (
          <InstancedNature
            key={key}
            asset={asset}
            instances={instances}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </group>
  );
}

// Preload every model so they're warm by the time the scene mounts,
// avoiding visible pop-in as the visitor starts exploring.
ALL_ASSET_PATHS.forEach((path) => useGLTF.preload(path));
