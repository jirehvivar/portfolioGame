import { useEffect, useState } from "react";

/**
 * Reads `prefers-reduced-motion` and keeps it live if the user changes
 * their OS setting mid-session. The 3D scene uses this to skip camera
 * fly-ins, squash/stretch, and sparkle-trail motion -- swapping them for
 * instant cuts and static visuals instead of just "less" motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
