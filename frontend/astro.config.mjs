import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://dave8172-website.vercel.app",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/pvt/")
    })
  ],
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
    },
  }
});
