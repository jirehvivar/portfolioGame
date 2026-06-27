import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PATHS } from "../../data/paths";

const PATH_STONE_MODEL = `${import.meta.env.BASE_URL}models/stylized-nature/RockPath_Round_Wide.gltf`;
const STONE_BASE_SCALE = 1.1;

/**
 * Curved terracotta trails connecting the spawn clearing to every landmark.
 * Two layers: a flat "dirt" ribbon following each curve, and rounded path
 * stones from the MegaKit instanced along the curve. All curve/placement
 * maths lives in data/paths.ts.
 */
export function GardenPaths() {
  const gltf = useGLTF(PATH_STONE_MODEL);

  const primitives = useMemo(() => {
    const found: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => found.push({ geometry: mesh.geometry, material: mat }));
      }
    });
    return found;
  }, [gltf]);

  const allStones = useMemo(() => PATHS.flatMap((p) => p.stones), []);

  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    allStones.forEach((stone, i) => {
      dummy.position.set(...stone.position);
      dummy.rotation.set(0, stone.rotationY, 0);
      dummy.scale.setScalar(stone.scale * STONE_BASE_SCALE);
      dummy.updateMatrix();
      meshRefs.current.forEach((mesh) => mesh?.setMatrixAt(i, dummy.matrix));
    });
    meshRefs.current.forEach((mesh) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  }, [allStones, dummy, primitives.length]);

  const dirtMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a85a42",
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );

  return (
    <group>
      {PATHS.map((path) => (
        <mesh key={path.id} geometry={path.ribbonGeometry} material={dirtMaterial} receiveShadow />
      ))}

      {primitives.map((prim, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => {
            meshRefs.current[pi] = el;
          }}
          args={[prim.geometry, prim.material, allStones.length]}
          receiveShadow
          castShadow
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

useGLTF.preload(PATH_STONE_MODEL);