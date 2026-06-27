import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD_RADIUS } from "../../data/projects";

const ROCK_COUNT = 14;

export function GardenGround({ reducedMotion }: { reducedMotion: boolean }) {
  const mistRef = useRef<THREE.Mesh>(null);
  const groundMatRef = useRef<THREE.ShaderMaterial>(null);

  const rocks = useMemo(
    () =>
      Array.from({ length: ROCK_COUNT }, (_, i) => {
        const angle = (i / ROCK_COUNT) * Math.PI * 2 + Math.random() * 0.2;
        const r = WORLD_RADIUS - 1.5 + Math.random() * 1.5;
        return {
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r,
          scale: 0.5 + Math.random() * 0.6,
          rotation: Math.random() * Math.PI,
        };
      }),
    []
  );

  const groundUniforms = useMemo(
    () => ({
      uColorBase: { value: new THREE.Color("#21381f") },
      uColorMoss: { value: new THREE.Color("#3c5e34") },
      uColorOlive: { value: new THREE.Color("#4a5a2e") },
      uColorShadow: { value: new THREE.Color("#2a2f44") },
    }),
    []
  );

  const groundVertex = /* glsl */ `
    varying vec2 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const groundFragment = /* glsl */ `
    uniform vec3 uColorBase;
    uniform vec3 uColorMoss;
    uniform vec3 uColorOlive;
    uniform vec3 uColorShadow;
    varying vec2 vWorld;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      return noise(p) * 0.65 + noise(p * 2.3) * 0.35;
    }

    void main() {
      float n1 = fbm(vWorld * 0.18);
      float n2 = fbm(vWorld * 0.55 + 13.0);

      vec3 col = mix(uColorBase, uColorMoss, smoothstep(0.3, 0.7, n1));
      col = mix(col, uColorOlive, smoothstep(0.6, 0.85, n2) * 0.5);
      col = mix(col, uColorShadow, smoothstep(0.75, 0.95, 1.0 - n1) * 0.35);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  useFrame((state) => {
    if (mistRef.current && !reducedMotion) {
      const t = state.clock.elapsedTime;
      mistRef.current.scale.setScalar(1 + Math.sin(t * 0.2) * 0.03);
      const mat = mistRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.16 + Math.sin(t * 0.3) * 0.015;
    }
  });

  return (
    <group>
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 64]} />
        <shaderMaterial
          ref={groundMatRef}
          vertexShader={groundVertex}
          fragmentShader={groundFragment}
          uniforms={groundUniforms}
        />
      </mesh>

      <mesh ref={mistRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORLD_RADIUS * 0.9, 32]} />
        <meshStandardMaterial color="#a89db5" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {rocks.map((rock, i) => (
        <mesh
          key={i}
          position={[rock.x, 0.25 * rock.scale, rock.z]}
          rotation={[0.3, rock.rotation, 0.1]}
          scale={rock.scale}
          castShadow
        >
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#171a3d" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}