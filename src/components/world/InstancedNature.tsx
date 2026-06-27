import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { WIND_PROFILES, type NatureAsset } from "../../data/natureAssets";

/** One placed instance of an asset in the world. */
export interface InstanceTransform {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  /** Random per-instance phase offset so neighbours don't sway in lockstep. */
  phase: number;
}

interface InstancedNatureProps {
  asset: NatureAsset;
  instances: InstanceTransform[];
  reducedMotion: boolean;
}

/**
 * Loads a single glTF asset and draws every placement of it as GPU
 * instances -- one InstancedMesh per mesh-primitive in the source model.
 *
 * Why this matters: the brief wants "way more grass" and dense clumps.
 * Rendering hundreds of individual <primitive> clones would mean hundreds
 * of draw calls and a dead framerate. Collapsing each asset type into a
 * handful of InstancedMeshes keeps 300 grass blades at ~1 draw call.
 *
 * Wind is applied per-frame by rewriting each instance's matrix with a
 * small rotation about its base, using the asset's wind profile. Static
 * assets (rocks, mushrooms, path stones) write their matrices once and
 * then skip the per-frame update entirely.
 *
 * The source models carry their own baked materials (vertex colours +
 * the shared MegaKit textures), so we reuse each primitive's material
 * as-is rather than re-tinting -- that's what preserves the kit's look.
 */
export function InstancedNature({ asset, instances, reducedMotion }: InstancedNatureProps) {
  const gltf = useGLTF(asset.path);
  const profile = WIND_PROFILES[asset.wind];
  const isStatic = asset.wind === "static" || profile.amplitude === 0;

  // Pull every mesh primitive (geometry + material) out of the loaded
  // scene. Most kit assets are one primitive; trees/flowers have two
  // (e.g. bark + leaves), and each needs its own InstancedMesh.
  const primitives = useMemo(() => {
    const found: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          found.push({ geometry: mesh.geometry, material: mat });
        });
      }
    });
    return found;
  }, [gltf]);

  // Refs to every InstancedMesh we create (one per primitive).
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Write the resting (wind-free) matrices once on mount and whenever the
  // placement set changes. For static assets this is the only matrix
  // update they ever get.
  useEffect(() => {
    instances.forEach((inst, i) => {
      dummy.position.set(...inst.position);
      dummy.rotation.set(0, inst.rotationY, 0);
      dummy.scale.setScalar(inst.scale * asset.baseScale);
      dummy.updateMatrix();
      meshRefs.current.forEach((mesh) => mesh?.setMatrixAt(i, dummy.matrix));
    });
    meshRefs.current.forEach((mesh) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  }, [instances, asset.baseScale, dummy, primitives.length]);

  useFrame((state) => {
    if (isStatic || reducedMotion) return;
    const t = state.clock.elapsedTime;

    instances.forEach((inst, i) => {
      // Sway is a small tilt about the instance's base, phase-shifted per
      // instance and lagged per wind category so the field looks alive
      // rather than uniform.
      const swayAngle = Math.sin(t * profile.speed - profile.lag + inst.phase) * profile.amplitude;
      dummy.position.set(...inst.position);
      dummy.rotation.set(swayAngle, inst.rotationY, swayAngle * 0.5);
      dummy.scale.setScalar(inst.scale * asset.baseScale);
      dummy.updateMatrix();
      meshRefs.current.forEach((mesh) => mesh?.setMatrixAt(i, dummy.matrix));
    });
    meshRefs.current.forEach((mesh) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {primitives.map((prim, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => {
            meshRefs.current[pi] = el;
          }}
          args={[prim.geometry, prim.material, instances.length]}
          castShadow={asset.wind === "tree" || asset.wind === "bush"}
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}
