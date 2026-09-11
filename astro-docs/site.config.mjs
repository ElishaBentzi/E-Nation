/*
 * Configuracion de despliegue de los docs.
 *
 * EL DOMINIO VIVE AQUI, en un solo sitio, para que pasar del dominio de ensayo
 * al real sea cambiar tres lineas y no buscar cadenas por el proyecto.
 *
 * ---------------------------------------------------------------------------
 * ESTADO ACTUAL: ENSAYO sobre unitygenerator.com (el APEX)
 * ---------------------------------------------------------------------------
 * Los docs se despliegan primero en unitygenerator.com, que el usuario tiene en
 * la misma cuenta de Cloudflare, para probar de punta a punta build -> Pages ->
 * dominio propio -> certificado -> 301 SIN tocar el dominio real ni su correo.
 * Cuando el ensayo este verificado, se cambia a docs.e-nation.org.
 *
 * Se usa el apex y no un subdominio porque es el dominio que el usuario adjunto
 * al proyecto de Pages. El mecanismo del cambio final es identico. Si se
 * prefiere que el ensayo viva en docs.unitygenerator.com (misma forma que el
 * destino final), basta cambiar estas tres constantes y anadir ese subdominio
 * como dominio propio en Pages.
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
 * Pages, y luego quitarlo de Read the Docs. El 301 desde el dominio de ensayo
 * al real sale solo del paso 2.
 * ---------------------------------------------------------------------------
 */

/** Origen canonico. Alimenta canonical, hreflang, sitemap y og:url. */
export const SITE = 'https://unitygenerator.com';

/** Host que se sirve; cualquier otro host recibe un 301 a este. */
export const PRIMARY_HOST = 'unitygenerator.com';

/**
 * Mientras sea false, el robots.txt bloquea el rastreo. Es un dominio de
 * ensayo: no debe competir en buscadores con los docs reales que hoy sirve
 * Read the Docs en docs.e-nation.org. Al pasar al dominio real se pone en true
 * y el robots.txt pasa a permitir y a anunciar el sitemap.
 */
export const INDEXABLE = false;
