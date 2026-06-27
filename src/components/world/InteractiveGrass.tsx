import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { WORLD_RADIUS } from "../../data/projects";
import { LANDMARKS } from "../../data/projects";
import { glowpuffState } from "../../world/glowpuffState";

const GRASS_TEXTURE = "/models/stylized-nature/Grass.png";

const BLADE_HEIGHT = 0.26;
const BLADE_WIDTH = 0.09;
const BLADE_COUNT = 1000000;
const PATCH_RADIUS = WORLD_RADIUS - 1;

const INFLUENCE_RADIUS = 1.6;
const PRESS_RADIUS = 0.7;

export function InteractiveGrass({ reducedMotion }: { reducedMotion: boolean }) {
  const texture = useTexture(GRASS_TEXTURE);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { clock } = useThree();

  const rng = useMemo(() => {
    let a = 4242424;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    const positions = new Float32Array([
      -0.5, 0, 0,
       0.5, 0, 0,
       0.0, 1, 0.15,
    ]);
    const heights = new Float32Array([0, 0, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
    const indices = [0, 1, 2];

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aHeight", new THREE.Float32BufferAttribute(heights, 1));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const offsets = new Float32Array(BLADE_COUNT * 3);
    const rotations = new Float32Array(BLADE_COUNT);
    const phases = new Float32Array(BLADE_COUNT);
    const scales = new Float32Array(BLADE_COUNT);
    const tints = new Float32Array(BLADE_COUNT);

    let placed = 0;
    let guard = 0;
    while (placed < BLADE_COUNT && guard < BLADE_COUNT * 4) {
      guard++;
      const ang = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * PATCH_RADIUS;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      let onLandmark = false;
      for (const l of LANDMARKS) {
        if (Math.hypot(x - l.position[0], z - l.position[1]) < 3) {
          onLandmark = true;
          break;
        }
      }
      if (onLandmark) continue;

      offsets[placed * 3] = x;
      offsets[placed * 3 + 1] = 0;
      offsets[placed * 3 + 2] = z;
      rotations[placed] = rng() * Math.PI;
      phases[placed] = rng() * Math.PI * 2;
      scales[placed] = 0.6 + rng() * 0.8;
      tints[placed] = rng();
      placed++;
    }

    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute("aRotation", new THREE.InstancedBufferAttribute(rotations, 1));
    geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 1));
    geo.instanceCount = placed;
    return geo;
  }, [rng]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMap: { value: texture },
      uGlowpuff: { value: new THREE.Vector3(0, 0, 6) },
      uReaction: { value: 1 },
      uBladeHeight: { value: BLADE_HEIGHT },
      uBladeWidth: { value: BLADE_WIDTH },
      uInfluence: { value: INFLUENCE_RADIUS },
      uPress: { value: PRESS_RADIUS },
      uWindAmp: { value: reducedMotion ? 0 : 1 },
      
      uColorRoot: { value: new THREE.Color("#0d1308") },
      uColorMid: { value: new THREE.Color("#2f3d22") },
      uColorTip: { value: new THREE.Color("#4f6235") },
      uTintCool: { value: new THREE.Color("#1b240c") },
      uTintWarm: { value: new THREE.Color("#3f4e24") },
    }),
    [texture, reducedMotion]
  );

  const vertexShader = /* glsl */ `
    attribute float aHeight;
    attribute vec3 aOffset;
    attribute float aRotation;
    attribute float aPhase;
    attribute float aScale;
    attribute float aTint;

    uniform float uTime;
    uniform vec3 uGlowpuff;
    uniform float uReaction;
    uniform float uBladeHeight;
    uniform float uBladeWidth;
    uniform float uInfluence;
    uniform float uPress;
    uniform float uWindAmp;

    varying vec2 vUv;
    varying float vHeight;
    varying float vTint;

    mat2 rot2(float a) {
      float s = sin(a); float c = cos(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vUv = uv;
      vHeight = aHeight;
      vTint = aTint;

      vec3 pos = position;
      pos.x *= uBladeWidth;
      pos.y *= uBladeHeight * aScale;
      pos.z *= uBladeHeight * aScale;
      pos.xz = rot2(aRotation) * pos.xz;

      vec3 worldBase = aOffset;

      float field = sin(uTime * 0.8 + worldBase.x * 0.15 + worldBase.z * 0.15);
      float wind = sin(uTime * 1.8 + aPhase + worldBase.x * 0.3 + worldBase.z * 0.3);
      float windBend = (wind * 0.10 + field * 0.06) * uWindAmp;
      pos.x += windBend * aHeight;
      pos.z += cos(uTime * 1.3 + aPhase) * 0.05 * uWindAmp * aHeight;

      vec2 toBlade = worldBase.xz - uGlowpuff.xz;
      float dist = length(toBlade);
      vec2 awayDir = dist > 0.0001 ? toBlade / dist : vec2(1.0, 0.0);

      if (dist < uInfluence && uReaction > 0.0) {
        float t = 1.0 - (dist / uInfluence);
        float strength = t * t * uReaction;
        if (dist < uPress) {
          float pressAmt = (1.0 - dist / uPress) * uReaction;
          pos.y -= pressAmt * uBladeHeight * aScale * 0.85 * aHeight;
          pos.xz += awayDir * pressAmt * 0.15 * aHeight;
        } else {
          pos.xz += awayDir * strength * 0.5 * aHeight;
          pos.y -= strength * uBladeHeight * aScale * 0.3 * aHeight;
        }
      }

      vec3 worldPos = worldBase + pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform sampler2D uMap;
    uniform vec3 uColorRoot;
    uniform vec3 uColorMid;
    uniform vec3 uColorTip;
    uniform vec3 uTintCool;
    uniform vec3 uTintWarm;
    varying vec2 vUv;
    varying float vHeight;
    varying float vTint;

    void main() {
      vec3 vert = vHeight < 0.5
        ? mix(uColorRoot, uColorMid, vHeight * 2.0)
        : mix(uColorMid, uColorTip, (vHeight - 0.5) * 2.0);

      vec3 tinted = mix(uTintCool, uTintWarm, vTint);

      vec4 tex = texture2D(uMap, vUv);
      vec3 base = mix(vert, tinted, 0.4);
      vec3 color = mix(base, base * (0.85 + tex.r * 0.3), 0.5);

      color *= 0.7 + 0.3 * smoothstep(0.0, 0.35, vHeight);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.elapsedTime;
    matRef.current.uniforms.uGlowpuff.value.copy(glowpuffState.position);
    const target = glowpuffState.airborne ? 0 : 1;
    const cur = matRef.current.uniforms.uReaction.value as number;
    matRef.current.uniforms.uReaction.value = THREE.MathUtils.lerp(cur, target, 0.2);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent={false}
      />
    </mesh>
  );
}