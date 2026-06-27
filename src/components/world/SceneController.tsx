import { Suspense, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useMouseOrbit } from "../../hooks/useMouseOrbit";
import { LANDMARKS, WORLD_RADIUS } from "../../data/projects";
import type { LandmarkId, WorldPhase } from "../../types";
import { Glowpuff } from "./Glowpuff";
import { GardenGround } from "./GardenGround";
import { FairyGardenAssets } from "./FairyGardenAssets";
import { Fireflies } from "./Fireflies";
import { GreenhouseExterior } from "../landmarks/GreenhouseExterior";
import { PlaceholderLandmark } from "../landmarks/PlaceholderLandmark";
import { GreenhouseInterior } from "../landmarks/GreenhouseInterior";
import { SkyDome } from "./SkyDome";
import { ParallaxStars } from "./ParallaxStars";
import { GardenPaths } from "./GardenPaths";
import { InteractiveGrass } from "./InteractiveGrass";
import { glowpuffState } from "../../world/glowpuffState";

const WALK_SPEED = 6;
const SPRINT_MULTIPLIER = 1.6;
const ACCEL_DAMP = 7;
const HOP_DURATION = 0.4;
const HOP_HEIGHT = 1;
const CAMERA_DISTANCE = 5.5;
const CAMERA_HEIGHT_OFFSET = 1.4;
const HOLD_TO_ENTER_SECONDS = 1.1;
const TRANSITION_SECONDS = 1.1;

const GREENHOUSE = LANDMARKS[0];
const PIANO_ROOM = LANDMARKS[1];
const OBSERVATORY = LANDMARKS[2];

// Fixed camera framing used while inside the Greenhouse.
const INTERIOR_CAMERA_POS = new THREE.Vector3(0, 1.7, 2.6);
const INTERIOR_CAMERA_LOOK = new THREE.Vector3(0, 0.9, -0.6);

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function isTransitionPhase(phase: WorldPhase) {
  return phase === "enteringGreenhouse" || phase === "exitingGreenhouse";
}

interface SceneControllerProps {
  reducedMotion: boolean;
}

/**
 * Owns the open-world garden hub: camera-relative WASD movement, the
 * click-and-drag orbit camera, hop physics, landmark proximity, the
 * "hold E to enter" Greenhouse trigger, and the camera transition into
 * and out of the Greenhouse interior.
 *
 * Movement itself is fully imperative (refs mutated inside useFrame) so
 * the 60fps loop never forces a React re-render. React state only
 * changes on meaningful transitions (hop, moving, nearby landmark, hold
 * progress) -- frequent enough to feel responsive, rare enough to stay
 * cheap.
 *
 * The outdoor world group is always mounted (never conditionally
 * unmounted) and only its `visible` flag toggles when entering the
 * Greenhouse. This matters: if it were unmounted, Glowpuff's position
 * ref would be destroyed and recreated, snapping the visitor back to the
 * spawn point every time they left the Greenhouse.
 */
export function SceneController({ reducedMotion }: SceneControllerProps) {
  const { camera } = useThree();
  const { pressed, justPressed, clearJustPressed } = useKeyboardControls();

  const worldPhase = useGameStore((s) => s.worldPhase);
  const setWorldPhase = useGameStore((s) => s.setWorldPhase);
  const nearbyLandmark = useGameStore((s) => s.nearbyLandmark);
  const setNearbyLandmark = useGameStore((s) => s.setNearbyLandmark);
  const unlockedProjects = useGameStore((s) => s.unlockedProjects);

  const isOutdoor = worldPhase === "outdoor";
  const isInterior = worldPhase === "greenhouseInterior";
  const isTransitioning = isTransitionPhase(worldPhase);
  const outdoorVisible = isOutdoor || isTransitioning;

  const { yaw, pitch } = useMouseOrbit(isOutdoor);

  const playerGroupRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const hopRef = useRef({ active: false, elapsed: 0 });
  const lastMovingRef = useRef(false);
  const holdProgressRef = useRef(0);
  const prevWorldPhaseRef = useRef<WorldPhase>(worldPhase);
  const transitionRef = useRef({ elapsed: 0, fromPos: new THREE.Vector3() });

  const [isHopping, setIsHopping] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [greenhouseHoldProgress, setGreenhouseHoldProgress] = useState(0);

  useFrame((_state, delta) => {
    const player = playerGroupRef.current;
    if (!player) return;

    // Detect the *moment* a transition phase starts, regardless of what
    // triggered it (hold-to-enter outside, the in-world "Back to World"
    // button, or Escape) -- this is what keeps the camera tween correctly
    // timed no matter which path led here.
    if (worldPhase !== prevWorldPhaseRef.current) {
      prevWorldPhaseRef.current = worldPhase;
      if (isTransitionPhase(worldPhase)) {
        transitionRef.current.elapsed = 0;
        transitionRef.current.fromPos.copy(camera.position);
      }
    }

    // --- Escape: exit the Greenhouse from anywhere inside it ---
    if (justPressed.current.escape && isInterior) {
      setWorldPhase("exitingGreenhouse");
    }

    // ============ OUTDOOR MOVEMENT, CAMERA, AND PROXIMITY ============
    if (isOutdoor) {
      // Camera-relative movement: forward/back and strafe are expressed
      // relative to the camera's current yaw, so "W" always means
      // "the direction the camera is currently facing", Fortnite-style.
      const forwardInput = (pressed.current.forward ? 1 : 0) - (pressed.current.backward ? 1 : 0);
      const strafeInput = (pressed.current.strafeRight ? 1 : 0) - (pressed.current.strafeLeft ? 1 : 0);

      const camForward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const camRight = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

      const moveDir = new THREE.Vector3()
        .addScaledVector(camForward, forwardInput)
        .addScaledVector(camRight, strafeInput);

      const hasInput = moveDir.lengthSq() > 0;
      if (hasInput) moveDir.normalize();

      const speed = WALK_SPEED * (pressed.current.sprint ? SPRINT_MULTIPLIER : 1);
      const targetVelocity = moveDir.multiplyScalar(speed);
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, targetVelocity.x, ACCEL_DAMP, delta);
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, targetVelocity.z, ACCEL_DAMP, delta);

      const nextX = player.position.x + velocity.current.x * delta;
      const nextZ = player.position.z + velocity.current.z * delta;
      const distFromCenter = Math.hypot(nextX, nextZ);
      if (distFromCenter > WORLD_RADIUS - 1) {
        const clampScale = (WORLD_RADIUS - 1) / distFromCenter;
        player.position.x = nextX * clampScale;
        player.position.z = nextZ * clampScale;
      } else {
        player.position.x = nextX;
        player.position.z = nextZ;
      }

      // Rotate Glowpuff smoothly to face its movement heading.
      if (hasInput) {
        const targetHeading = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
        let angleDiff = targetHeading - player.rotation.y;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        player.rotation.y += angleDiff * Math.min(1, delta * 8);
      }

      const moving = velocity.current.length() > 0.3;
      if (moving !== lastMovingRef.current) {
        lastMovingRef.current = moving;
        setIsMoving(moving);
      }

      // --- Hop ---
      if (justPressed.current.hop && !hopRef.current.active) {
        hopRef.current.active = true;
        hopRef.current.elapsed = 0;
        setIsHopping(true);
      }
      if (hopRef.current.active) {
        hopRef.current.elapsed += delta;
        const hopT = Math.min(hopRef.current.elapsed / HOP_DURATION, 1);
        player.position.y = Math.sin(hopT * Math.PI) * HOP_HEIGHT;
        if (hopT >= 1) {
          hopRef.current.active = false;
          player.position.y = 0;
          setIsHopping(false);
        }
      }

      // --- Proximity detection ---
      const closest = LANDMARKS.find(
        (l) => Math.hypot(player.position.x - l.position[0], player.position.z - l.position[1]) < l.triggerRadius
      );
      const closestId: LandmarkId | null = closest ? closest.id : null;
      if (closestId !== nearbyLandmark) {
        setNearbyLandmark(closestId);
        holdProgressRef.current = 0;
        setGreenhouseHoldProgress(0);
      }

      // --- Hold E to enter the Greenhouse ---
      if (nearbyLandmark === "greenhouse") {
        if (pressed.current.interact) {
          holdProgressRef.current = Math.min(1, holdProgressRef.current + delta / HOLD_TO_ENTER_SECONDS);
        } else {
          holdProgressRef.current = Math.max(0, holdProgressRef.current - delta * 2);
        }
        setGreenhouseHoldProgress(holdProgressRef.current);
        if (holdProgressRef.current >= 1) {
          holdProgressRef.current = 0;
          setGreenhouseHoldProgress(0);
          setWorldPhase("enteringGreenhouse");
        }
      }

      // --- Third-person orbit camera, behind and above Glowpuff ---
      // --- Third-person orbit camera with sky-look pitch ---
// The camera orbits around a target slightly above Glowpuff.
// Yaw rotates 360 around the character.
// Pitch controls how high/low the camera sits, allowing the user to look up at the sky.
const orbitTarget = new THREE.Vector3(
  player.position.x,
  player.position.y + 1.0,
  player.position.z
);

const camOffset = new THREE.Vector3(
  Math.sin(yaw.current) * Math.cos(pitch.current),
  Math.sin(pitch.current),
  Math.cos(yaw.current) * Math.cos(pitch.current)
).multiplyScalar(CAMERA_DISTANCE);

const desiredCamPos = orbitTarget.clone().add(camOffset);

// Prevent camera from dipping under the ground.
desiredCamPos.y = Math.max(desiredCamPos.y, 0.45);

camera.position.lerp(
  desiredCamPos,
  reducedMotion ? 1 : 1 - Math.pow(0.0005, delta)
);

camera.lookAt(orbitTarget);
    }

    // ============ GREENHOUSE ENTER/EXIT TRANSITIONS ============
    if (isTransitioning) {
      transitionRef.current.elapsed += delta;
      const progress = Math.min(transitionRef.current.elapsed / TRANSITION_SECONDS, 1);
      const eased = easeInOutCubic(progress);

      if (worldPhase === "enteringGreenhouse") {
        camera.position.lerpVectors(transitionRef.current.fromPos, INTERIOR_CAMERA_POS, eased);
        const lookTarget = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(player.position.x, 1, player.position.z),
          INTERIOR_CAMERA_LOOK,
          eased
        );
        camera.lookAt(lookTarget);
        if (progress >= 1) setWorldPhase("greenhouseInterior");
      } else {
        // exitingGreenhouse: reverse the trip, landing back on the
        // outdoor follow camera right where Glowpuff is standing.
        const outdoorTarget = new THREE.Vector3(
          player.position.x + Math.sin(yaw.current) * CAMERA_DISTANCE,
          CAMERA_HEIGHT_OFFSET + 0.4,
          player.position.z + Math.cos(yaw.current) * CAMERA_DISTANCE
        );
        camera.position.lerpVectors(transitionRef.current.fromPos, outdoorTarget, eased);
        camera.lookAt(player.position.x, 1, player.position.z);
        if (progress >= 1) setWorldPhase("outdoor");
      }
    }

    // ============ STATIC INTERIOR CAMERA ============
    if (isInterior) {
      camera.position.copy(INTERIOR_CAMERA_POS);
      camera.lookAt(INTERIOR_CAMERA_LOOK);
    }

    clearJustPressed();
  });

  return (
    <>
      <fogExp2 attach="fog" args={["#b9a7e8", 0.012]} />
      <ambientLight intensity={0.55} color="#f6a6c9" />
      <directionalLight position={[6, 10, 4]} intensity={0.7} color="#fff3e2" />

      <group visible={outdoorVisible}>
        <SkyDome reducedMotion={reducedMotion} />
        <ParallaxStars reducedMotion={reducedMotion} />

        <GardenGround reducedMotion={reducedMotion} />
        <Suspense fallback={null}>
          <GardenPaths />
        </Suspense>
        <Suspense fallback={null}>
          <InteractiveGrass reducedMotion={reducedMotion} />
        </Suspense>
        <Suspense fallback={null}>
          <FairyGardenAssets reducedMotion={reducedMotion} />
        </Suspense>
        <Fireflies reducedMotion={reducedMotion} />

        <group ref={playerGroupRef} position={[0, 0, 6]}>
          <Glowpuff isHopping={isHopping} isMoving={isMoving} reducedMotion={reducedMotion} />
        </group>

        <GreenhouseExterior
          position={GREENHOUSE.position}
          isNearby={nearbyLandmark === "greenhouse"}
          isUnlocked={unlockedProjects.greenhouse}
          holdProgress={greenhouseHoldProgress}
          visible={outdoorVisible}
        />
        <PlaceholderLandmark
          position={PIANO_ROOM.position}
          name="The Piano Room"
          color="#b9a7e8"
          isNearby={nearbyLandmark === "pianoRoom"}
        />
        <PlaceholderLandmark
          position={OBSERVATORY.position}
          name="The Observatory"
          color="#8faf8a"
          isNearby={nearbyLandmark === "observatory"}
        />
      </group>

      <GreenhouseInterior visible={isInterior} />
    </>
  );
}
