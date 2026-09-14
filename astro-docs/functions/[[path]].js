/*
 * Redirige a un 301 cualquier host distinto del principal.
 *
 * Por que hace falta: el `_redirects` de Cloudflare Pages solo acepta RUTAS, no
 * hosts. Para mandar www, el apex, el dominio de ensayo o el dominio antiguo al
 * canonico hay que hacerlo con una Pages Function, que si ve el hostname.
 * Se despliega con el repo, no necesita configuracion aparte.
 *
 * AL PASAR AL DOMINIO REAL: cambiar PRIMARY aqui Y en site.config.mjs. No se
 * importa desde alli porque Cloudflare empaqueta las Functions por separado y no
 * resuelve rutas fuera de esta carpeta.
 */

// Ensayo: el principal es el subdominio docs.*, el apex redirige a el. Al
// cambiar al dominio real sera 'docs.e-nation.org'.
const PRIMARY = 'docs.unitygenerator.com';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Se deja pasar la URL de *.pages.dev a proposito: si esta Function
  // redirigiera tambien esa, el dominio de ensayo tendria que existir ya para
  // poder verificar el build, y no se podria comprobar nada antes de tocar el
  // DNS. Ademas sirve para que las previsualizaciones de otras ramas sean
  // navegables.
  const esPreview = url.hostname.endsWith('.pages.dev');

  if (url.hostname !== PRIMARY && !esPreview) {
    const target = new URL(request.url);
    target.hostname = PRIMARY;
    return Response.redirect(target.toString(), 301);
  }

  return next();
}
