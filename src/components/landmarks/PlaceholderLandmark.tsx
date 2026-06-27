import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProximityPrompt } from "../ui/ProximityPrompt";

interface PlaceholderLandmarkProps {
  position: [number, number];
  name: string;
  color: string;
  isNearby: boolean;
}

/**
 * A simple glowing marker standing in for a landmark whose interior
 * hasn't been designed yet (currently the Piano Room and Observatory).
 * It's visible and identifiable in the world, but intentionally doesn't
 * wire up a "hold E to enter" interaction -- there's nowhere to go yet.
 */
export function PlaceholderLandmark({ position, name, color, isNearby }: PlaceholderLandmarkProps) {
  const crystalRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 0.3;
      const t = state.clock.elapsedTime;
      crystalRef.current.position.y = 1.1 + Math.sin(t * 1.4) * 0.12;
    }
  });

  return (
    <group position={[position[0], 0, position[1]]}>
      <pointLight position={[0, 1.4, 0]} color={color} intensity={1} distance={6} />

      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2, 2, 0.1, 24]} />
        <meshStandardMaterial color="#171a3d" roughness={0.7} />
      </mesh>

      <mesh ref={crystalRef} position={[0, 1.1, 0]} castShadow>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>

      <ProximityPrompt visible={isNearby} label={`${name} -- coming soon`} />
    </group>
  );
}
