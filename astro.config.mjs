// @ts-check
import { defineConfig } from 'astro/config';

// Адрес боевого сайта. Нужен для карты сайта и абсолютных ссылок.
export default defineConfig({
  site: 'https://r9oof.com',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
