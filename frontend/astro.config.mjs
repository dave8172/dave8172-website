import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // The site stays statically prerendered. The adapter exists for one route —
  // /api/jev — which sets `prerender = false` because it holds the TypeSafe
  // key and must run on the server. Everything else builds exactly as before.
  adapter: vercel(),
  site: "https://dave8172-website.vercel.app",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/pvt/")
    }),
    svelte()
  ],
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
    },
  }
});
