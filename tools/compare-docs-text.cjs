// ¿El .md local y el .rst publicado contienen el MISMO texto?
// Extrae los parrafos de cada documento, los normaliza y los compara.
// Objetivo: decidir cual es la fuente buena para migrar a Starlight.
// Uso: node tools/compare-docs-text.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAIRS = [
  {
    lang: 'EN',
    a: { label: '.md local', rel: 'Social-Pact-Constitution-English.md' },
    b: { label: '.rst repo', rel: 'docs/en/Social-Pact-Constitution-English.rst' },
  },
  {
    lang: 'ES',
    a: { label: '.md local', rel: 'Pacto-Social-Constitucion-Spanish.md' },
    b: { label: '.rst repo', rel: 'docs/es/Pacto-Social-Constitucion-Spanish.rst' },
  },
];

const isPunctOnly = (l) => /^[=\-~^"'`#*+!$%&()+,./:;<>?@[\]_{|}\s]+$/.test(l) && l.trim().length > 0;
// Minimo DOS caracteres: este documento subraya los articulos con `~~`.
const isUnderline = (l) => /^([=\-~^"'`#*+])\1{1,}\s*$/.test(l);

function paragraphs(text, kind) {
  const lines = text.split(/\r?\n/);

  // Hay que excluir los encabezados del .rst, o se cuelan como prosa y las
  // cifras salen sesgadas: en el .rst los titulos son lineas de texto normales
  // (su marca es el subrayado de la linea siguiente), mientras que en el .md
  // empiezan por `#` y se descartan solos. Sin esto, "first part" o "the
  // foundation" contaban como parrafos presentes solo en el .rst.
  const skip = new Set();
  if (kind === 'rst') {
    for (let i = 1; i < lines.length; i++) {
      if (isUnderline(lines[i])) { skip.add(i); skip.add(i - 1); }
    }
  }

  const out = [];
  let buf = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const drop =
      skip.has(i) ||
      !l ||
      isPunctOnly(l) ||
      (kind === 'rst' && (l.startsWith('..') || /^:[a-z]+:/.test(l))) ||
      (kind === 'md' && l.startsWith('#'));
    if (drop) {
      if (buf.length) { out.push(buf.join(' ')); buf = []; }
      continue;
    }
    buf.push(l);
  }
  if (buf.length) out.push(buf.join(' '));
  return out.filter((p) => p.replace(/[^A-Za-z0-9À-ÿ]/g, '').length > 3);
}

function normalize(s) {
  return s
    .replace(/&(quot|#39|amp|lt|gt|nbsp|#8217|#8216|#8220|#8221);/gi, ' ')
    .replace(/[*_`\\]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ ]/g, '')
    .trim();
}

function words(s) {
  return normalize(s).split(' ').filter(Boolean);
}

for (const pair of PAIRS) {
  const A = fs.readFileSync(path.join(ROOT, pair.a.rel), 'utf8');
  const B = fs.readFileSync(path.join(ROOT, pair.b.rel), 'utf8');
  const pa = paragraphs(A, 'md').map(normalize);
  const pb = paragraphs(B, 'rst').map(normalize);
  const wa = pa.flatMap(words);
  const wb = pb.flatMap(words);

  console.log(`\n${'#'.repeat(70)}\n#### ${pair.lang}: ${pair.a.label}  vs  ${pair.b.label}\n${'#'.repeat(70)}`);
  console.log(`  parrafos:   ${pa.length}  vs  ${pb.length}`);
  console.log(`  palabras:   ${wa.length}  vs  ${wb.length}   (diferencia: ${wa.length - wb.length})`);

  const setA = new Set(pa), setB = new Set(pb);
  const onlyA = pa.filter((p) => !setB.has(p));
  const onlyB = pb.filter((p) => !setA.has(p));
  console.log(`  parrafos identicos en ambos: ${pa.filter((p) => setB.has(p)).length}`);
  console.log(`  parrafos SOLO en ${pair.a.label}: ${onlyA.length}`);
  console.log(`  parrafos SOLO en ${pair.b.label}: ${onlyB.length}`);

  const wsetA = new Set(wa), wsetB = new Set(wb);
  const onlyWordsA = [...wsetA].filter((w) => !wsetB.has(w));
  const onlyWordsB = [...wsetB].filter((w) => !wsetA.has(w));
  console.log(`  vocabulario: ${wsetA.size} vs ${wsetB.size} palabras distintas`);
  console.log(`     solo en ${pair.a.label} (${onlyWordsA.length}): ${onlyWordsA.slice(0, 25).join(', ')}`);
  console.log(`     solo en ${pair.b.label} (${onlyWordsB.length}): ${onlyWordsB.slice(0, 25).join(', ')}`);

  if (onlyA.length) {
    console.log(`\n  --- primeros parrafos SOLO en ${pair.a.label} (recortados) ---`);
    onlyA.slice(0, 6).forEach((p, i) => console.log(`   ${i + 1}. ${p.slice(0, 110)}...`));
  }
  if (onlyB.length) {
    console.log(`\n  --- primeros parrafos SOLO en ${pair.b.label} (recortados) ---`);
    onlyB.slice(0, 6).forEach((p, i) => console.log(`   ${i + 1}. ${p.slice(0, 110)}...`));
  }
}
