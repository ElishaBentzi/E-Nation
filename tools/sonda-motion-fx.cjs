/*
 * SONDA DE EFECTOS DE MOVIMIENTO DE ELEMENTOR.
 *
 * POR QUE
 *   El parallax de la home NO es solo `background-attachment: fixed`: medido en el
 *   original, hay unos diez elementos que se quedan ~200 px atras respecto al scroll,
 *   y eso lo produce un `transform` que Elementor actualiza con JavaScript. Si no se
 *   lee su configuracion, esos elementos se quedan quietos y la pagina se ve plana.
 *
 * QUE BUSCA
 *   Las claves `motion_fx_*` en los ajustes de secciones, columnas y widgets, con sus
 *   valores. Son las que dicen que elemento se mueve, cuanto y en que direccion.
 *
 * Uso:  node tools/sonda-motion-fx.cjs home-landing-page-en
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const NOMBRE = process.argv[2];
if (!NOMBRE) { console.error('Falta el nombre, por ejemplo: home-landing-page-en'); process.exit(1); }

const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'elementor', NOMBRE + '.json'), 'utf8'));

const conMovimiento = [];
const clavesVistas = new Map();
let totalElementos = 0;

const recorrer = (nodos, ruta) => {
  for (const n of nodos || []) {
    totalElementos++;
    const s = n.settings || {};
    const claves = Object.keys(s).filter((k) => k.startsWith('motion_fx'));
    if (claves.length) {
      const datos = {};
      for (const k of claves) {
        datos[k] = typeof s[k] === 'object' ? JSON.stringify(s[k]).slice(0, 60) : s[k];
        clavesVistas.set(k, (clavesVistas.get(k) || 0) + 1);
      }
      conMovimiento.push({ tipo: n.elType, widget: n.widgetType || null, id: n.id, ruta, datos });
    }
    if (n.elements) recorrer(n.elements, ruta + 1);
  }
};
recorrer(Array.isArray(j) ? j : (j.content || j.elements || j.sections || []), 0);

console.log(`=== ${NOMBRE}: ${totalElementos} elementos, ${conMovimiento.length} con efectos de movimiento ===`);
console.log('');
console.log('claves encontradas (y cuantas veces):');
for (const [k, v] of [...clavesVistas].sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(42) + v);
console.log('');
console.log('elementos que se mueven, con sus valores:');
for (const m of conMovimiento.slice(0, 14)) {
  console.log('');
  console.log(`  ${m.tipo}${m.widget ? '/' + m.widget : ''}  profundidad ${m.ruta}  id ${m.id}`);
  for (const [k, v] of Object.entries(m.datos)) {
    if (/^(motion_fx_motion_fx_scrolling|motion_fx_translateY_effect|motion_fx_translateY_speed|motion_fx_translateY_direction|motion_fx_scale_effect|motion_fx_opacity_effect|motion_fx_device)/.test(k)) {
      console.log('    ' + k.replace('motion_fx_', '').padEnd(34) + v);
    }
  }
}
const porTipo = {};
for (const m of conMovimiento) porTipo[m.tipo + (m.widget ? '/' + m.widget : '')] = (porTipo[m.tipo + (m.widget ? '/' + m.widget : '')] || 0) + 1;
console.log('');
console.log('por tipo: ' + JSON.stringify(porTipo));
