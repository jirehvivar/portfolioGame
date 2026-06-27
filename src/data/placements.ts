import { LANDMARKS, WORLD_RADIUS } from "../data/projects";
import type { InstanceTransform } from "../components/world/InstancedNature";
import type { NatureAssetKey } from "../data/natureAssets";

/**
 * Deterministic placement generation for the whole garden.
 *
 * Everything here is driven by a small seeded PRNG (mulberry32) instead of
 * Math.random(). That makes the world identical on every load -- so the
 * layout you tune is the layout you ship, and nothing pops to a new
 * arrangement on refresh. Change SEED to roll a different garden.
 */

const SEED = 20260626;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

/** Spawn-clearing: keep the very center (where Glowpuff starts) walkable and open. */
const SPAWN = { x: 0, z: 6, radius: 3 };

/** Distance from a point to the nearest terracotta path (center -> each landmark). */
function distanceToNearestPath(x: number, z: number): number {
  let min = Infinity;
  for (const l of LANDMARKS) {
    // Path is the segment from origin (0,0) to the landmark position.
    const [lx, lz] = l.position;
    const len2 = lx * lx + lz * lz;
    const tRaw = len2 === 0 ? 0 : (x * lx + z * lz) / len2;
    const t = Math.max(0, Math.min(1, tRaw));
    const px = t * lx;
    const pz = t * lz;
    min = Math.min(min, Math.hypot(x - px, z - pz));
  }
  return min;
}

function distanceToNearestLandmark(x: number, z: number): number {
  let min = Infinity;
  for (const l of LANDMARKS) {
    min = Math.min(min, Math.hypot(x - l.position[0], z - l.position[1]));
  }
  return min;
}

interface ScatterOptions {
  count: number;
  /** Inner radius of the spawn disc to avoid. */
  minScale: number;
  maxScale: number;
  /** Keep this clear of landmark floors. */
  landmarkClearance?: number;
  /**
   * "pathBias" > 0 makes the asset cluster nearer the paths/landmarks;
   * 0 spreads evenly. Used to thicken grass along the trails.
   */
  pathBias?: number;
  /** Restrict placement to a ring [innerRadius, outerRadius] from center. */
  innerRadius?: number;
  outerRadius?: number;
}

function scatter(opts: ScatterOptions): InstanceTransform[] {
  const {
    count,
    minScale,
    maxScale,
    landmarkClearance = 3.5,
    pathBias = 0,
    innerRadius = 0,
    outerRadius = WORLD_RADIUS - 1.5,
  } = opts;

  const out: InstanceTransform[] = [];
  let attempts = 0;
  const maxAttempts = count * 40;

  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const r = innerRadius + Math.sqrt(rand()) * (outerRadius - innerRadius);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Never inside the spawn clearing or on a landmark floor.
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < SPAWN.radius) continue;
    if (distanceToNearestLandmark(x, z) < landmarkClearance) continue;

    // Path-biased rejection: the closer to a path, the higher the accept
    // probability. Far-from-path candidates are probabilistically dropped.
    if (pathBias > 0) {
      const d = distanceToNearestPath(x, z);
      const acceptProb = Math.max(0.12, 1 - (d / 6) * pathBias);
      if (rand() > acceptProb) continue;
    }

    out.push({
      position: [x, 0, z],
      rotationY: rand() * Math.PI * 2,
      scale: minScale + rand() * (maxScale - minScale),
      phase: rand() * Math.PI * 2,
    });
  }
  return out;
}

/**
 * The full placement set, keyed by asset. Counts are tuned for a lush but
 * still-performant garden: grass dominates (instanced, cheap), trees are
 * rare (heavy textures, used as silhouettes near the edge).
 */
export const PLACEMENTS: Partial<Record<NatureAssetKey, InstanceTransform[]>> = {
  // --- Grass: the bulk of the lushness, thickened along paths ---
  grassCommonShort: scatter({ count: 170, minScale: 0.7, maxScale: 1.2, pathBias: 0.6, landmarkClearance: 3 }),
  grassCommonTall: scatter({ count: 120, minScale: 0.8, maxScale: 1.4, pathBias: 0.5, landmarkClearance: 3 }),
  grassWispyShort: scatter({ count: 110, minScale: 0.7, maxScale: 1.2, pathBias: 0.3, landmarkClearance: 3 }),
  grassWispyTall: scatter({ count: 90, minScale: 0.9, maxScale: 1.5, pathBias: 0.2, landmarkClearance: 3 }),
  

  // --- Flowers + ferns + clover: mid-layer detail ---
  flower3: scatter({ count: 90, minScale: 0.7, maxScale: 1.1, pathBias: 2 }),
  flower4: scatter({ count: 32, minScale: 0.7, maxScale: 1.1, pathBias: 2 }),
  fern: scatter({ count: 26, minScale: 0.8, maxScale: 1.3 }),
  clover1: scatter({ count: 90, minScale: 0.8, maxScale: 1.3, pathBias: 2 }),
  clover2: scatter({ count: 90, minScale: 0.8, maxScale: 1.3, pathBias: 2}),

  // --- Mushrooms: small magical accents, tucked away from paths ---
  mushroom: scatter({ count: 18, minScale: 0.8, maxScale: 1.4 }),

  // --- Bushes: scattered inside, plus a denser ring forming the boundary ---
  bushCommon: scatter({ count: 14, minScale: 0.9, maxScale: 1.4 }),
  bushCommonFlowers: [
    ...scatter({ count: 10, minScale: 0.9, maxScale: 1.4 }),
    // Boundary ring of flowering bushes -- a soft natural wall.
    ...scatter({ count: 22, minScale: 1.1, maxScale: 1.7, innerRadius: WORLD_RADIUS - 3, outerRadius: WORLD_RADIUS - 0.5, landmarkClearance: 2 }),
  ],

  // --- Path stones + pebbles along the trails ---
  pebble: scatter({ count: 24, minScale: 0.7, maxScale: 1.3, pathBias: 0.8 }),

  // --- Trees: rare silhouettes near the edge (kept few; heavy textures) ---
  twistedTree: scatter({ count: 5, minScale: 1, maxScale: 1.6, innerRadius: WORLD_RADIUS - 6, outerRadius: WORLD_RADIUS - 1, landmarkClearance: 4 }),
  commonTree: scatter({ count: 5, minScale: 1, maxScale: 1.6, innerRadius: WORLD_RADIUS - 6, outerRadius: WORLD_RADIUS - 1, landmarkClearance: 4 }),
};
