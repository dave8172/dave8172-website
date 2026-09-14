import { defineCollection, z } from "astro:content";

/**
 * `kind` decides which section a project appears in, on the home page and on
 * /projects alike — both read the same groups from `src/lib/projectGroups.ts`,
 * so a project is filed once and shows up in the right place on both.
 *
 *   oss        — a public repo. Listed first everywhere: it is the only
 *                category a reader can go and check for themselves.
 *   tool       — something a visitor can actually run, here or on stuffs.bid.
 *   benchmark  — a measurement writeup, where the number is the point.
 *   automation — client and integration work.
 */
const projectKind = z.enum(["oss", "tool", "benchmark", "automation"]);

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    image: z.string(),

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
