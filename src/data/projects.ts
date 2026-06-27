import type { Project, LandmarkConfig } from "../types";

/**
 * Layout of the garden hub. The player starts at the origin clearing.
 * Greenhouse and Piano Room sit front-left/front-right; the Observatory
 * is farther back, marking it as the more distant, cosmic destination.
 */
export const LANDMARKS: LandmarkConfig[] = [
  { id: "greenhouse", name: "The Greenhouse", position: [-11, -8], triggerRadius: 4, status: "interactive" },
  { id: "pianoRoom", name: "The Piano Room", position: [11, -8], triggerRadius: 4, status: "placeholder" },
  { id: "observatory", name: "The Observatory", position: [0, -23], triggerRadius: 4.5, status: "placeholder" },
];

/** Soft world boundary -- Glowpuff's position is clamped within this radius. */
export const WORLD_RADIUS = 27;

/**
 * Project content for each landmark's reveal.
 * Replace the placeholder demoUrl / githubUrl / youtubeId values with your
 * real links before shipping -- everything else here is ready to go.
 */
export const PROJECTS: Record<string, Project> = {
  greenhouse: {
    id: "greenhouse",
    title: "FireCast-X",
    hook: "Predicting where wildfires spread before they do.",
    description:
      "A predictive analytics tool that models wildfire risk and spread using historical fire, weather, and terrain data. Built to give responders an earlier read on which areas need attention first.",
    techStack: ["Python", "scikit-learn", "Pandas", "Mapbox"],
    youtubeId: undefined,
    thumbnailUrl: undefined,
    demoUrl: "#",
    githubUrl: "#",
    caseStudyUrl: "#",
  },
  pianoRoom: {
    id: "pianoRoom",
    title: "Comet Claim",
    hook: "A clean, sequential flow for a complex claims process.",
    description:
      "An application that turns a multi-step claims process into a guided, low-friction flow. The focus throughout was sequencing: showing the user exactly one decision at a time, in the right order.",
    techStack: ["React", "TypeScript", "Node.js", "PostgreSQL"],
    demoUrl: "#",
    githubUrl: "#",
    caseStudyUrl: "#",
  },
  observatory: {
    id: "observatory",
    title: "Ad-Astra",
    hook: "A small space exploration game built from scratch.",
    description:
      "A space-themed game exploring procedural systems and player-driven exploration. The most technically ambitious project in this collection, and the one that pushed hardest into new territory.",
    techStack: ["Unity", "C#", "Blender"],
    demoUrl: "#",
    githubUrl: "#",
    caseStudyUrl: "#",
  },
};
