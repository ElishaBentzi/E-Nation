// Analizador de estructura de los documentos del Pacto Social.
// Compara los .rst de Sphinx contra los .md locales y mide la paridad EN<->ES.
// Uso: node tools/analyze-docs.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  'rst EN': 'docs/en/Social-Pact-Constitution-English.rst',
  'rst ES': 'docs/es/Pacto-Social-Constitucion-Spanish.rst',
  'md  EN': 'Social-Pact-Constitution-English.md',
  'md  ES': 'Pacto-Social-Constitucion-Spanish.md',
};

// Subrayado RST valido. OJO: el minimo son DOS caracteres, no tres. Este
// documento usa `~~` bajo los numeros de articulo (`0.`, `1.`, ... `8.`), y
// exigir 3 hacia invisibles todos los encabezados de articulo — lo que llevo a
// concluir por error que al ingles le faltaban los articulos 1-8.
const RST_PUNCT = /^([=\-~^"'`#*+])\1{1,}\s*$/;

// Cualquier linea compuesta SOLO por puntuacion RST y espacios.
const RST_PUNCT_SET = /^[=\-~^"'`#*+!$%&()+,./:;<>?@[\]_{|}]+$/;
// Linea sospechosa: solo puntuacion/espacios, >=3 de puntuacion, y con
// espacios INTERNOS entre la puntuacion. En RST el subrayado NO puede llevar
// espacios, asi que esto es un subrayado roto: el titulo de encima deja de
// ser encabezado, no tiene ancla y desaparece del indice.
function malformedUnderlines(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const punct = raw.replace(/\s/g, '');
    if (punct.length < 3 || !RST_PUNCT_SET.test(punct)) continue;
    if (!/\s/.test(raw.trim())) continue; // subrayado valido (sin espacios)
    if (/[A-Za-z0-9]/.test(raw)) continue; // es texto, no puntuacion
    if (!lines[i - 1].trim()) continue;
    out.push({ line: i + 1, title: lines[i - 1].trim(), underline: JSON.stringify(raw) });
  }
  return out;
}

// RST: el titulo es la linea ANTERIOR a la linea de puntuacion.
// MD: el titulo es la linea que empieza por #.
function headingsRst(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (RST_PUNCT.test(lines[i]) && lines[i - 1].trim()) {
      out.push({ level: lines[i].trim()[0], text: lines[i - 1].trim() });
    }
  }
  return out;
}
function headingsMd(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => ({ level: '#'.repeat(l.match(/^#+/)[0].length), text: l.replace(/^#+\s*/, '').trim() }));
}

function stats(text) {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim()).length;
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: lines.length,
    nonEmpty,
    directives: (text.match(/^\.\.\s+[a-z]+::/gm) || []).length,
    images: (text.match(/^\.\.\s+image::/gm) || []).length,
    listItems: lines.filter((l) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l)).length,
    entities: (text.match(/&(quot|amp|lt|gt|#\d+);/g) || []).length,
    mdLinks: (text.match(/\]\([^)]+\)/g) || []).length,
    rstLinks: (text.match(/`[^`]+<[^>]+>`_/g) || []).length,
  };
}

const data = {};
for (const [label, rel] of Object.entries(FILES)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log(`FALTA: ${rel}`); continue; }
  const text = fs.readFileSync(abs, 'utf8');
  const isRst = rel.endsWith('.rst');
  data[label] = { text, heads: isRst ? headingsRst(text) : headingsMd(text), stats: stats(text), malformed: isRst ? malformedUnderlines(text) : [] };
}

console.log('#### ESTADISTICAS ####\n');
console.log('archivo  bytes   lineas  noVacias  titulos  directivas  imagenes  items  entidades  enlaces');
for (const [label, d] of Object.entries(data)) {
  const s = d.stats;
  const links = s.mdLinks + s.rstLinks;
  console.log(
    `${label}  ${String(s.bytes).padStart(6)}  ${String(s.lines).padStart(6)}  ${String(s.nonEmpty).padStart(8)}  ` +
    `${String(d.heads.length).padStart(7)}  ${String(s.directives).padStart(10)}  ${String(s.images).padStart(8)}  ` +
    `${String(s.listItems).padStart(5)}  ${String(s.entities).padStart(9)}  ${String(links).padStart(6)}`
  );
}

console.log('\n\n#### TITULOS: rst EN  <->  rst ES ####\n');
const a = data['rst EN'].heads, b = data['rst ES'].heads;
const n = Math.max(a.length, b.length);
console.log('  #   nivel  EN                                        | ES');
for (let i = 0; i < n; i++) {
  const x = a[i], y = b[i];
  const mark = x && y && x.level === y.level ? ' ' : '!';
  console.log(
    `${mark} ${String(i + 1).padStart(3)}  ${(x ? x.level : '-').padEnd(5)}  ${(x ? x.text.slice(0, 40) : '(falta)').padEnd(41)} | ${y ? y.text.slice(0, 44) : '(falta)'}`
  );
}
console.log(`\nEN: ${a.length} titulos | ES: ${b.length} titulos | diferencia: ${a.length - b.length}`);
const levelDrift = a.filter((x, i) => b[i] && x.level !== b[i].level).length;
console.log(`titulos con nivel distinto (marcados con !): ${levelDrift}`);

console.log('\n\n#### SUBRAYADOS RST ROTOS (con espacios: el titulo NO se renderiza como encabezado) ####\n');
let anyMalformed = false;
for (const [label, d] of Object.entries(data)) {
  if (!d.malformed.length) {
    if (label.startsWith('rst')) console.log(`${label}: ninguno`);
    continue;
  }
  anyMalformed = true;
  console.log(`${label}: ${d.malformed.length} caso(s)`);
  for (const m of d.malformed) {
    console.log(`   linea ${m.line}: titulo "${m.title}" -> subrayado ${m.underline}`);
  }
}
if (!anyMalformed) console.log('\nTodos los subrayados son validos.');

console.log('\n\n#### TITULOS: rst EN  <->  md EN (¿sirve el .md como fuente?) ####\n');
const c = data['md  EN'].heads;
const n2 = Math.max(a.length, c.length);
console.log('  #   EN .rst (nivel)                              | EN .md (# nivel)');
for (let i = 0; i < n2; i++) {
  const x = a[i], y = c[i];
  console.log(
    `${String(i + 1).padStart(3)}  ${(x ? `[${x.level}] ${x.text.slice(0, 36)}` : '(falta)').padEnd(45)} | ${y ? `[${y.level}] ${y.text.slice(0, 40)}` : '(falta)'}`
  );
}
console.log(`\nrst EN: ${a.length} titulos | md EN: ${c.length} titulos | diferencia: ${a.length - c.length}`);
