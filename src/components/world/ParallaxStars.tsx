import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const STAR_COUNT = 350;
const INNER_RADIUS = 45; // closer than the 80-radius sky dome -> parallax

/**
 * A sparse layer of individual star points sitting *inside* the sky dome.
 * Because it's closer to the camera and rotates at a different rate than
 * the dome, the two layers shear past each other as the camera moves --
 * that relative motion is the parallax that sells depth.
 */
export function ParallaxStars({ reducedMotion }: { reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Random point on the upper hemisphere (don't waste stars underground).
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random()); // bias toward "up"
      const r = INNER_RADIUS + Math.random() * 10;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 5; // keep above horizon
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current && !reducedMotion) {
      // Drifts faster and opposite to the dome -> visible parallax shear.
      pointsRef.current.rotation.y -= delta * 0.008;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        color="#fff3e2"
        transparent
        opacity={0.9}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}