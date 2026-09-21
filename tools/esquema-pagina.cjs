/*
 * ESQUEMA DE UNA PAGINA CAPTURADA DEL ORIGINAL.
 *
 * Imprime el plano de la pagina: la secuencia de bloques con su papel (titulo,
 * parrafo, imagen, boton, lista), su texto y sus imagenes. Es lo que permite
 * reconstruir sin leer 100 KB de HTML a mano.
 *
 * SIRVE PARA LAS DOS TECNOLOGIAS del original, que son distintas:
 *   - Elementor  ->  `elementor-section` (las homes y las presentaciones)
 *   - Gutenberg  ->  `wp-block-*` (noticias, articulos, verificar y las legales)
 *
 * NO se usa con las paginas legales: su texto no debe pasar por el chat (dispara
 * falsos positivos de filtros de seguridad). Esas van por script.
 *
 * Uso:  node tools/esquema-pagina.cjs news-en
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const NOMBRE = process.argv[2];
if (!NOMBRE) { console.error('Falta el nombre de la captura, por ejemplo: news-en'); process.exit(1); }

const html = fs.readFileSync(path.join(RAIZ, 'reference', 'rendered', NOMBRE + '.html'), 'utf8');

const limpio = (s) => String(s)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* La region de contenido: lo que hay dentro del `main`, hasta el pie. */
const inicioMain = (() => {
  const m = html.match(/<(main|div)[^>]*(role="main"|id="main")[^>]*>/i);
  return m ? m.index + m[0].length : -1;
})();
if (inicioMain < 0) { console.error('No se encontro la region principal en ' + NOMBRE); process.exit(1); }
let cuerpo = html.slice(inicioMain);
const finMain = cuerpo.search(/<footer|class="[^"]*footer/i);
if (finMain > 200) cuerpo = cuerpo.slice(0, finMain);

/* Cabecera y pie de The7 quedan fuera por construccion, pero el <header> interior
   del tema suele colarse: se corta en el primer `</main>` si lo hay. */
const cierre = cuerpo.search(/<\/main>/i);
if (cierre > 200) cuerpo = cuerpo.slice(0, cierre);

const bloques = [...cuerpo.matchAll(/<([a-z0-9]+)\b[^>]*class="([^"]*wp-block-[^"]*|elementor-section[^"]*|elementor-widget[^"]*)"[^>]*>/gi)]
  .map((m) => ({ etiqueta: m[1], clases: m[2], inicio: m.index }));

console.log(`=== ${NOMBRE} ===`);
console.log(`cuerpo principal: ${cuerpo.length} caracteres de HTML, ${bloques.length} bloques`);
console.log('');

/* Cada bloque se lleva su contenido hasta el siguiente: asi se ve QUE hay dentro. */
const resumen = [];
for (let k = 0; k < bloques.length; k++) {
  const b = bloques[k];
  const trozo = cuerpo.slice(b.inicio, bloques[k + 1] ? bloques[k + 1].inicio : cuerpo.length);
  const papel = (b.clases.match(/wp-block-[a-z0-9-]+|elementor-widget-[a-z0-9_-]+/i) || ['?'])[0];
  const titulo = b.clases.match(/wp-block-(heading|image|paragraph|list|buttons|button|gallery|columns|group|cover|embed|media-text|separator|spacer|quote|table|html|shortcode)/);
  const enc = [...trozo.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => `h${m[1]}: ${limpio(m[2]).slice(0, 90)}`);
  const imgs = [...new Set([...trozo.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1].split('?')[0].split('/').pop()))].slice(0, 8);
  const txt = limpio(trozo);
  const enlaces = [...new Set([...trozo.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]))]
    .filter((u) => !/^#|^mailto:|^tel:/.test(u)).slice(0, 6);
  resumen.push({ papel, enc, imgs, txt, enlaces });
  if (titulo) resumen[resumen.length - 1].papel = papel;
}

resumen.forEach((r, k) => {
  const corto = r.txt.length > 700 ? r.txt.slice(0, 700) + ' …' : r.txt;
  console.log(`[${String(k + 1).padStart(2)}] ${r.papel}   (${r.txt.length} car.)`);
  r.enc.forEach((e) => console.log('      ' + e));
  if (r.imgs.length) console.log('      imagenes: ' + r.imgs.join(', '));
  if (r.enlaces.length) console.log('      enlaces: ' + r.enlaces.join(' '));
  if (corto) console.log('      > ' + corto);
  console.log('');
});
