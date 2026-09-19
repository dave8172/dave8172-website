import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Two fields, two jobs, and they are deliberately not the same field.
 *
 * `category` decides which shelf a project sits on at home. There are two, and
 * the split is one question: does the thing contain AI, or not. It is declared
 * per project rather than inferred from `kind`, because both shelves hold
 * open-source repos, benchmarks and client builds — no mapping exists.
 *
 *   ai         — agents, eval harnesses, extraction, model benchmarks.
 *   automation — spreadsheets, scripts, integrations. No model in the loop.
 *
 * `kind` decides the badge on the card — what sort of artifact this is, and
 * how far a reader can check it for themselves.
 *
 *   oss        — a public repo. The only category a reader can go and verify
 *                line by line, so it keeps its badge wherever it is shelved.
 *   tool       — something a visitor can actually run, here or on stuffs.bid.
 *   benchmark  — a measurement writeup, where the number is the point.
 *   automation — client and integration work.
 */
const projectKind = z.enum(["oss", "tool", "benchmark", "automation"]);
/** No default: a new project is filed onto a shelf by hand, or the build fails. */
const projectCategory = z.enum(["ai", "automation"]);

const projects = defineCollection({
  // Content Layer API. The glob loader's `id` is the filename without its
  // extension, which is exactly what the legacy `slug` was — so every
  // /projects/<slug> URL is unchanged by this migration.
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    image: z.string(),

    category: projectCategory,
    kind: projectKind.default("automation"),
    /** Card label. Falls back to `title`, which is often too long for a card. */
    cardTitle: z.string().optional(),
    /** Card blurb. Falls back to `description`, which is written for search. */
    cardDescription: z.string().optional(),
    /** Public repo URL — renders the GitHub link on the card. */
    repo: z.string().url().optional(),
    /** PyPI package name — renders `pip install <name>` on the card. */
    pypi: z.string().optional(),
    /** Where a visitor can use the thing right now. */
    liveUrl: z.string().optional(),
    /** Short label for the live link, e.g. "affiliateprogramterms.com". */
    liveLabel: z.string().optional(),
    license: z.string().optional(),
    language: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    image: z.string(),
    featured: z.boolean().optional(),
  }),
});

export const collections = {
  projects,
  blog,
};
