import type { CollectionEntry } from "astro:content";

export type Project = CollectionEntry<"projects">;

/**
 * The home page is three shelves and nothing else: two of work, one of writing.
 *
 * It used to be four sections of cards stacked vertically — open source, tools,
 * benchmarks, automation — which meant the page's shape was an answer to "what
 * sort of artifact is this", a question no visitor is asking. A visitor is
 * asking "does this person do the AI thing, or the spreadsheet thing". So the
 * shelves split on that, and the artifact question moved to the card badge,
 * where it is a detail rather than a navigation decision.
 *
 * The labels are load-bearing for search: they are the only <h2>s on the page,
 * so they say what a person would type, not what an insider would call it.
 */
export const SHELVES = [
  {
    id: "ai",
    label: "AI Engineering",
    note: "Agents, eval harnesses and extraction pipelines, plus benchmarks measuring what each model actually gets right and what it costs to find out.",
  },
  {
    id: "automation",
    label: "Automation",
    note: "Excel, Google Sheets, VBA, Apps Script and Python — integrations and internal systems built for businesses that were not going to buy one.",
  },
] as const;

export type Shelf = (typeof SHELVES)[number];

const byNewest = (a: Project, b: Project) => b.data.date.getTime() - a.data.date.getTime();

/** Shelves in declared order, each newest-first. An empty shelf is dropped. */
export function shelveProjects(projects: Project[]) {
  return SHELVES
    .map((shelf) => ({
      shelf,
      items: projects.filter((p) => p.data.category === shelf.id).sort(byNewest),
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
 * One project entry -> the props <ProjectCard> wants, so a card looks the same
 * wherever it is rendered.
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
