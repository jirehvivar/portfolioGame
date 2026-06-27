import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProximityPrompt } from "../ui/ProximityPrompt";

interface GreenhouseExteriorProps {
  position: [number, number];
  isNearby: boolean;
  isUnlocked: boolean;
  holdProgress: number;
  visible: boolean;
}

/**
 * The Greenhouse as seen from the garden: a small glass structure glowing
 * from within, surrounded by terracotta pots. This is what the visitor
 * sees while roaming -- the detailed interior (GreenhouseInterior) only
 * mounts once they hold E long enough to enter.
 */
export function GreenhouseExterior({ position, isNearby, isUnlocked, holdProgress, visible }: GreenhouseExteriorProps) {
  const glassRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glassRef.current) {
      const mat = glassRef.current.material as THREE.MeshStandardMaterial;
      const flicker = 0.5 + Math.sin(state.clock.elapsedTime * 1.2) * 0.08;
      mat.emissiveIntensity = (isNearby ? 0.9 : 0.6) * flicker + (isUnlocked ? 0.3 : 0);
    }
  });

  if (!visible) return null;

  return (
    <group position={[position[0], 0, position[1]]}>
      <pointLight position={[0, 1.6, 0]} color="#ffb066" intensity={1.4} distance={7} />

      {/* Greenhouse floor plinth */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.6, 0.1, 24]} />
        <meshStandardMaterial color="#b7654a" roughness={0.8} />
      </mesh>

      {/* Glass structure -- a simple translucent dome standing in for the
          full glasshouse silhouette */}
      <mesh ref={glassRef} position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[1.7, 2.2, 8]} />
        <meshStandardMaterial
          color="#fff3e2"
          emissive="#ffb066"
          emissiveIntensity={0.6}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Terracotta pots ringing the entrance */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + 0.4;
        const r = 2.1;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.2, Math.sin(angle) * r]} castShadow>
            <cylinderGeometry args={[0.25, 0.2, 0.35, 12]} />
            <meshStandardMaterial color="#b7654a" roughness={0.7} />
          </mesh>
        );
      })}

      <ProximityPrompt
        visible={isNearby}
        label={isUnlocked ? "Hold E to revisit FireCast-X" : "Hold E to enter the Greenhouse"}
        holdProgress={holdProgress}
      />
    </group>
  );
}
