import * as THREE from "three";

/**
 * Glowpuff's live world position, shared as a plain mutable Vector3.
 * Updates every frame, so it bypasses React state (which would re-render
 * 60x/sec) -- SceneController writes it, the grass shader reads it.
 * `airborne` tells the grass to stop reacting while Glowpuff is mid-hop.
 */
export const glowpuffState = {
  position: new THREE.Vector3(0, 0, 6),
  airborne: false,
};