/*
 * Vuelca las CLAVES y valores cortos de los ajustes de cada tipo de widget, para
 * saber donde vive el texto y las imagenes de los widgets de JetElements.
 * Los nombres de las claves no se pueden adivinar: hay que verlos.
 *
 * Uso:  node tools/volcar-ajustes.cjs home-landing-page-en jet-banner 1
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const [NOMBRE, TIPO, CUANTOS] = [process.argv[2], process.argv[3], Number(process.argv[4] || 1)];
if (!NOMBRE || !TIPO) { console.error('Uso: node tools/volcar-ajustes.cjs <fichero> <tipo-de-widget> [cuantos]'); process.exit(1); }

const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'elementor', NOMBRE + '.json'), 'utf8'));

const encontrados = [];
const recorrer = (nodos) => {
  for (const n of nodos || []) {
    if (n.widgetType === TIPO) encontrados.push(n);
    if (n.elements) recorrer(n.elements);
  }
};
recorrer(Array.isArray(j) ? j : (j.content || j.elements || j.sections || []));

console.log(`${TIPO}: ${encontrados.length} instancias en ${NOMBRE}`);
const resumen = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object') {
    if (Array.isArray(v)) return v.length ? `[${v.length}] ${JSON.stringify(v[0]).slice(0, 60)}` : '[]';
    const s = JSON.stringify(v);
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  }
  const s = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > 90 ? s.slice(0, 90) + '…' : s;
};

encontrados.slice(0, CUANTOS).forEach((w, k) => {
  console.log('');
  console.log(`--- instancia ${k + 1} ---`);
  for (const [clave, valor] of Object.entries(w.settings || {})) {
    const r = resumen(valor);
    if (r === null) continue;
    console.log(`  ${clave.padEnd(34)} ${r}`);
  }
});
