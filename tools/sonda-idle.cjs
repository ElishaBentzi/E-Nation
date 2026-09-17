/*
 * Sonda 2: el `idle` crudo de una capa, tal como lo extrajo el volcado.
 * Sirve para saber si el `font-weight: 900` que llega a nuestra config sale de la
 * capa o del preset — el original renderiza 400 para ese mismo texto.
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const TEXTO = process.argv[2] || 'A Social and Economic Model to bring';
const fichero = path.join(RAIZ, 'reference', 'sliders', 'banner-publicidad.json');
const j = JSON.parse(fs.readFileSync(fichero, 'utf8'));

const slides = j.slides || [];
console.log('diapositivas:', slides.length);

// Se busca cualquier objeto que TENGA `idle` y mencione el texto: es la capa.
const encontradas = [];
const visitar = (nodo, ruta, diapo) => {
  if (nodo === null || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) return nodo.forEach((x, i) => visitar(x, ruta + '[' + i + ']', diapo));
  if (nodo.idle && JSON.stringify(nodo).includes(TEXTO)) encontradas.push({ ruta, nodo, diapo });
  for (const [k, v] of Object.entries(nodo)) visitar(v, ruta + '.' + k, diapo);
};

for (const sl of slides) visitar(sl.params, 'params', sl.id);

console.log('capas encontradas:', encontradas.length);
for (const e of encontradas) {
  const n = e.nodo;
  console.log('');
  console.log('--- diapositiva', e.diapo, '| ruta', e.ruta, '---');
  console.log('  claves:', Object.keys(n).join(', '));
  console.log('  texto :', JSON.stringify(String(n.text || n.content || '').slice(0, 60)));
  console.log('  idle  :', JSON.stringify(n.idle));
  console.log('  data  :', JSON.stringify(n.data || {}).slice(0, 300));
}
