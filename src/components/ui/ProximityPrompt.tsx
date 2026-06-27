import { Html } from "@react-three/drei";

interface ProximityPromptProps {
  visible: boolean;
  label: string;
  /** 0-1. When provided, renders a filling ring instead of a plain label. */
  holdProgress?: number;
}

/**
 * A floating sign anchored above a landmark. When `holdProgress` is
 * provided, it renders as a "hold E to enter" ring that fills while the
 * key is held, rather than a flat instant-trigger label.
 */
export function ProximityPrompt({ visible, label, holdProgress }: ProximityPromptProps) {
  if (!visible) return null;

  const showRing = holdProgress !== undefined;
  const percent = Math.round((holdProgress ?? 0) * 100);

  return (
    <Html position={[0, 2.6, 0]} center distanceFactor={10} occlude>
      <div className="flex flex-col items-center gap-2" role="status">
        {showRing && (
          <div
            className="w-10 h-10 rounded-full"
            style={{
              background: `conic-gradient(#f6a6c9 ${percent * 3.6}deg, rgba(255,243,226,0.25) 0deg)`,
            }}
            aria-hidden="true"
          />
        )}
        <div className="px-3 py-1.5 rounded-full bg-warm-cream/95 text-deep-indigo text-sm font-medium whitespace-nowrap shadow-lg">
          {label}
        </div>
      </div>
    </Html>
  );
}
