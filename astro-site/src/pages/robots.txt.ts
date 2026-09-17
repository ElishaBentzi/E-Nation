import type { APIRoute } from 'astro';
import { SITE, INDEXABLE } from '../../site.config.mjs';

// El robots.txt se genera del MISMO archivo de configuracion que el `site`, para
// que no puedan desincronizarse: si el sitemap anunciado y el origen canonico
// salieran de sitios distintos, los buscadores recibirian senales contradictorias.
//
// Mientras INDEXABLE sea false (despliegue de revision) se bloquea el rastreo: el
// WordPress de e-nation.org sigue vivo y es el que debe posicionar. Al hacer el
// cutover, la constante cambia y esto pasa a permitir.
export const GET: APIRoute = () => {
  const cuerpo = INDEXABLE
    ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE}/sitemap-index.xml`, ''].join('\n')
    : [
        '# Despliegue de revision: no debe indexarse.',
        '# El sitio real sigue en https://e-nation.org',
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n');

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
