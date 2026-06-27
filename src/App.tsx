import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGameStore } from "./store/gameStore";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { SceneController } from "./components/world/SceneController";
import { Hud } from "./components/ui/Hud";
import { SkipToListView } from "./components/ui/SkipToListView";

export default function App() {
  const skipToList = useGameStore((s) => s.skipToList);
  const reducedMotion = useReducedMotion();

  if (skipToList) {
    return <SkipToListView />;
  }

  return (
    <div className="relative w-screen h-screen bg-navy">
      <Canvas shadows camera={{ fov: 55, near: 0.1, far: 200, position: [0, 4, 14] }}>
        <SceneController reducedMotion={reducedMotion} />
        {/* Soft bloom gives the fairy-garden glow (Glowpuff, fireflies,
            the Greenhouse glass) without needing hand-painted light
            textures. Skipped under reduced motion isn't necessary here --
            bloom is a static post-process, not motion -- so it stays on. */}
        <EffectComposer>
          <Bloom intensity={0.4} luminanceThreshold={0.72} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      <Hud />
    </div>
  );
}
