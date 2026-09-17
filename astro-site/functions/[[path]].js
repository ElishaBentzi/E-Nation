/*
 * Redirige a un 301 cualquier host distinto del principal.
 *
 * Por que hace falta: el `_redirects` de Cloudflare Pages solo acepta RUTAS, no
 * hosts. Para mandar www, el apex o el dominio antiguo al canonico hay que hacerlo
 * con una Pages Function, que si ve el hostname.
 *
 * AL PASAR AL DOMINIO DEFINITIVO: cambiar PRIMARY aqui Y en site.config.mjs. No se
 * importa desde alli porque Cloudflare empaqueta las Functions por separado y no
 * resuelve rutas fuera de esta carpeta.
 */

// Despliegue de revision. Al pasar al definitivo sera 'e-nation.org'.
const PRIMARY = 'web.unitygenerator.com';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Se deja pasar *.pages.dev a proposito: si esta Function redirigiera tambien
  // esas, el dominio de revision tendria que existir ya para poder verificar el
  // build, y no se podria comprobar nada antes de tocar el DNS. Ademas asi las
  // previsualizaciones de otras ramas son navegables.
  const esPreview = url.hostname.endsWith('.pages.dev');

  if (url.hostname !== PRIMARY && !esPreview) {
    const target = new URL(request.url);
    target.hostname = PRIMARY;
    return Response.redirect(target.toString(), 301);
  }

  return next();
}
