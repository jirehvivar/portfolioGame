import { useEffect, useRef } from "react";

/**
 * Tracks the live pressed/released state of the keys this app cares about.
 *
 * Why a ref instead of state: movement code reads this every animation
 * frame inside useFrame. Putting key state in React state would cause a
 * re-render on every key event and fight with the 60fps render loop.
 * A ref gives the animation loop instant, render-free access.
 */
export type ControlKey =
  | "forward"
  | "backward"
  | "strafeLeft"
  | "strafeRight"
  | "sprint"
  | "hop"
  | "interact"
  | "escape";

const KEY_MAP: Record<string, ControlKey> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "strafeLeft",
  ArrowLeft: "strafeLeft",
  KeyD: "strafeRight",
  ArrowRight: "strafeRight",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Space: "hop",
  KeyE: "interact",
  Enter: "interact",
  Escape: "escape",
};

const EMPTY_STATE: Record<ControlKey, boolean> = {
  forward: false,
  backward: false,
  strafeLeft: false,
  strafeRight: false,
  sprint: false,
  hop: false,
  interact: false,
  escape: false,
};

export function useKeyboardControls() {
  const pressed = useRef<Record<ControlKey, boolean>>({ ...EMPTY_STATE });

  // Fires once per "fresh" keydown (not on auto-repeat) -- useful for
  // discrete actions like "hop" or "escape" that should trigger once,
  // not continuously while held.
  const justPressed = useRef<Record<ControlKey, boolean>>({ ...EMPTY_STATE });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      // Prevent the browser from scrolling the page on Space/arrow keys.
      e.preventDefault();
      if (!pressed.current[action]) {
        justPressed.current[action] = true;
      }
      pressed.current[action] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      pressed.current[action] = false;
    };

    // Holding a key while the tab loses focus can leave it "stuck" pressed.
    const handleBlur = () => {
      pressed.current = { ...EMPTY_STATE };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  /** Call once per frame after reading justPressed values to reset them. */
  const clearJustPressed = () => {
    justPressed.current = { ...EMPTY_STATE };
  };

  return { pressed, justPressed, clearJustPressed };
}
