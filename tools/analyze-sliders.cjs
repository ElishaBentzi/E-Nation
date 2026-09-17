/*
 * Analiza la configuracion de los sliders de Slider Revolution extraida del
 * WordPress, para saber QUE hay que reconstruir y DONDE viven sus assets.
 *
 * POR QUE UN ANALISIS PROPIO
 *   RevSlider guarda su configuracion anidada y con JSON dentro de cadenas, y las
 *   capas en un objeto indexado por uid. Leerlo a ojo no sirve, y las capas son
 *   justo lo que hay que replicar: posiciones, textos, imagenes y enlaces.
 *
 * HALLAZGO QUE MOTIVA ESTE SCRIPT
 *   Las imagenes de los sliders NO estan en e-nation.org: apuntan a otro dominio.
 *   Eso convierte a los sliders en banners entre proyectos, que es exactamente lo
 *   que el usuario describe. Hay que saber cuantos assets son y de donde, porque
 *   decide si se espejan o se enlazan.
 *
 * Uso: node tools/analyze-sliders.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SLIDERS = path.join(ROOT, 'reference', 'sliders');

/** Recorre cualquier estructura y recolecta URLs de cadenas. */
function urlsDe(o, salida = new Set()) {
  if (typeof o === 'string') {
    // Las URLs vienen con las barras escapadas dentro del JSON anidado.
    const limpio = o.replace(/\\\//g, '/');
    for (const m of limpio.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) salida.add(m[0]);
    return salida;
  }
  if (Array.isArray(o)) { o.forEach((x) => urlsDe(x, salida)); return salida; }
  if (o && typeof o === 'object') { Object.values(o).forEach((x) => urlsDe(x, salida)); return salida; }
  return salida;
}

/** Recorre y recolecta los textos de las capas. */
function textosDe(o, ruta = '', salida = []) {
  if (!o || typeof o !== 'object') return salida;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && /^text$|^title$|^alias$|^content$/i.test(k) && v.trim() && !/^https?:/.test(v)) {
      salida.push({ campo: `${ruta}${k}`, valor: v.trim() });
    } else if (typeof v === 'object') {
      textosDe(v, `${ruta}${k}.`, salida);
    }
  }
  return salida;
}

const ficheros = fs.existsSync(SLIDERS) ? fs.readdirSync(SLIDERS).filter((f) => f.endsWith('.json')) : [];
if (!ficheros.length) {
  console.error('no hay sliders extraidos en reference/sliders/');
  process.exit(2);
}

const todosLosDominios = new Map();
const todosLosAssets = new Map();

const lineas = [];
const p = (s = '') => lineas.push(s);

p('# Análisis de los sliders de Slider Revolution');
p();
p(`Generado con \`tools/analyze-sliders.cjs\` sobre ${ficheros.length} sliders.`);
p();

for (const f of ficheros.sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(SLIDERS, f), 'utf8'));
  const urls = urlsDe(s.slides || []);
  const urlsConfig = urlsDe(s.params || {});
  const todas = new Set([...urls, ...urlsConfig]);

  // Clasifica por dominio y extension
  const dominios = new Map();
  for (const u of todas) {
    let host = '?';
    try { host = new URL(u).hostname; } catch (e) { /* relativa */ }
    dominios.set(host, (dominios.get(host) || 0) + 1);
    if (/\.(jpe?g|png|gif|webp|svg|avif)/i.test(u)) {
      if (!todosLosAssets.has(u)) todosLosAssets.set(u, new Set());
      todosLosAssets.get(u).add(s.alias);
    }
  }
  for (const [d, n] of dominios) todosLosDominios.set(d, (todosLosDominios.get(d) || 0) + n);

  const kb = Math.round(fs.statSync(path.join(SLIDERS, f)).size / 1024);
  p(`## \`${s.alias}\` — ${s.total_slides} slide(s), ${kb} KB`);
  p();
  const lay = s.params && s.params.layout ? s.params.layout : null;
  const sz = s.params && s.params.size ? s.params.size : null;
  p(`- id: ${s.id}`);
  p(`- tipo de slider: ${s.params && s.params.type ? JSON.stringify(s.params.type).slice(0, 120) : '—'}`);
  if (sz) p(`- tamaño (size): ${JSON.stringify(sz).slice(0, 200)}`);
  if (lay) p(`- layout: ${JSON.stringify(lay).slice(0, 200)}`);
  p(`- URLs distintas en el slider: ${todas.size}`);
  p(`- dominios: ${[...dominios].map(([d, n]) => `\`${d}\` (${n})`).join(', ') || '—'}`);
  p();

  // Las capas: se cuentan y se listan los campos que las definen
  const clavesCapa = new Set();
  let nCapas = 0;
  const ejemplosTexto = [];
  for (const sl of s.slides || []) {
    const capas = sl.capas;
    if (!capas) continue;
    const lista = Array.isArray(capas) ? capas : Object.values(capas);
    for (const c of lista) {
      if (!c || typeof c !== 'object') continue;
      nCapas++;
      Object.keys(c).forEach((k) => clavesCapa.add(k));
      const t = textosDe(c);
      for (const x of t) if (ejemplosTexto.length < 6 && x.valor.length < 40) ejemplosTexto.push(x);
    }
  }
  p(`- **capas: ${nCapas}**`);
  if (clavesCapa.size) {
    p(`- campos que definen una capa: ${[...clavesCapa].sort().join(', ')}`);
  }
  if (ejemplosTexto.length) {
    p('- ejemplos de texto en capas:');
    for (const e of ejemplosTexto) p(`  - \`${e.campo}\`: ${JSON.stringify(e.valor)}`);
  }
  p();
}

p('## Resumen de assets por dominio');
p();
p('| dominio | referencias |');
p('|---|---|');
for (const [d, n] of [...todosLosDominios].sort((a, b) => b[1] - a[1])) p(`| \`${d}\` | ${n} |`);
p();
p(`**Assets de imagen distintos: ${todosLosAssets.size}**`);
p();
p('| dominio | assets |');
p('|---|---|');
const porDominio = new Map();
for (const u of todosLosAssets.keys()) {
  let host = '?';
  try { host = new URL(u).hostname; } catch (e) { /* relativa */ }
  porDominio.set(host, (porDominio.get(host) || 0) + 1);
}
for (const [d, n] of [...porDominio].sort((a, b) => b[1] - a[1])) p(`| \`${d}\` | ${n} |`);
p();
p('### Listado de assets');
p();
for (const [u, sliders] of [...todosLosAssets].sort()) {
  p(`- \`${decodeURIComponent(u).split('/').slice(-2).join('/')}\` — usado por: ${[...sliders].join(', ')}`);
}
p();

const salida = path.join(ROOT, 'reference', 'ANALISIS-SLIDERS.md');
fs.writeFileSync(salida, lineas.join('\n') + '\n', 'utf8');

console.log(`Escrito ${path.relative(ROOT, salida)}\n`);
console.log('=== assets de imagen por dominio ===');
for (const [d, n] of [...porDominio].sort((a, b) => b[1] - a[1])) console.log(`  ${String(d).padEnd(28)} ${n} assets`);
console.log(`\ntotal de assets distintos: ${todosLosAssets.size}`);

// En que paginas se usa cada slider, desde el propio export
const exp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference', 'wp-export.json'), 'utf8'));
const uso = new Map();
for (const pg of exp.paginas || []) {
  const d = pg.elementor && pg.elementor.datos_crudos;
  if (!d) continue;
  for (const m of d.matchAll(/\[rev_slider[^\]]*alias=["']?([a-z0-9-]+)/gi)) {
    const k = m[1];
    if (!uso.has(k)) uso.set(k, new Set());
    uso.get(k).add(pg.slug + '/' + ((pg.idioma && pg.idioma.code) || '?'));
  }
}
console.log('\n=== donde se usa cada slider ===');
for (const [alias, pgs] of uso) console.log(`  ${alias.padEnd(22)} ${[...pgs].join(', ')}`);
