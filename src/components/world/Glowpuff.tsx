import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GlowpuffProps {
  /** True while a hop is in progress -- drives squash/stretch. */
  isHopping: boolean;
  /** True while Glowpuff is translating along the path -- drives the sparkle trail. */
  isMoving: boolean;
  reducedMotion: boolean;
}

const SPARKLE_COUNT = 14;
const BLINK_DURATION = 0.16; // seconds

/**
 * Glowpuff: the soft pink mascot the visitor controls.
 *
 * Deliberately built from primitive geometry (spheres + small cones for the
 * ear nubs) rather than an imported model. That keeps the file
 * self-contained, keeps the bundle small, and matches the brief's call for
 * a realistic, achievable v1 -- no Blender pipeline required.
 *
 * All motion here is "idle" animation local to Glowpuff (bob, squash,
 * blink, sparkle drift). Where Glowpuff actually *is* in the world, and
 * which way it's facing, is decided by the parent (SceneController),
 * which positions and rotates this component's enclosing group.
 */
export function Glowpuff({ isHopping, isMoving, reducedMotion }: GlowpuffProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const squashRef = useRef(1); // 1 = normal, <1 = squashed, >1 = stretched
  const sparkleGroupRef = useRef<THREE.Group>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const nextBlinkAt = useRef(2 + Math.random() * 3);
  const blinkStartedAt = useRef<number | null>(null);

  // Pre-compute stable random offsets for each sparkle so they drift
  // independently instead of moving in lockstep.
  const sparkleSeeds = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 0.35 + Math.random() * 0.5,
        speed: 0.5 + Math.random() * 0.8,
        yOffset: Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Idle bob: a gentle sine wave on the body's local Y position.
    if (bodyRef.current) {
      const bob = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.08;
      bodyRef.current.position.y = 0.6 + bob;
    }

    // Squash/stretch: ease toward "stretched" while hopping, "squashed"
    // briefly on landing, otherwise settle back to 1.
    const target = isHopping ? 1.25 : 1;
    squashRef.current = THREE.MathUtils.damp(squashRef.current, target, 6, delta);
    if (bodyRef.current) {
      bodyRef.current.scale.set(
        1 / Math.sqrt(squashRef.current),
        squashRef.current,
        1 / Math.sqrt(squashRef.current)
      );
    }

    // Blink: a quick double-dip of the eyes' vertical scale on a
    // randomized timer. Skipped entirely under reduced motion so the
    // face stays still rather than flickering.
    if (eyeLeftRef.current && eyeRightRef.current) {
      if (reducedMotion) {
        eyeLeftRef.current.scale.y = 1;
        eyeRightRef.current.scale.y = 1;
      } else {
        if (blinkStartedAt.current === null && t >= nextBlinkAt.current) {
          blinkStartedAt.current = t;
        }
        let eyeScaleY = 1;
        if (blinkStartedAt.current !== null) {
          const progress = (t - blinkStartedAt.current) / BLINK_DURATION;
          if (progress >= 1) {
            blinkStartedAt.current = null;
            nextBlinkAt.current = t + 2.5 + Math.random() * 3;
          } else {
            eyeScaleY = 1 - Math.sin(progress * Math.PI) * 0.92;
          }
        }
        eyeLeftRef.current.scale.y = eyeScaleY;
        eyeRightRef.current.scale.y = eyeScaleY;
      }
    }

    // Sparkle trail: only animate (and only render meaningfully) while
    // moving, and skip entirely under reduced motion.
    if (sparkleGroupRef.current) {
      sparkleGroupRef.current.visible = isMoving && !reducedMotion;
      if (isMoving && !reducedMotion) {
        sparkleGroupRef.current.children.forEach((child, i) => {
          const seed = sparkleSeeds[i];
          const localT = t * seed.speed + seed.phase;
          child.position.set(
            Math.cos(seed.angle + localT) * seed.radius,
            seed.yOffset + Math.sin(localT * 1.5) * 0.15,
            Math.sin(seed.angle + localT) * seed.radius - 0.3
          );
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.25 + 0.35 * Math.abs(Math.sin(localT));
        });
      }
    }
  });

  return (
    <group>
      {/* Glow light -- a soft point light gives Glowpuff a believable halo
          without needing post-processing bloom for v1. */}
      <pointLight color="#f6a6c9" intensity={1.4} distance={4} />

      <group ref={bodyRef}>
        {/* Body */}
        <mesh castShadow>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial
            color="#f6a6c9"
            emissive="#f6a6c9"
            emissiveIntensity={0.5}
            roughness={0.4}
          />
        </mesh>

        {/* Ear nubs */}
        <mesh position={[-0.22, 0.48, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.22, 16]} />
          <meshStandardMaterial color="#d98aa8" emissive="#d98aa8" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.22, 0.48, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.1, 0.22, 16]} />
          <meshStandardMaterial color="#d98aa8" emissive="#d98aa8" emissiveIntensity={0.3} />
        </mesh>

        {/* Eyes -- simple dark spheres on -Z, the direction Glowpuff
            faces. The parent group rotates to keep -Z pointed along the
            current movement heading, so this stays correct regardless of
            travel direction. */}
        <mesh ref={eyeLeftRef} position={[-0.18, 0.05, -0.48]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#171a3d" />
        </mesh>
        <mesh ref={eyeRightRef} position={[0.18, 0.05, -0.48]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#171a3d" />
        </mesh>

        {/* Tiny feet/nubs */}
        <mesh position={[-0.2, -0.5, -0.1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#f6a6c9" emissive="#f6a6c9" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.2, -0.5, -0.1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#f6a6c9" emissive="#f6a6c9" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Sparkle trail */}
      <group ref={sparkleGroupRef}>
        {sparkleSeeds.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial
              color="#f6a6c9"
              emissive="#f6a6c9"
              emissiveIntensity={1}
              transparent
              opacity={0.3}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
