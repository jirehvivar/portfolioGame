import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import { PROJECTS } from "../../data/projects";

const POT_HEIGHT = 0.2;
const GROW_DURATION_S = 6.5; // within the brief's 5-8s range
const DECAY_RATE = 0.5;
const POUR_RADIUS = 1.4; // how close the can must be to the pots to count
const DROPLET_COUNT = 10;
const POT_CLUSTER = new THREE.Vector3(0, 0, -0.4);

interface GreenhouseInteriorProps {
  visible: boolean;
}

/**
 * The focused Greenhouse interior. Mounted (and the outdoor world hidden)
 * once the visitor holds E long enough outside. The watering can follows
 * the mouse cursor across a virtual plane in front of the camera --
 * pouring only counts while the can is actually positioned over the pots,
 * so aiming matters rather than just holding a button.
 */
export function GreenhouseInterior({ visible }: GreenhouseInteriorProps) {
  const { camera, raycaster, pointer } = useThree();
  const greenhouseGrowth = useGameStore((s) => s.greenhouseGrowth);
  const setGreenhouseGrowth = useGameStore((s) => s.setGreenhouseGrowth);
  const unlockedProjects = useGameStore((s) => s.unlockedProjects);
  const unlockProject = useGameStore((s) => s.unlockProject);
  const setWorldPhase = useGameStore((s) => s.setWorldPhase);

  const canRef = useRef<THREE.Group>(null);
  const canTargetRef = useRef(new THREE.Vector3(0, 1, 0.6));
  const plantRefs = useRef<THREE.Mesh[]>([]);
  const dropletRefs = useRef<THREE.Mesh[]>([]);
  const dropletTimer = useRef(0);
  const isPouringRef = useRef(false);
  const [isPouring, setIsPouring] = useState(false);

  const plantPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -1), []);

  // Pouring can be held via mouse-down or the E key, mirroring the
  // brief's "Holding the mouse button or holding E pours water".
  useEffect(() => {
    if (!visible) return;
    const setPouring = (value: boolean) => {
      isPouringRef.current = value;
      setIsPouring(value);
    };
    const handleMouseDown = () => setPouring(true);
    const handleMouseUp = () => setPouring(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE") setPouring(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyE") setPouring(false);
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      setPouring(false);
    };
  }, [visible]);

  useFrame((state, delta) => {
    if (!visible) return;
    const t = state.clock.elapsedTime;

    // Project the cursor onto a plane in front of the camera to find
    // where the watering can should hover.
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plantPlane, hit)) {
      hit.x = THREE.MathUtils.clamp(hit.x, -1.3, 1.3);
      hit.z = THREE.MathUtils.clamp(hit.z, -1.1, 0.4);
      canTargetRef.current.copy(hit);
    }
    if (canRef.current) {
      canRef.current.position.lerp(canTargetRef.current, 1 - Math.pow(0.0001, delta));
      canRef.current.rotation.z = isPouringRef.current ? -0.6 : -0.15;
    }

    // Growth only progresses while pouring AND aimed near the pots.
    const distToPots = canTargetRef.current.distanceTo(
      new THREE.Vector3(POT_CLUSTER.x, canTargetRef.current.y, POT_CLUSTER.z)
    );
    const isAimed = distToPots < POUR_RADIUS;
    const rate = isPouringRef.current && isAimed ? 1 / GROW_DURATION_S : -DECAY_RATE;
    const next = THREE.MathUtils.clamp(greenhouseGrowth + rate * delta, 0, 1);
    if (next !== greenhouseGrowth) setGreenhouseGrowth(next);
    if (next >= 1 && !unlockedProjects.greenhouse) {
      unlockProject("greenhouse");
    }

    // Plant visual growth
    plantRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.scale.setScalar(0.5 + next * 0.7 + i * 0.03);
    });

    // Water droplets: while pouring and aimed, spawn a falling droplet
    // every ~120ms, recycled round-robin through a small fixed pool.
    dropletTimer.current += delta;
    if (isPouringRef.current && isAimed && dropletTimer.current > 0.12) {
      dropletTimer.current = 0;
      const droplet = dropletRefs.current[Math.floor(t * 10) % DROPLET_COUNT];
      if (droplet) {
        droplet.position.copy(canTargetRef.current);
        droplet.position.y -= 0.05;
        droplet.userData.fallStart = t;
        droplet.visible = true;
      }
    }
    dropletRefs.current.forEach((droplet) => {
      if (!droplet || !droplet.visible) return;
      const elapsed = t - (droplet.userData.fallStart ?? t);
      droplet.position.y -= delta * 1.6;
      if (elapsed > 0.4 || droplet.position.y < POT_HEIGHT) droplet.visible = false;
    });
  });

  if (!visible) return null;

  const project = PROJECTS.greenhouse;
  const percent = Math.round(greenhouseGrowth * 100);

  return (
    <group>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 3, 1]} color="#ffb066" intensity={1.5} distance={8} />

      {/* Floor */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#b7654a" roughness={0.85} />
      </mesh>

      {/* Back shelf */}
      <mesh position={[0, 0.3, -1.6]}>
        <boxGeometry args={[2.6, 0.1, 0.5]} />
        <meshStandardMaterial color="#2f5d46" roughness={0.7} />
      </mesh>

      {/* Pots with plants */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={x} position={[x, -0.15, -0.4]}>
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.26, 0.4, 16]} />
            <meshStandardMaterial color="#b7654a" roughness={0.7} />
          </mesh>
          <mesh
            ref={(el) => {
              if (el) plantRefs.current[i] = el;
            }}
            position={[0, 0.45, 0]}
          >
            <coneGeometry args={[0.26, 0.6, 8]} />
            <meshStandardMaterial color="#8faf8a" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Watering can, following the cursor */}
      <group ref={canRef} position={[0, 1, 0.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.16, 0.3, 12]} />
          <meshStandardMaterial color="#d98aa8" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0.22, 0.05, 0]} rotation={[0, 0, 0.9]}>
          <cylinderGeometry args={[0.03, 0.05, 0.4, 8]} />
          <meshStandardMaterial color="#d98aa8" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>

      {/* Water droplets */}
      {Array.from({ length: DROPLET_COUNT }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            if (el) dropletRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#b9a7e8" transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Progress indicator while still growing */}
      {!unlockedProjects.greenhouse && (
        <Html position={[0, 1.9, -0.4]} center>
          <div className="flex flex-col items-center gap-1">
            <div className="w-40 h-2 rounded-full bg-warm-cream/20 overflow-hidden">
              <div className="h-full bg-sage-green transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-warm-cream/70">
              Aim over the pots and hold the mouse button (or E) to water -- {percent}%
            </p>
          </div>
        </Html>
      )}

      {/* Embedded project reveal -- a glowing panel on the back wall,
          not a pop-up modal */}
      {unlockedProjects.greenhouse && (
        <Html position={[0, 1, -1.55]} transform distanceFactor={2.2}>
          <div className="w-80 rounded-xl bg-deep-indigo/90 border border-warm-cream/20 p-5 shadow-2xl backdrop-blur-sm">
            <h2 className="font-display text-xl text-warm-cream">{project.title}</h2>
            <p className="text-soft-pink text-xs mt-1">{project.hook}</p>
            <p className="text-warm-cream/80 text-xs mt-3 leading-relaxed">{project.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.techStack.map((tech) => (
                <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full bg-warm-cream/10 text-warm-cream/80 border border-warm-cream/15">
                  {tech}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-soft-pink text-deep-indigo font-medium">
                Watch Demo
              </a>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/30">
                View GitHub
              </a>
              <a href={project.caseStudyUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/30">
                Read Case Study
              </a>
            </div>
            <button
              type="button"
              onClick={() => setWorldPhase("exitingGreenhouse")}
              className="mt-4 text-xs text-warm-cream/60 hover:text-warm-cream underline"
            >
              ← Back to World (Esc)
            </button>
          </div>
        </Html>
      )}

      {isPouring && (
        <Html position={[0, 2.4, 0]} center>
          <p className="text-xs text-warm-cream/50">pouring...</p>
        </Html>
      )}
    </group>
  );
}
