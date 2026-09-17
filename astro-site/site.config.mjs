/*
 * Configuracion de despliegue y enlaces externos del SITIO.
 *
 * EL DOMINIO Y EL DESTINO DE LOS DOCS VIVEN AQUI, en un solo sitio, para que
 * cambiarlos sea un punto y no una caceria por los componentes.
 *
 * ---------------------------------------------------------------------------
 * ESTADO ACTUAL DE LOS DOCS: desplegados en docs.unitygenerator.com
 * ---------------------------------------------------------------------------
 * La documentacion del Pacto Social ya esta migrada y sirviendose en
 * docs.unitygenerator.com (Astro Starlight en Cloudflare Pages), pero su dominio
 * definitivo sera docs.e-nation.org. Mientras `docs.e-nation.org` siga sirviendo
 * Read the Docs, el enlace del menu apunta al despliegue nuevo: si apuntara al
 * dominio viejo, el visitante acabaria en Read the Docs, que es justo lo que
 * estamos dejando de usar.
 *
 * LISTA DE CAMBIO cuando los docs pasen a su dominio definitivo:
 *   1. Aqui: DOCS_HOST = 'docs.e-nation.org'
 *   2. En astro-docs: site.config.mjs y functions/[[path]].js
 *   Nada mas. El enlace del menu se construye de esta constante.
 * ---------------------------------------------------------------------------
 */

/** Origen canonico del sitio. */
export const SITE = 'https://e-nation.org';

/**
 * Host de la documentacion, SIN protocolo.
 * Es lo unico que hay que cambiar el dia que los docs muden de dominio.
 */
export const DOCS_HOST = 'docs.unitygenerator.com';

/**
 * Ruta de la documentacion en un idioma.
 *
 * OJO, EL MAPA NO ES EL MISMO QUE EL DEL SITIO: en la documentacion el idioma
 * predeterminado es el ESPANOL (vive en la raiz, porque es el idioma de autoria
 * del Pacto), mientras que en el sitio el predeterminado es el INGLES. Por eso
 * aqui el espanol va a la raiz y el ingles a /en/: es lo contrario que en el menu
 * del sitio, y es correcto en cada caso.
 */
export function rutaDocs(locale) {
  return locale === 'es' ? '/' : `/${locale}/`;
}

/** URL completa de la documentacion en un idioma. */
export function urlDocs(locale) {
  return `https://${DOCS_HOST}${rutaDocs(locale)}`;
}
