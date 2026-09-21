/*
 * PARIDAD DE CONTENIDO, pagina por pagina.
 *
 * POR QUE NO SIRVE COMPARAR TAMANOS DE FICHERO
 *   El HTML del original arrastra el CSS en linea de Elementor, The7 y sus plugins
 *   (~21 KB por pagina) mas el JavaScript del page builder. Que mi pagina pese el
 *   10 % no dice nada sobre su contenido: mide el andamiaje, no lo que se ve.
 *
 * LO QUE SI LO DICE
 *   El TEXTO visible, las IMAGENES y los ENCABEZADOS. Es lo que el usuario compara
 *   al mirar las dos versiones, y lo que hay que igualar.
 *
 * Uso:  node tools/compare-paginas.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');

/** ruta publica -> (captura del original, fichero de mi build) */
const PAGINAS = [
  ['/', 'home-en.html', 'astro-site/dist/index.html'],
  ['/es/', 'home-es.html', 'astro-site/dist/es/index.html'],
  ['/presentation/', 'presentation-en.html', 'astro-site/dist/presentation/index.html'],
  ['/es/presentacion/', 'presentacion-es.html', 'astro-site/dist/es/presentacion/index.html'],
  ['/news/', 'news-en.html', 'astro-site/dist/news/index.html'],
  ['/es/noticias/', 'noticias-es.html', 'astro-site/dist/es/noticias/index.html'],
  ['/articles/', 'articles-en.html', 'astro-site/dist/articles/index.html'],
  ['/es/articulos/', 'articulos-es.html', 'astro-site/dist/es/articulos/index.html'],
  ['/verify/', 'verify-en.html', 'astro-site/dist/verify/index.html'],
  ['/es/verificar/', 'verificar-es.html', 'astro-site/dist/es/verificar/index.html'],
  ['/privacy-policy/', 'privacy-policy-en.html', 'astro-site/dist/privacy-policy/index.html'],
  ['/es/politica-de-privacidad/', 'politica-de-privacidad-es.html', 'astro-site/dist/es/politica-de-privacidad/index.html'],
  ['/terms-and-conditions/', 'terms-and-conditions-en.html', 'astro-site/dist/terms-and-conditions/index.html'],
  ['/es/terminos-condiciones-del-servicio/', 'terminos-y-condiciones-es.html', 'astro-site/dist/es/terminos-condiciones-del-servicio/index.html'],
];

/** Quita script/style/comentarios y devuelve el texto visible normalizado. */
function textoVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const encabezados = (html) => [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
  .map((m) => ({ nivel: +m[1], texto: textoVisible(m[2]).slice(0, 70) }));

/** Nombres de archivo de las imagenes, sin rutas ni sufijos de cache. */
const imagenes = (html) => [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
  .map((m) => m[1].split('?')[0].split('/').pop())
  .filter((n) => n && !/^(data:|\.)/.test(n));

const leer = (rel) => {
  const f = path.join(RAIZ, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};

const filas = [];
for (const [ruta, captura, mio] of PAGINAS) {
  const hOrig = leer(path.join('reference', 'rendered', captura));
  const hMio = leer(mio);
  if (!hOrig || !hMio) { filas.push({ ruta, estado: !hOrig ? 'falta la captura' : 'falta mi pagina' }); continue; }

  const tO = textoVisible(hOrig), tM = textoVisible(hMio);
  const iO = imagenes(hOrig), iM = imagenes(hMio);
  const eO = encabezados(hOrig), eM = encabezados(hMio);
  const faltanImg = [...new Set(iO)].filter((n) => !iM.includes(n));
  const faltanEnc = eO.map((e) => `${'h'.repeat(1)}${e.nivel}:${e.texto}`)
    .filter((clave) => !eM.some((e) => `${'h'}${e.nivel}:${e.texto}` === clave));

  filas.push({
    ruta,
    textoOriginal: tO.length,
    textoMio: tM.length,
    coberturaTexto: tO.length ? Math.round((tM.length / tO.length) * 100) : 0,
    imagenesOriginal: new Set(iO).size,
    imagenesMias: new Set(iM).size,
    imagenesQueFaltan: faltanImg.length,
    encabezadosOriginal: eO.length,
    encabezadosMios: eM.length,
    encabezadosQueFaltan: faltanEnc.length,
    primerasQueFaltan: faltanEnc.slice(0, 6),
    muestraFaltante: faltanImg.slice(0, 8),
  });
}

console.log('ruta'.padEnd(34) + 'texto orig/mio'.padEnd(22) + 'cob'.padEnd(6) + 'img'.padEnd(10) + 'encab.'.padEnd(12) + 'faltan');
console.log('-'.repeat(110));
for (const f of filas) {
  if (f.estado) { console.log(f.ruta.padEnd(34) + f.estado); continue; }
  console.log(
    f.ruta.padEnd(34) +
    `${f.textoOriginal}/${f.textoMio}`.padEnd(22) +
    `${f.coberturaTexto}%`.padEnd(6) +
    `${f.imagenesOriginal}->${f.imagenesMias}`.padEnd(10) +
    `${f.encabezadosOriginal}->${f.encabezadosMios}`.padEnd(12) +
    `img:${f.imagenesQueFaltan} enc:${f.encabezadosQueFaltan}`
  );
}

console.log('');
console.log('=== detalle de lo que falta, por pagina ===');
for (const f of filas) {
  if (f.estado || (!f.encabezadosQueFaltan && !f.imagenesQueFaltan)) continue;
  console.log('');
  console.log('--- ' + f.ruta + ' ---');
  if (f.primerasQueFaltan.length) console.log('  encabezados que faltan: ' + f.primerasQueFaltan.join(' | '));
  if (f.muestraFaltante.length) console.log('  imagenes que faltan: ' + f.muestraFaltante.join(', '));
}
