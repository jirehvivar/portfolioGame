import { useGameStore } from "../../store/gameStore";
import { PROJECTS } from "../../data/projects";

/**
 * The accessibility/recruiter fallback: every project in a normal card
 * layout, no 3D, no keyboard puzzle required. Reachable via a visible
 * "Skip animation" link at all times -- this is a first-class way to see
 * the portfolio, not an afterthought.
 */
export function SkipToListView() {
  const setSkipToList = useGameStore((s) => s.setSkipToList);

  return (
    <main className="min-h-screen bg-navy text-warm-cream px-6 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <button
            type="button"
            onClick={() => setSkipToList(false)}
            className="text-sm text-soft-pink hover:underline focus-visible:ring-2 focus-visible:ring-soft-pink rounded px-1"
          >
            ← Back to the interactive experience
          </button>
          <h1 className="font-display text-3xl sm:text-4xl mt-6">Grounded to the Stars</h1>
          <p className="text-warm-cream/70 mt-2 max-w-xl">
            A plain list of every project from the interactive version of this portfolio --
            no animation, no keyboard puzzles, just the work.
          </p>
        </header>

        <ul className="flex flex-col gap-6">
          {Object.values(PROJECTS).map((project) => (
            <li
              key={project.id}
              className="border border-warm-cream/15 rounded-2xl p-6 bg-deep-indigo/60"
            >
              <h2 className="font-display text-xl">{project.title}</h2>
              <p className="text-soft-pink text-sm mt-1">{project.hook}</p>
              <p className="text-warm-cream/80 text-sm mt-3 leading-relaxed">{project.description}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs px-2.5 py-1 rounded-full bg-warm-cream/10 text-warm-cream/80 border border-warm-cream/15"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-4 py-2 rounded-full bg-soft-pink text-deep-indigo font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-warm-cream"
                >
                  Watch Demo
                </a>
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-4 py-2 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/30 hover:bg-warm-cream/20 focus-visible:ring-2 focus-visible:ring-soft-pink"
                >
                  View GitHub
                </a>
                <a
                  href={project.caseStudyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-4 py-2 rounded-full bg-warm-cream/10 text-warm-cream border border-warm-cream/30 hover:bg-warm-cream/20 focus-visible:ring-2 focus-visible:ring-soft-pink"
                >
                  Read Case Study
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
