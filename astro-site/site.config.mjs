/*
 * Configuracion de despliegue del SITIO.
 *
 * EL DOMINIO VIVE AQUI, en un solo sitio, para que pasar del dominio de prueba al
 * definitivo sea cambiar tres lineas y no una caceria por los componentes.
 *
 * ---------------------------------------------------------------------------
 * ESTADO ACTUAL: PRUEBA sobre web.unitygenerator.com
 * ---------------------------------------------------------------------------
 * Se despliega primero en un subdominio de unitygenerator.com, que el usuario
 * tiene en la misma cuenta de Cloudflare, para poder REVISAR EL RESULTADO sin
 * tocar el dominio real ni su correo.
 *
 * POR QUE UN SUBDOMINIO Y NO EL APEX: en unitygenerator.com el apex ya redirige a
 * la documentacion (docs.unitygenerator.com). Usarlo para el sitio rompería esa
 * redireccion. Un subdominio nuevo no toca nada de lo que ya funciona.
 *
 * ---------------------------------------------------------------------------
 * LISTA DE CAMBIO AL DOMINIO DEFINITIVO (los cuatro puntos van juntos)
 * ---------------------------------------------------------------------------
 *   1. En este archivo: SITE, PRIMARY_HOST e INDEXABLE (ponerla en true).
 *   2. En astro-site/functions/[[path]].js: PRIMARY. No puede importar este archivo
 *      porque Cloudflare empaqueta las Functions aparte.
 *   3. Nada mas: `site` en astro.config.mjs y el robots.txt salen de aqui.
 *
 * Y en Cloudflare: anadir e-nation.org como dominio propio del proyecto de Pages,
 * y ejecutar el runbook del CORREO de la Fase 9 de la skill. Este es el unico
 * cambio del proyecto que puede tumbar el email.
 * ---------------------------------------------------------------------------
 */

/** Origen canonico del sitio. */
export const SITE = 'https://web.unitygenerator.com';

/** Host que se sirve; cualquier otro host recibe un 301 a este. */
export const PRIMARY_HOST = 'web.unitygenerator.com';

/**
 * Mientras sea false, el robots.txt bloquea el rastreo: es un despliegue de
 * revision y no debe competir en buscadores con el WordPress que sigue vivo en
 * e-nation.org.
 */
export const INDEXABLE = false;

/**
 * Host de la documentacion, SIN protocolo.
 *
 * OJO, EL MAPA DE IDIOMAS NO ES EL MISMO QUE EL DEL SITIO: en la documentacion el
 * idioma predeterminado es el ESPANOL (vive en la raiz, porque es el idioma de
 * autoria del Pacto), mientras que en el sitio el predeterminado es el INGLES. Por
 * eso alli el espanol va a la raiz y aqui no. Es correcto en cada caso.
 */
export const DOCS_HOST = 'docs.unitygenerator.com';

/** Ruta de la documentacion en un idioma. */
export function rutaDocs(locale) {
  return locale === 'es' ? '/' : `/${locale}/`;
}

/** URL completa de la documentacion en un idioma. */
export function urlDocs(locale) {
  return `https://${DOCS_HOST}${rutaDocs(locale)}`;
}
