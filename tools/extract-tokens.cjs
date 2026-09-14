/*
 * Extrae los tokens de diseno REALES del CSS del original.
 *
 * POR QUE EXISTE
 *   El principio rector del proyecto es no inventar diseno: la paleta, los
 *   radios, las sombras y las tipografias se MIDEN en el CSS real. Este script
 *   hace esa medicion y la deja por escrito, con la procedencia de cada valor.
 *
 * DOS TRAMPAS QUE EVITA
 *   1. Las variables globales de Elementor (--e-global-color-primary y
 *      --e-global-color-accent) traen la paleta POR DEFECTO del plugin
 *      (#6EC1E4 y #61CE70), no la de la marca. Hay que ignorarlas.
 *   2. El CSS del tema comercial trae su propia paleta por defecto. En The7 son
 *      #1ebbf0 (azul) y #39dfaa (verde), con CIENTOS de apariciones, y NO son la
 *      marca. Por eso el script separa por ARCHIVO de procedencia: lo que
 *      aparece en el CSS propio del sitio (the7-css/custom.css, el CSS de
 *      Elementor de cada pagina, el child theme) es candidato a marca; lo que
 *      solo aparece en el CSS de fabrica del tema, no.
 *
 * Uso: node tools/extract-tokens.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'reference', 'css');
const RENDERED = path.join(ROOT, 'reference', 'rendered');

// Familias de archivos, por cercania a la marca.
//   propio  -> CSS que genera el SITIO (kit de Elementor, tema hijo, ajustes del tema)
//   plugin  -> CSS de plugins (Elementor, JetElements, RevSlider): define widgets
//   fabrica -> CSS de fabrica del tema comercial: trae su paleta por defecto
//   core    -> CSS del propio WordPress (wp-includes): no es de nadie en concreto
//
// OJO con el orden de las comprobaciones: `themes/dt-the7/css/compatibility/
// elementor/` tiene que ir ANTES que `themes/dt-the7/`, o cae en 'fabrica'.
function clasificar(rel) {
  const r = rel.replace(/\\/g, '/');
  if (/themes\/dt-the7-child\//.test(r)) return 'propio';
  if (/uploads\/elementor\/css\/post-\d+\.css$/.test(r)) return 'propio';
  if (/themes\/dt-the7\/css\/compatibility\/elementor\//.test(r)) return 'propio';
  if (/uploads\/the7-css\//.test(r)) return 'propio';
  if (/themes\/dt-the7\//.test(r)) return 'fabrica';
  if (/wp-includes\//.test(r)) return 'core';
  return 'plugin';
}

const FAMILIAS = ['propio', 'plugin', 'fabrica', 'core'];

function recorrer(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p, base, out);
    else if (/\.css$/i.test(e.name)) out.push({ abs: p, rel: path.relative(base, p) });
  }
  return out;
}

const archivos = recorrer(CSS).map((f) => ({ ...f, familia: clasificar(f.rel), texto: fs.readFileSync(f.abs, 'utf8') }));

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
const NOMBRES = { '000000': 'negro', 'ffffff': 'blanco', 'fff': 'blanco', '000': 'negro' };

function colores() {
  const porFamilia = {};
  for (const f of archivos) {
    const cuenta = porFamilia[f.familia] || (porFamilia[f.familia] = new Map());
    // hex de 3 o 6 digitos
    for (const m of f.texto.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const h = m[1].toLowerCase();
      const norm = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      // Se ignora el alfa embebido de 8 digitos: el \b ya lo evita, pero por si acaso
      if (norm.length !== 6) continue;
      cuenta.set(norm, (cuenta.get(norm) || 0) + 1);
    }
  }
  return porFamilia;
}

// ---------------------------------------------------------------------------
// Tipografia
// ---------------------------------------------------------------------------
function tipografias() {
  const cuenta = new Map();
  for (const f of archivos) {
    if (f.familia === 'fabrica') continue;
    for (const m of f.texto.matchAll(/font-family:\s*([^;{}]+)/gi)) {
      const v = m[1].replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
      if (!v || v.length > 90) continue;
      const primera = v.split(',')[0].replace(/["']/g, '').trim();
      if (!primera || /^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(primera)) continue;
      cuenta.set(primera, (cuenta.get(primera) || 0) + 1);
    }
  }
  return cuenta;
}

/** Familias declaradas en @font-face, que son las auto-hospedadas de verdad. */
function fuentesDeclaradas() {
  const fam = new Map();
  for (const f of archivos) {
    for (const m of f.texto.matchAll(/@font-face\s*{[^}]*font-family:\s*([^;{}]+)[^}]*}/gi)) {
      const v = m[1].replace(/["']/g, '').trim();
      fam.set(v, (fam.get(v) || 0) + 1);
    }
  }
  return fam;
}

// ---------------------------------------------------------------------------
// Otros tokens
// ---------------------------------------------------------------------------
function valores(regex, filtro) {
  const cuenta = new Map();
  for (const f of archivos) {
    if (f.familia === 'fabrica') continue;
    for (const m of f.texto.matchAll(regex)) {
      const v = m[1].replace(/\s+/g, ' ').trim();
      if (filtro && !filtro(v)) continue;
      cuenta.set(v, (cuenta.get(v) || 0) + 1);
    }
  }
  return cuenta;
}

const top = (mapa, n = 20, min = 1) =>
  [...mapa.entries()].filter(([, c]) => c >= min).sort((a, b) => b[1] - a[1]).slice(0, n);

// ---------------------------------------------------------------------------

const c = colores();
const tip = tipografias();
const decl = fuentesDeclaradas();
const radios = valores(/border-radius:\s*([^;{}!]+)/gi, (v) => /^[\d.]+(px|rem|em|%)$/.test(v) || v === '0');
const sombras = valores(/box-shadow:\s*([^;{}]+)/gi, (v) => v !== 'none' && v.length < 120);
const anchos = valores(/max-width:\s*([^;{}!]+)/gi, (v) => /^[\d.]+(px|rem|em|%)$/.test(v));

const lineas = [];
const p = (s = '') => lineas.push(s);

p('# Tokens de diseño medidos en el CSS real del original');
p();
p(`Extraído con \`tools/extract-tokens.cjs\` sobre ${archivos.length} archivos CSS (${(archivos.reduce((a, f) => a + f.texto.length, 0) / 1024 / 1024).toFixed(1)} MB).`);
p();
p('> **Nada de esto está inventado.** Cada valor sale de contar apariciones en el CSS');
p('> del sitio. La columna de procedencia importa: lo que aparece en el CSS *propio*');
p('> (el que genera WordPress para este sitio) es candidato a marca; lo que solo');
p('> aparece en el CSS de fábrica del tema comercial es la paleta por defecto de The7');
p('> y NO es la marca.');
p();

p('## Color, por familia de procedencia');
p();
for (const fam of FAMILIAS) {
  const cuenta = c[fam];
  if (!cuenta) continue;
  p(`### ${fam} (${[...cuenta.values()].reduce((a, b) => a + b, 0)} apariciones, ${cuenta.size} colores distintos)`);
  p();
  p('| color | apariciones | nota |');
  p('|---|---|---|');
  for (const [hex, n] of top(cuenta, 18, 2)) {
    const nota = NOMBRES[hex] ? `**${NOMBRES[hex]}**` : '';
    p(`| \`#${hex}\` | ${n} | ${nota} |`);
  }
  p();
}

p('## Tramos de marca medidos (ver findings.md)');
p();
p('Estos son los valores que se usan en el proyecto. Se listan aquí para que el');
p('archivo sea autosuficiente:');
p();
p('| token | valor | procedencia |');
p('|---|---|---|');
p('| Acento principal | `#ff7100` | `uploads/elementor/css/post-5738.css` (94 apariciones) |');
p('| Acento, variante | `#ff6900` | CSS inline de la home |');
p('| Énfasis / alerta | `#ff3a2d` | CSS inline de la home (8 apariciones) |');
p('| Azul medio | `#095287` | `post-5738.css` (10 apariciones) |');
p('| Azul oscuro | `#003f7f` | `post-5738.css` (8 apariciones) |');
p('| Navy | `#234965` | `post-5738.css` (4 apariciones) |');
p('| Azul claro | `#2e6f9a` | `post-5738.css` |');
p('| Borde | `#e8e8e8` | `post-5738.css` |');
p('| Texto | `#333333` | CSS inline de la home |');
p();
p('## El caso de `#1ebbf0` y `#39dfaa`: AMBIGUO, hay que medirlo en el navegador');
p();
p('Estos dos colores aparecen **cientos de veces en `uploads/the7-css/custom.css`**,');
p('que es CSS que WordPress genera para ESTE sitio a partir de las opciones del tema.');
p('O sea: no es solo la paleta de fábrica de The7, es el **color de acento configurado');
p('en el tema**. Y sus selectores incluyen cosas que sí se ven:');
p();
p('```css');
p('.wp-block-categories li a:hover, .wp-block-archives li a:hover { color: #1ebbf0; }');
p('.elementor-button, a.elementor-button:visited { ... }   /* botones de Elementor */');
p('.wp-block-quote { border-color: #1ebbf0; }');
p('```');
p();
p('En cambio el CSS de Elementor de la home (`post-5738.css`), que es el que pinta el');
p('contenido de esa página, usa **`#ff7100` 94 veces y no menciona `#1ebbf0` ni una**.');
p();
p('**Conclusión honesta: esto NO se puede resolver leyendo CSS.** Es una cuestión de');
p('cascada y especificidad: `custom.css` se carga antes que el CSS de Elementor, pero');
p('apuntan a selectores distintos, de modo que puede haber botones cian y textos');
p('naranjas en la misma página. La única forma de saberlo es **medir el color');
p('computado de los elementos visibles en el sitio en vivo**, con el snippet');
p('`tools/measure-browser.js` ejecutado en el navegador (ver la skill, Fase 1).');
p('Hasta entonces, `#1ebbf0` y `#39dfaa` quedan como **candidatos sin confirmar**,');
p('no como falsos positivos descartados.');
p();
p('Lo que SÍ es un falso positivo seguro es la paleta por defecto de **Elementor**,');
p('que aparece como variables globales del kit aunque no se use:');
p('`--e-global-color-primary: #6EC1E4` y `--e-global-color-accent: #61CE70`.');
p();

p('## Tipografía');
p();
if (decl.size) {
  p('Familias declaradas con `@font-face` (auto-hospedadas, las que de verdad se cargan):');
  p();
  for (const [f, n] of top(decl, 20)) p(`- **${f}** — ${n} declaraciones`);
  p();
}
p('Familias usadas en `font-family` (excluyendo el CSS de fábrica del tema):');
p();
p('| familia | apariciones |');
p('|---|---|');
for (const [f, n] of top(tip, 20, 3)) p(`| ${f} | ${n} |`);
p();

p('## Radios de borde');
p();
p('| valor | apariciones |');
p('|---|---|');
for (const [v, n] of top(radios, 14, 3)) p(`| \`${v}\` | ${n} |`);
p();
const cero = (radios.get('0') || 0) + (radios.get('0px') || 0);
const totalRadios = [...radios.values()].reduce((a, b) => a + b, 0);
p(`De ${totalRadios} declaraciones de radio, ${cero} son cero. ${cero / totalRadios > 0.5 ? '**El diseño es predominantemente cuadrado.**' : 'Hay radios significativos.'}`);
p();

p('## Sombras');
p();
const sinSombra = sombras.get('none') || 0;
p(`Declaraciones de \`box-shadow\` con valor distinto de \`none\`: ${[...sombras.values()].reduce((a, b) => a + b, 0)}.`);
p();
p('| valor | apariciones |');
p('|---|---|');
for (const [v, n] of top(sombras, 10, 2)) p(`| \`${v}\` | ${n} |`);
p();

p('## Anchos máximos (contenedor)');
p();
p('| valor | apariciones |');
p('|---|---|');
for (const [v, n] of top(anchos, 12, 3)) p(`| \`${v}\` | ${n} |`);
p();

p('## CSS de Elementor por página');
p();
p('El CSS de Elementor es **por página**, no global. Cada una tiene el suyo:');
p();
p('| página | CSS de Elementor | bytes |');
p('|---|---|---|');
for (const f of archivos) {
  if (!/uploads\/elementor\/css\/post-\d+\.css$/.test(f.rel.replace(/\\/g, '/'))) continue;
  p(`| — | \`${path.basename(f.rel)}\` | ${f.texto.length} |`);
}
p();
p('El mapa real de qué página usa cuál se obtiene de los HTML capturados. Ver');
p('`reference/INDEX.md`.');
p();

const salida = path.join(ROOT, 'reference', 'TOKENS.md');
fs.writeFileSync(salida, lineas.join('\n') + '\n', 'utf8');

console.log(`Escrito ${path.relative(ROOT, salida)}\n`);
console.log('--- resumen ---');
console.log(`archivos CSS analizados: ${archivos.length}`);
for (const fam of FAMILIAS) {
  const cuenta = c[fam];
  if (cuenta) console.log(`  ${fam.padEnd(8)} ${String(cuenta.size).padStart(4)} colores distintos, ${[...cuenta.values()].reduce((a, b) => a + b, 0)} apariciones`);
}
console.log('\nTop 10 colores del CSS PROPIO:');
for (const [hex, n] of top(c['propio'] || new Map(), 10, 2)) console.log(`  #${hex}  ${n}`);
console.log('\nFamilias auto-hospedadas (@font-face):');
for (const [f, n] of top(decl, 8)) console.log(`  ${f} (${n})`);
