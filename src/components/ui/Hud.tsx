import { useGameStore } from "../../store/gameStore";

/**
 * Always-visible chrome that sits on top of the 3D canvas: the
 * accessibility skip link, a short control legend, and the audio toggle.
 * None of this depends on the 3D scene loading correctly, which matters
 * for screen-reader and no-JS-fallback users (the skip link is the very
 * first focusable element on the page).
 */
export function Hud() {
  const setSkipToList = useGameStore((s) => s.setSkipToList);
  const audioMuted = useGameStore((s) => s.audioMuted);
  const toggleAudioMuted = useGameStore((s) => s.toggleAudioMuted);
  const worldPhase = useGameStore((s) => s.worldPhase);

  return (
    <div className="fixed inset-x-0 top-0 z-20 flex items-start justify-between p-4 pointer-events-none">
      <button
        type="button"
        onClick={() => setSkipToList(true)}
        className="pointer-events-auto text-sm px-3 py-1.5 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/25 hover:bg-warm-cream/20 focus-visible:ring-2 focus-visible:ring-soft-pink"
      >
        Skip animation / View as list
      </button>

      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={toggleAudioMuted}
          aria-pressed={!audioMuted}
          className="text-sm px-3 py-1.5 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/25 hover:bg-warm-cream/20 focus-visible:ring-2 focus-visible:ring-soft-pink"
        >
          {audioMuted ? "🔇 Audio off" : "🔊 Audio on"}
        </button>
      </div>

      <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-16 text-xs text-warm-cream/60 text-center pointer-events-none">
        {worldPhase === "outdoor" && (
          <p>
            W/A/S/D or arrows to move · drag mouse to look around · Shift to glide faster · Space to hop · hold E to
            enter a landmark
          </p>
        )}
        {worldPhase === "greenhouseInterior" && <p>Move the mouse to aim the watering can · hold click or E to pour · Esc to leave</p>}
      </div>
    </div>
  );
}
