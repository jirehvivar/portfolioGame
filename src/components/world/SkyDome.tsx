import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const SKY_TEXTURE = `${import.meta.env.BASE_URL}textures/milkyway.jpg`;

// Palette tint applied to the raw photo so the sky lives in the fairy
// world: a cool lavender-indigo multiply. Lower = darker/moodier.
const TINT = new THREE.Color("#8f86a6");
const TINT_STRENGTH = 0.55; // 0 = full original photo, 1 = fully tinted
const BRIGHTNESS = 0.45;    // dim the whole dome so it's soft, not harsh

interface SkyDomeProps {
  reducedMotion: boolean;
}

/**
 * A large inverted sphere wrapping the world, textured with a real
 * equirectangular Milky Way image but tinted + dimmed into the pastel
 * palette. Rotates slowly so the stars drift overhead.
 *
 * Rendered with `side: BackSide` so we see the texture from inside the
 * sphere, and `depthWrite: false` / very large radius so it always sits
 * behind every object and the fog veils its lower edge.
 */
export function SkyDome({ reducedMotion }: SkyDomeProps) {
  const texture = useTexture(SKY_TEXTURE);
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();

  // Tint the photo toward the palette by blending its color with TINT.
  // We bake this into the material color + a multiply, keeping the
  // texture's luminance (the stars) but shifting its hue.
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const tinted = TINT.clone().lerp(new THREE.Color("#ffffff"), 1 - TINT_STRENGTH);
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
      color: tinted.multiplyScalar(BRIGHTNESS + (1 - BRIGHTNESS)), // tint * brightness
      fog: false, // the dome itself isn't fogged; foreground objects are
      toneMapped: true,
    });
  }, [texture]);

  // Apply brightness separately so TINT/BRIGHTNESS read cleanly above.
  useMemo(() => {
    material.color.multiplyScalar(BRIGHTNESS);
  }, [material]);

  useFrame((_, delta) => {
    if (meshRef.current && !reducedMotion) {
      // Very slow drift -- a full rotation takes several minutes.
      meshRef.current.rotation.y += delta * 0.004;
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      {/* Big enough to enclose the whole WORLD_RADIUS world with margin. */}
      <sphereGeometry args={[80, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}