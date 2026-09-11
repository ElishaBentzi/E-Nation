import type { APIRoute } from 'astro';
import { SITE, INDEXABLE } from '../../site.config.mjs';

// El robots.txt se genera del mismo archivo de configuracion que el `site`, para
// que no puedan desincronizarse: si el sitemap anunciado y el origen canonico
// salieran de sitios distintos, Google recibiria senales contradictorias.
//
// Mientras INDEXABLE sea false (ensayo sobre el dominio de pruebas) se bloquea
// el rastreo. Al pasar al dominio real, la constante cambia y esto permite.
export const GET: APIRoute = () => {
  const cuerpo = INDEXABLE
    ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE}/sitemap-index.xml`, ''].join('\n')
    : [
        '# Dominio de ensayo: no debe indexarse.',
        '# Los docs reales viven en https://docs.e-nation.org',
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n');

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
