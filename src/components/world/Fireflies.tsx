import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const FIREFLY_COUNT = 36;
const FIELD_RADIUS = 22;

interface FireflySeed {
  baseX: number;
  baseZ: number;
  baseY: number;
  driftRadius: number;
  driftSpeed: number;
  phase: number;
  bobSpeed: number;
  blinkSpeed: number;
  blinkPhase: number;
}

/**
 * A soft round glow sprite, drawn once into a canvas texture and shared by
 * every firefly. A radial gradient (hot white core -> warm yellow -> fully
 * transparent) is what makes these read as glowing points of light rather
 * than the flat little spheres they were before.
 */
function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,235,1)");
  g.addColorStop(0.25, "rgba(246,232,140,0.9)");
  g.addColorStop(0.55, "rgba(246,210,120,0.35)");
  g.addColorStop(1, "rgba(246,210,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Fireflies as glowing, blinking sprites that wander in slow independent
 * paths -- deliberately NOT tied to the shared wind clock. Each one:
 *  - drifts in a lazy circle around its own home point (lantern-like)
 *  - bobs up and down on a separate timer
 *  - blinks: its brightness AND size pulse together, with occasional
 *    near-full dimming, the way real fireflies wink out and reappear
 *
 * Sprites always face the camera, so they stay as soft glowing dots from
 * any viewing angle.
 */
export function Fireflies({ reducedMotion }: { reducedMotion: boolean }) {
  const glowTexture = useMemo(() => makeGlowTexture(), []);

  const seeds = useMemo<FireflySeed[]>(() => {
    // Local PRNG so firefly layout is stable across reloads.
    let a = 99173;
    const rnd = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: FIREFLY_COUNT }, () => {
      const angle = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * FIELD_RADIUS;
      return {
        baseX: Math.cos(angle) * r,
        baseZ: Math.sin(angle) * r,
        baseY: 0.5 + rnd() * 2,
        driftRadius: 0.8 + rnd() * 1.6,
        driftSpeed: 0.1 + rnd() * 0.2,
        phase: rnd() * Math.PI * 2,
        bobSpeed: 0.4 + rnd() * 0.5,
        blinkSpeed: 1.2 + rnd() * 1.6,
        blinkPhase: rnd() * Math.PI * 2,
      };
    });
  }, []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const seed = seeds[i];
      const sprite = child as THREE.Sprite;

      if (!reducedMotion) {
        const localT = t * seed.driftSpeed + seed.phase;
        sprite.position.set(
          seed.baseX + Math.cos(localT) * seed.driftRadius,
          seed.baseY + Math.sin(t * seed.bobSpeed + seed.phase) * 0.3,
          seed.baseZ + Math.sin(localT * 0.8) * seed.driftRadius
        );
      }

      // Blink: raise to a power so the firefly spends most of its time dim
      // with brief bright flashes, instead of a smooth even pulse.
      const blinkRaw = (Math.sin(t * seed.blinkSpeed + seed.blinkPhase) + 1) / 2;
      const blink = reducedMotion ? 0.6 : Math.pow(blinkRaw, 2.2);
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.15 + blink * 0.85;
      const s = 0.35 + blink * 0.4;
      sprite.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {seeds.map((seed, i) => (
        <sprite key={i} position={[seed.baseX, seed.baseY, seed.baseZ]} scale={0.4}>
          <spriteMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color="#fff4c2"
          />
        </sprite>
      ))}
    </group>
  );
}
