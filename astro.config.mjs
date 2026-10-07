import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  // Keep in sync with site.url in shared/config.ts.
  site: 'https://example.com',
  output: 'static',
  integrations: [preact()],
  build: { format: 'directory' },
  image: { responsiveStyles: false },
});
