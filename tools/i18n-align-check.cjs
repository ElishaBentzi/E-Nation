/*
 * ¿Alinean las unidades de texto entre el espanol y el ingles?
 *
 * De esto depende el diseno de la memoria de traduccion. Si el numero de
 * parrafos por seccion coincide, emparejar ES<->EN es trivial y el ingles puede
 * vivir en la memoria como traduccion. Si no coincide, el ingles es un documento
 * con estructura propia y hay que mantenerlo como fuente aparte.
 *
 * Uso: node tools/i18n-align-check.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'astro-docs', 'src', 'content', 'docs');

// Unidad = parrafo, encabezado con texto, o item de lista. Se ignoran las
// lineas vacias y el marcado. Los encabezados que son solo numeracion ("2.1.",
// "6.5.1.2.1.") no cuentan: son identicos en todos los idiomas y no se traducen.
const soloNumeracion = (t) => /^[0-9]+(\.[0-9]+)*\.?$/.test(t.trim());

function segment(text) {
  const secciones = [];
  let path = [];
  let actual = { path: '(inicio)', units: [] };
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^(#{2,6})\s+(.*)$/);
    if (m) {
      const nivel = m[1].length;
      const texto = m[2].trim();
      path = path.slice(0, nivel - 2).concat(texto);
      actual = { path: path.join(' > '), units: [] };
      secciones.push(actual);
      if (!soloNumeracion(texto)) actual.units.push({ kind: 'h', text: texto });
      continue;
    }
    if (l.startsWith('---')) continue;
    const kind = /^[-*+]\s/.test(l) ? 'li' : /^\d+\.\s/.test(l) ? 'li' : 'p';
    actual.units.push({ kind, text: l });
  }
  return secciones.filter((s) => s.path !== '(inicio)' || s.units.length);
}

const es = segment(fs.readFileSync(path.join(BASE, 'pacto-social.md'), 'utf8'));
const en = segment(fs.readFileSync(path.join(BASE, 'en', 'pacto-social.md'), 'utf8'));

const mapEn = new Map(en.map((s) => [s.path, s]));
let iguales = 0, distintos = 0;
const discrepancias = [];

for (const s of es) {
  // El titulo de la seccion cambia de idioma, asi que la clave de emparejamiento
  // es la POSICION de la seccion dentro del documento, no su texto.
  const i = es.indexOf(s);
  const t = en[i];
  if (!t) { discrepancias.push({ seccion: s.path, es: s.units.length, en: '(sin seccion equivalente)' }); distintos++; continue; }
  if (s.units.length === t.units.length) { iguales++; }
  else { distintos++; discrepancias.push({ seccion: `${i + 1}. ${s.path}`, es: s.units.length, en: t.units.length }); }
}

console.log(`secciones ES: ${es.length} | EN: ${en.length}`);
console.log(`unidades totales ES: ${es.reduce((a, s) => a + s.units.length, 0)} | EN: ${en.reduce((a, s) => a + s.units.length, 0)}`);
console.log(`secciones con el MISMO numero de unidades: ${iguales}`);
console.log(`secciones con numero DISTINTO: ${distintos}`);
console.log('');
if (discrepancias.length) {
  console.log('secciones desalineadas:');
  console.log('  #   unidades ES/EN   seccion');
  for (const d of discrepancias) {
    const dir = typeof d.en === 'number' ? (d.en > d.es ? 'EN tiene mas' : 'EN tiene menos') : d.en;
    console.log(`  ${String(d.seccion).slice(0, 60).padEnd(62)} ES=${String(d.es).padEnd(4)} EN=${String(d.en).padEnd(4)} ${typeof d.en === 'number' ? dir : ''}`);
  }
} else {
  console.log('Todas las secciones alinean: el emparejamiento ES<->EN es directo por posicion.');
}
