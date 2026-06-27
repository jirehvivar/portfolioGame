import { create } from "zustand";
import type { LandmarkId, WorldPhase } from "../types";

interface GameState {
  /** Where the visitor currently is: roaming the garden, or inside the Greenhouse. */
  worldPhase: WorldPhase;
  setWorldPhase: (phase: WorldPhase) => void;

  /** Which landmark, if any, Glowpuff is currently close enough to interact with. */
  nearbyLandmark: LandmarkId | null;
  setNearbyLandmark: (id: LandmarkId | null) => void;

  /** Which project panels have been unlocked (and should stay unlocked). */
  unlockedProjects: Record<LandmarkId, boolean>;
  unlockProject: (id: LandmarkId) => void;

  /** 0 (dry) -> 1 (bloomed). Drives the Greenhouse plants in real time. */
  greenhouseGrowth: number;
  setGreenhouseGrowth: (value: number) => void;

  /** Skip the 3D experience entirely and show the plain accessible list. */
  skipToList: boolean;
  setSkipToList: (value: boolean) => void;

  /** Whether ambient audio is muted. Defaults to true per the brief. */
  audioMuted: boolean;
  toggleAudioMuted: () => void;
}

const initialUnlocked: Record<LandmarkId, boolean> = {
  greenhouse: false,
  pianoRoom: false,
  observatory: false,
};

export const useGameStore = create<GameState>((set) => ({
  worldPhase: "outdoor",
  setWorldPhase: (phase) => set({ worldPhase: phase }),

  nearbyLandmark: null,
  setNearbyLandmark: (id) => set({ nearbyLandmark: id }),

  unlockedProjects: initialUnlocked,
  unlockProject: (id) =>
    set((state) => ({
      unlockedProjects: { ...state.unlockedProjects, [id]: true },
    })),

  greenhouseGrowth: 0,
  setGreenhouseGrowth: (value) => set({ greenhouseGrowth: value }),

  skipToList: false,
  setSkipToList: (value) => set({ skipToList: value }),

  audioMuted: true,
  toggleAudioMuted: () => set((state) => ({ audioMuted: !state.audioMuted })),
}));
