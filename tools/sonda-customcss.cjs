/*
 * Sonda 3: que declara `customCSS` en las capas, y si nuestro generador lo usa.
 *
 * RevSlider 6 guarda en `customCSS` cosas que NO estan en `idle`: el
 * `white-space`, el `letter-spacing`, la posicion... Si el generador solo lee
 * `idle`, se pierde todo eso y el texto ENVUELVE donde el original no envuelve,
 * que es justo lo que produce un solape con la capa de abajo.
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'sliders', 'banner-publicidad.json'), 'utf8'));

let totalCapas = 0, conCustomCss = 0, conNowrap = 0, idleConTipografia = 0;
const propiedadesCustom = {};
const ejemplos = [];

const visitar = (nodo) => {
  if (nodo === null || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) return nodo.forEach(visitar);
  // Una capa tiene `customCSS` y `type`
  if (typeof nodo.customCSS === 'string' && nodo.type) {
    totalCapas++;
    conCustomCss++;
    if (/white-space\s*:\s*nowrap/.test(nodo.customCSS)) {
      conNowrap++;
      if (ejemplos.length < 4) ejemplos.push({ uid: nodo.uid, texto: String(nodo.text || '').slice(0, 30),
        customCSS: nodo.customCSS.replace(/\n/g, ' ') });
    }
    for (const m of nodo.customCSS.matchAll(/([a-z-]+)\s*:/g)) {
      propiedadesCustom[m[1]] = (propiedadesCustom[m[1]] || 0) + 1;
    }
    if (nodo.idle && (nodo.idle.fontSize || nodo.idle.fontWeight)) idleConTipografia++;
  }
  for (const v of Object.values(nodo)) visitar(v);
};
visitar(j);

console.log('capas con customCSS :', totalCapas);
console.log('con white-space nowrap:', conNowrap);
console.log('con tipografia en idle:', idleConTipografia);
console.log('');
console.log('propiedades declaradas en customCSS (por frecuencia):');
for (const [k, v] of Object.entries(propiedadesCustom).sort((a, b) => b[1] - a[1]).slice(0, 14)) {
  console.log('  ' + k.padEnd(22) + v);
}
console.log('');
console.log('ejemplos con nowrap:');
for (const e of ejemplos) console.log('  uid ' + e.uid + ' "' + e.texto + '"\n    ' + e.customCSS.slice(0, 160));
