import type { CollectionEntry } from "astro:content";

export type Project = CollectionEntry<"projects">;

/**
 * The section order, defined once, for the one page that lists work.
 *
 * Open source leads deliberately: it is the only work on this site a reader
 * can go and verify line by line.
 */
export const PROJECT_GROUPS = [
  {
    id: "oss",
    label: "Open Source",
    note: "Public repos on PyPI and GitHub. Read the code, run the tests, check the claims.",
  },
  {
    id: "tool",
    label: "Tools You Can Use",
    note: "Working software, not screenshots. Upload something and watch it come back structured.",
  },
  {
    id: "benchmark",
    label: "Benchmarks",
    note: "Accuracy and cost measured on real documents, with the numbers written down.",
  },
  {
    id: "automation",
    label: "Automation & Integrations",
    note: "Spreadsheet systems, API integrations, and AI workflows built for real businesses.",
  },
] as const;

export type ProjectGroup = (typeof PROJECT_GROUPS)[number];

const byNewest = (a: Project, b: Project) => b.data.date.getTime() - a.data.date.getTime();

/** Groups in declared order, each with its projects newest-first. Empty groups are dropped. */
export function groupProjects(projects: Project[]) {
  return PROJECT_GROUPS
    .map((group) => ({
      group,
      items: projects.filter((p) => p.data.kind === group.id).sort(byNewest),
    }))
    .filter(({ items }) => items.length > 0);
}

const BADGES: Record<string, string> = {
  oss: "Open source",
  tool: "Live tool",
  benchmark: "Benchmark",
  automation: "Client build",
};

/**
 * One project entry -> the props <ProjectCard> wants. Home and /projects both
 * go through this, so a card looks the same wherever it is rendered.
 */
export function toCardProps(project: Project) {
  const { data } = project;

  const links = [
    data.liveUrl && {
      href: data.liveUrl,
      label: data.liveLabel ?? "Try it",
      external: !data.liveUrl.startsWith("/"),
    },
    data.repo && { href: data.repo, label: "GitHub", external: true },
    data.pypi && { href: `https://pypi.org/project/${data.pypi}/`, label: "PyPI", external: true },
  ].filter(Boolean) as { href: string; label: string; external: boolean }[];

  const meta = [data.language, data.license].filter(Boolean).join(" · ");

  return {
    href: `/projects/${project.id}`,
    title: data.cardTitle ?? data.title,
    description: data.cardDescription ?? data.description,
    tags: data.tags,
    badge: BADGES[data.kind],
    kind: data.kind,
    command: data.pypi ? `pip install ${data.pypi}` : undefined,
    meta: meta || undefined,
    links,
  };
}
