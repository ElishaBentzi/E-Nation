/*
 * PARIDAD DE CONTENIDO CONTRA PRODUCCION.
 *
 * POR QUE NO VALE MEDIR CON `sed`/`grep`
 *   El HTML desplegado viene MINIFICADO en una sola linea, asi que un `sed` que
 *   "quite los script" no los quita (no hay saltos de linea que delimiten), y las
 *   entidades (`&nbsp;`) y los comentarios se cuentan como texto. El recuento sale
 *   inflado y hace parecer que la pagina tiene de mas cuando no.
 *
 * Aqui se usa EXACTAMENTE el mismo normalizador que `compare-paginas.cjs`, asi que
 * los dos numeros son comparables.
 *
 * Uso:  node tools/paridad-produccion.cjs [https://web.unitygenerator.com]
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const BASE = (process.argv[2] || 'https://web.unitygenerator.com').replace(/\/$/, '');

const PAGINAS = [
  ['/', 'home-en.html'],
  ['/es/', 'home-es.html'],
  ['/presentation/', 'presentation-en.html'],
  ['/es/presentacion/', 'presentacion-es.html'],
  ['/news/', 'news-en.html'],
  ['/es/noticias/', 'noticias-es.html'],
  ['/articles/', 'articles-en.html'],
  ['/verify/', 'verify-en.html'],
];

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

const encabezados = (html) => [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].length;

(async () => {
  console.log(`paridad contra ${BASE}`);
  console.log('ruta'.padEnd(24) + 'texto orig/prod'.padEnd(20) + 'cob'.padEnd(7) + 'encabezados');
  console.log('-'.repeat(70));
  for (const [ruta, captura] of PAGINAS) {
    const f = path.join(RAIZ, 'reference', 'rendered', captura);
    if (!fs.existsSync(f)) { console.log(ruta.padEnd(24) + 'sin captura del original'); continue; }
    let prod = '';
    try {
      const r = await fetch(BASE + ruta);
      prod = await r.text();
    } catch (e) { console.log(ruta.padEnd(24) + 'ERROR al pedir: ' + e.message); continue; }
    const tO = textoVisible(fs.readFileSync(f, 'utf8')).length;
    const tP = textoVisible(prod).length;
    console.log(
      ruta.padEnd(24) +
      `${tO}/${tP}`.padEnd(20) +
      `${Math.round((tP / tO) * 100)}%`.padEnd(7) +
      `${encabezados(fs.readFileSync(f, 'utf8'))} -> ${encabezados(prod)}`
    );
  }
})();
