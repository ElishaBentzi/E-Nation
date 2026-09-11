import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { SITE } from './site.config.mjs';

// Docs del Pacto Social.
//
// AHORA EN ENSAYO sobre docs.unitygenerator.com. El dominio real sera
// docs.e-nation.org; los tres sitios donde se cambia y el orden estan en
// site.config.mjs.
//
// El espanol es el idioma por defecto y vive en la RAIZ; el ingles y el frances
// van bajo prefijo. Es el mismo criterio del sitio, adaptado a que aqui el
// espanol es el idioma de autoria.
//
// La clave `root` NO es cosmetica: Starlight calcula
//   prefixDefaultLocale = isMultilingual && locales.root === undefined || ...
// asi que sin una entrada llamada `root` prefija TAMBIEN el idioma por defecto
// y genera enlaces alternos a /es/... que no existen (verificado en el HTML
// construido). Con `root`, el idioma por defecto se sirve sin prefijo.
//
// EL SLUG ES EL MISMO EN TODOS LOS IDIOMAS. Starlight construye los hreflang y
// el sitemap reutilizando el slug de la pagina en cada idioma, y Astro no
// soporta slugs traducidos por configuracion. Aqui no hay nada que perder: las
// URLs indexadas de los docs eran las .html de RTD bajo /<idioma>/latest/, y
// esas se redirigen con 301. (En el SITIO es distinto: alli los slugs
// traducidos SI estan indexados y se conservan con un manifiesto propio.)
//
// No se declara `sidebar`: Starlight lo genera del contenido y usa como
// etiqueta el titulo de cada pagina, que ya esta en su idioma. Asi no hay que
// traducir etiquetas a mano ni inventarlas.
//
// El frances se anadira cuando la memoria de traduccion genere su contenido;
// declararlo antes de tenerlo daria un selector con enlaces rotos.

export default defineConfig({
  // El origen canonico sale de site.config.mjs, que es tambien el unico sitio
  // donde se cambia el dominio al pasar del ensayo al dominio real.
  site: SITE,
  output: 'static',
  integrations: [
    starlight({
      title: 'E-Nation',
      description: 'Documentacion del Pacto Social de E-Nation',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Espanol', lang: 'es' },
        en: { label: 'English', lang: 'en' },
      },
      // Tokens de marca compartidos con el sitio. Viven en brand/ para que las
      // dos apps consuman los mismos valores medidos y ninguna derive.
      // Las rutas de customCss se resuelven desde la RAIZ de esta app
      // (astro-docs/), no desde el archivo de config.
      customCss: ['../brand/tokens.css', './src/styles/docs.css'],
      pagination: true,
      lastUpdated: false,
    }),
    sitemap(),
  ],
  vite: {
    // brand/ esta fuera de la raiz de esta app; sin esto `astro dev` no lo lee.
    server: { fs: { allow: ['..'] } },
  },
});
