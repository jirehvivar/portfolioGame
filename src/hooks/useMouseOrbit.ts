import { useEffect, useRef } from "react";

const YAW_SENSITIVITY = 0.0035;
const PITCH_SENSITIVITY = 0.0025;
const PITCH_MIN = -0.15; // looking slightly up at Glowpuff
const PITCH_MAX = 0.9; // looking down toward Glowpuff from above

/**
 * Click-and-drag camera orbit, the web-friendly cousin of Fortnite's
 * pointer-lock mouse-look.
 *
 * A deliberate adaptation: true pointer-lock (capturing and hiding the
 * cursor) is the literal Fortnite approach, but it's a poor fit for a
 * portfolio site -- it hijacks the cursor the moment a recruiter moves
 * their mouse, and it would directly conflict with the Greenhouse's
 * watering can, which needs an ordinary, visible cursor to aim with.
 * Click-and-drag gives the same "look around Glowpuff" feel without
 * taking over the pointer.
 *
 * Returns refs (not state) so SceneController can read live yaw/pitch
 * every frame without triggering React re-renders.
 */
export function useMouseOrbit(enabled: boolean) {
  const yaw = useRef(0);
  const pitch = useRef(0.35);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let lastX = 0;
    let lastY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      yaw.current -= dx * YAW_SENSITIVITY;
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current + dy * PITCH_SENSITIVITY));
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [enabled]);

  return { yaw, pitch, isDragging };
}
