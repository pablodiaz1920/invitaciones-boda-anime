// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://pablodiaz1920.github.io',
  base: '/invitaciones-boda-anime/',
  vite: {
    plugins: [tailwindcss()]
  }
});