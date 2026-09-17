import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { LOCALES, DEFAULT_LOCALE } from './src/i18n/config.ts';

// El sitio e-nation.org: Astro estatico + Tailwind v4, desplegado en Cloudflare
// Pages.
//
// NO se usa el adapter `@astrojs/cloudflare`: Pages sirve estaticos, y el adapter
// es para Workers. Anadirlo aqui no aporta nada y complica el build.
//
// i18n: el INGLES es el idioma predeterminado y vive en la RAIZ (/, /presentation/,
// /articles/...), igual que el WordPress original. El espanol va bajo /es/ y el
// frances bajo /fr/. `prefixDefaultLocale: false` es lo que hace que el
// predeterminado NO lleve prefijo.
//
// OJO, no confundir con la documentacion (astro-docs): alli el predeterminado es
// el ESPANOL, porque el espanol es el idioma de autoria del Pacto. Son dos
// decisiones distintas y cada una responde a su contenido.

export default defineConfig({
  site: 'https://e-nation.org',
  output: 'static',
  integrations: [sitemap()],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: {
      // El idioma predeterminado se sirve SIN prefijo: /presentation/, no
      // /en/presentation/. Es como estaba el original y lo que Google ya indexa.
      prefixDefaultLocale: false,
    },
  },
  vite: {
    // `brand/` esta fuera de la raiz de esta app; sin esto `astro dev` no lo lee.
    plugins: [tailwindcss()],
    server: { fs: { allow: ['..'] } },
  },
  compressHTML: true,
  build: {
    // El CSS de Elementor del original es enorme; con `auto` Astro decide si
    // incrustarlo o enlazarlo segun el tamano, que es lo sensato aqui.
    inlineStylesheets: 'auto',
  },
});
