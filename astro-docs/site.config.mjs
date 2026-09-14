/*
 * Configuracion de despliegue de los docs.
 *
 * EL DOMINIO VIVE AQUI, en un solo sitio, para que pasar del dominio de ensayo
 * al real sea cambiar tres lineas y no buscar cadenas por el proyecto.
 *
 * ---------------------------------------------------------------------------
 * ESTADO ACTUAL: ENSAYO sobre docs.unitygenerator.com
 * ---------------------------------------------------------------------------
 * El principal del ensayo es el SUBDOMINIO docs.unitygenerator.com, con la
 * misma forma docs.* que tendra el destino final, y el apex unitygenerator.com
 * redirige 301 hacia el (ejerce la rama de redireccion por host de la
 * Function). Asi se ensaya el patron exacto del dominio real: el subdominio
 * docs.* sirve y los demas hosts redirigen.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * LISTA DE CAMBIO AL DOMINIO REAL (hacer los tres juntos)
 * ---------------------------------------------------------------------------
 *   1. En este archivo: SITE, PRIMARY_HOST e INDEXABLE (ponerla en true).
 *   2. En astro-docs/functions/[[path]].js: PRIMARY. No puede importar este
 *      archivo porque Cloudflare empaqueta las Functions aparte.
 *   3. Nada mas. `site` en astro.config.mjs y el robots.txt se generan de aqui.
 *
 * Y en Cloudflare: anadir docs.e-nation.org como dominio propio del proyecto de
 * Pages, y luego quitarlo de Read the Docs. Los hostnames del ensayo pasan a
 * redirigir al dominio real solos, con el paso 2.
 * ---------------------------------------------------------------------------
 */

/** Origen canonico. Alimenta canonical, hreflang, sitemap y og:url. */
export const SITE = 'https://docs.unitygenerator.com';

/** Host que se sirve; cualquier otro host recibe un 301 a este. */
export const PRIMARY_HOST = 'docs.unitygenerator.com';

/**
 * Mientras sea false, el robots.txt bloquea el rastreo. Es un dominio de
 * ensayo: no debe competir en buscadores con los docs reales que hoy sirve
 * Read the Docs en docs.e-nation.org. Al pasar al dominio real se pone en true
 * y el robots.txt pasa a permitir y a anunciar el sitemap.
 */
export const INDEXABLE = false;
