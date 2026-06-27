/**
 * Shared types for "Grounded to the Stars".
 * Keeping these in one file means the store, the world, and the UI
 * panels are all describing the same shapes -- no drift between them.
 */

/** The three landmarks scattered around the garden hub. */
export type LandmarkId = "greenhouse" | "pianoRoom" | "observatory";

/** Whether a landmark has its full interior experience built yet. */
export type LandmarkStatus = "interactive" | "placeholder";

/** A project revealed after a landmark's interaction is completed. */
export interface Project {
  id: LandmarkId;
  title: string;
  hook: string;
  description: string;
  techStack: string[];
  /** YouTube video ID for the embedded demo placeholder (not auto-played). */
  youtubeId?: string;
  thumbnailUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  caseStudyUrl?: string;
}

/** Where a landmark sits in the open-world garden hub (world X/Z position). */
export interface LandmarkConfig {
  id: LandmarkId;
  name: string;
  /** [x, z] position in the garden hub. */
  position: [number, number];
  /** How close Glowpuff must be (in world units) to trigger "in range". */
  triggerRadius: number;
  status: LandmarkStatus;
}

/** The visitor's current relationship to the 3D world. */
export type WorldPhase = "outdoor" | "enteringGreenhouse" | "greenhouseInterior" | "exitingGreenhouse";
