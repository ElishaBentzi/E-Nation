/*
 * Memoria de traduccion de los docs.
 *
 * MODELO
 *   - El espanol es la FUENTE y define la estructura (astro-docs/.../pacto-social.md).
 *   - La memoria (astro-docs/src/i18n/tm/<locale>.jsonl) guarda, por unidad de
 *     texto, su traduccion a cada idioma.
 *   - Los ficheros de los demas idiomas se GENERAN desde la fuente + la memoria.
 *     No se editan a mano: la siguiente generacion los pisaria. Las correcciones
 *     van a la memoria, que es el artefacto que se revisa.
 *
 * CLAVE DE CADA UNIDAD
 *   sha1(seccion + tipo + texto fuente). Es "content-addressed": la clave
 *   describe exactamente un texto fuente, asi que
 *     - si el espanol no cambia, la traduccion se reutiliza identica (determinista);
 *     - si cambia, la clave cambia y la unidad aparece como AUSENTE.
 *   Consecuencia: no puede haber traducciones viejas silenciosas. No hace falta
 *   un estado "obsoleta" aparte, la propia clave lo garantiza.
 *   La seccion entra en la clave para desambiguar textos cortos que se repiten
 *   en sitios distintos y podrian necesitar traducciones distintas.
 *
 * LO QUE NO SE TRADUCE
 *   Los encabezados que son solo numeracion ("2.1.", "6.5.1.2.1.") son iguales
 *   en todos los idiomas: se copian tal cual y no generan entrada.
 *
 * USO
 *   node tools/i18n.cjs status            matriz pagina x idioma; exit 1 si falta algo
 *   node tools/i18n.cjs seed              empareja ES<->EN y siembra la memoria EN
 *   node tools/i18n.cjs build <locale>    genera el Markdown del idioma desde la memoria
 *   node tools/i18n.cjs check             verifica que generar reproduce los ficheros actuales
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'astro-docs', 'src', 'content', 'docs');
const TM_DIR = path.join(ROOT, 'astro-docs', 'src', 'i18n', 'tm');

const PAGES = [{ slug: 'pacto-social', locales: ['en', 'fr'] }];
const DEFAULT_LOCALE = 'es';

const esSoloNumeracion = (t) => /^[0-9]+(\.[0-9]+)*\.?$/.test(t.trim());
const dirDe = (locale) => (locale === DEFAULT_LOCALE ? DOCS : path.join(DOCS, locale));
const rutaDe = (locale, slug) => path.join(dirDe(locale), `${slug}.md`);

function sha1(s) {
  return crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Parseo: frontmatter + lista de bloques. Un bloque es `raw` (linea que se
// reproduce tal cual) o `unit` (texto traducible con su clave).
// ---------------------------------------------------------------------------
function parse(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const front = m ? m[1] : '';
  const cuerpo = m ? md.slice(m[0].length) : md;

  const fm = {};
  for (const line of front.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const bloques = [];
  const unidades = [];
  let seccion = 0;

  for (const raw of cuerpo.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) { bloques.push({ tipo: 'raw', texto: '' }); continue; }
    if (l.startsWith('<!--') || l.startsWith(':::')) { bloques.push({ tipo: 'raw', texto: raw }); continue; }

    const h = l.match(/^(#{2,6})\s+(.*)$/);
    if (h) {
      seccion += 1;
      if (esSoloNumeracion(h[2])) {
        // numeracion pura: igual en todos los idiomas, no se traduce
        bloques.push({ tipo: 'raw', texto: `${h[1]} ${h[2].trim()}` });
      } else {
        // OJO: el prefijo (`## `) y el texto van en el MISMO bloque. Emitirlos
        // como bloques separados los parte en dos lineas al reconstruir.
        bloques.push({ tipo: 'unit', indice: unidades.length, prefijo: `${h[1]} ` });
        unidades.push({ seccion, kind: 'h', texto: h[2].trim() });
      }
      continue;
    }
    // Los items de lista conservan su marca en el prefijo; se traduce el contenido.
    const li = raw.match(/^(\s*[-*+]\s+|\s*\d+\.\s+)(.*)$/);
    if (li) {
      bloques.push({ tipo: 'unit', indice: unidades.length, prefijo: li[1] });
      unidades.push({ seccion, kind: 'li', texto: li[2].trim() });
      continue;
    }
    bloques.push({ tipo: 'unit', indice: unidades.length, prefijo: '' });
    unidades.push({ seccion, kind: 'p', texto: l });
  }

  // El frontmatter tambien se traduce.
  const fmUnits = [];
  for (const campo of ['title', 'description']) {
    if (fm[campo] === undefined) continue;
    fmUnits.push({ campo, seccion: -1, kind: `frontmatter.${campo}`, texto: fm[campo] });
  }

  return { fm, bloques, unidades: fmUnits.concat(unidades) };
}

const clave = (u) => sha1(`${u.seccion}\u0000${u.kind}\u0000${u.texto}`);

// ---------------------------------------------------------------------------
// Memoria
// ---------------------------------------------------------------------------
function cargarTM(locale) {
  const f = path.join(TM_DIR, `${locale}.jsonl`);
  if (!fs.existsSync(f)) return new Map();
  const map = new Map();
  for (const linea of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    try { const e = JSON.parse(linea); map.set(e.key, e); } catch { /* linea corrupta: se ignora */ }
  }
  return map;
}

function guardarTM(locale, tm) {
  fs.mkdirSync(TM_DIR, { recursive: true });
  const lineas = [...tm.values()].sort((a, b) => (a.seccion - b.seccion) || a.kind.localeCompare(b.kind));
  fs.writeFileSync(path.join(TM_DIR, `${locale}.jsonl`), lineas.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
function status() {
  let faltaAlgo = false;
  console.log('Matriz de traduccion\n');
  for (const page of PAGES) {
    const src = parse(fs.readFileSync(rutaDe(DEFAULT_LOCALE, page.slug), 'utf8'));
    const total = src.unidades.length;
    console.log(`${page.slug}  (${total} unidades)`);
    for (const locale of page.locales) {
      const tm = cargarTM(locale);
      let ok = 0, ausentes = 0, sinRevisar = 0;
      for (const u of src.unidades) {
        const e = tm.get(clave(u));
        if (!e || !e.target) { ausentes++; continue; }
        ok++;
        if (!e.reviewed) sinRevisar++;
      }
      const estado = ausentes ? 'AUSENTE' : sinRevisar ? 'sin revisar' : 'OK';
      if (ausentes) faltaAlgo = true;
      console.log(`  ${locale.padEnd(4)} traducidas ${String(ok).padStart(3)}/${total}   ausentes ${String(ausentes).padStart(3)}   sin revisar ${String(sinRevisar).padStart(3)}   ${estado}`);
    }
    console.log('');
  }
  if (faltaAlgo) {
    console.log('Hay cadenas ausentes: no se puede publicar texto viejo en otro idioma.');
    process.exit(1);
  }
  console.log('Todas las cadenas estan traducidas.');
}

// ---------------------------------------------------------------------------
// seed: empareja ES<->EN por posicion dentro de cada seccion y siembra la
// memoria del ingles como traduccion ORIGINAL (la escribio el autor del sitio,
// no se regenera).
// ---------------------------------------------------------------------------
function seed() {
  for (const page of PAGES) {
    const es = parse(fs.readFileSync(rutaDe(DEFAULT_LOCALE, page.slug), 'utf8'));
    const enPath = rutaDe('en', page.slug);
    if (!fs.existsSync(enPath)) { console.log(`no existe ${enPath}, nada que sembrar`); continue; }
    const en = parse(fs.readFileSync(enPath, 'utf8'));

    if (en.unidades.length !== es.unidades.length) {
      console.log(`ABORTADO: ${es.unidades.length} unidades ES contra ${en.unidades.length} EN. No se puede emparejar por posicion.`);
      process.exit(1);
    }

    const tm = new Map();
    let sembradas = 0;
    for (let i = 0; i < es.unidades.length; i++) {
      const u = es.unidades[i], t = en.unidades[i];
      tm.set(clave(u), {
        key: clave(u), seccion: u.seccion, kind: u.kind,
        source: u.texto, target: t.texto,
        method: 'original', reviewed: true,
      });
      sembradas++;
    }
    guardarTM('en', tm);
    console.log(`en: sembradas ${sembradas} entradas desde ${path.relative(ROOT, enPath)} (method=original, reviewed=true)`);
  }
}

// ---------------------------------------------------------------------------
// render: reproduce el esqueleto del espanol sustituyendo cada unidad por su
// traduccion. Lo que no es una unidad (lineas vacias, marcas de lista,
// numeracion de encabezado) se copia tal cual.
// Devuelve la cadena SIN escribir nada: asi `check` puede comparar sin riesgo.
// (La version anterior escribia siempre, y un fallo al partir los encabezados en
// dos lineas destruyo el fichero ingles. Por eso render y build estan separados.)
// ---------------------------------------------------------------------------
function render(locale, page) {
  const src = parse(fs.readFileSync(rutaDe(DEFAULT_LOCALE, page.slug), 'utf8'));
  const tm = cargarTM(locale);

  const partes = [];
  const fm = {};
  for (const u of src.unidades) {
    if (u.seccion !== -1) continue;
    fm[u.campo] = (tm.get(clave(u)) || {}).target || u.texto;
  }
  for (const campo of Object.keys(src.fm)) {
    if (!(campo in fm)) fm[campo] = src.fm[campo];
  }
  partes.push('---');
  for (const [k, v] of Object.entries(fm)) partes.push(`${k}: ${v}`);
  partes.push('---', '');

  let ultimoRaw = null;
  for (const b of src.bloques) {
    if (b.tipo === 'raw') {
      if (b.texto === '' && ultimoRaw === '') continue; // colapsa blancos repetidos
      partes.push(b.texto);
      ultimoRaw = b.texto;
      continue;
    }
    const unidad = unidadPorIndice(src, b.indice);
    const e = tm.get(clave(unidad));
    partes.push((b.prefijo || '') + (e && e.target ? e.target : unidad.texto));
    ultimoRaw = null;
  }

  const salida = partes.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
  const usadas = src.unidades.filter((u) => { const e = tm.get(clave(u)); return e && e.target; }).length;
  return { salida, usadas, total: src.unidades.length };
}

function build(locale) {
  if (locale === DEFAULT_LOCALE) {
    console.error(`ABORTADO: "${DEFAULT_LOCALE}" es el idioma fuente y no se genera. Editarlo a mano no es un error.`);
    process.exit(1);
  }
  for (const page of PAGES) {
    const { salida, usadas, total } = render(locale, page);
    const destino = rutaDe(locale, page.slug);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, salida, 'utf8');
    console.log(`${locale}: ${path.relative(ROOT, destino)} escrito — ${usadas}/${total} unidades traducidas`);
  }
}

// ---------------------------------------------------------------------------
// check: ver la version con comparacion por unidades mas abajo.
// ---------------------------------------------------------------------------

// Indice de unidad de documento (excluye las del frontmatter)
function unidadPorIndice(src, indice) {
  const cuerpo = src.unidades.filter((u) => u.seccion !== -1);
  return cuerpo[indice];
}

// ---------------------------------------------------------------------------
// check: genera EN MEMORIA y compara UNIDADES DE CONTENIDO contra el fichero que
// ya existe. Comparar lineas en bruto daria falsos positivos por diferencias de
// espaciado que no cambian el contenido: el espanol y el ingles difieren en los
// espacios tras la marca de lista y en una linea en blanco, y el esqueleto (que
// es el espanol) manda. Lo que importa es que no se pierda ni cambie texto.
// ---------------------------------------------------------------------------
function check() {
  let fallo = false;
  for (const page of PAGES) {
    const destino = rutaDe('en', page.slug);
    const enDisco = parse(fs.readFileSync(destino, 'utf8'));
    const { salida } = render('en', page);
    const generado = parse(salida);

    const a = enDisco.unidades.map((u) => u.texto);
    const b = generado.unidades.map((u) => u.texto);

    console.log(`check en/${page.slug}.md`);
    console.log(`  unidades en disco: ${a.length} | generadas: ${b.length}`);
    if (a.length !== b.length) {
      console.log('  DISCREPANCIA DE ESTRUCTURA: el numero de unidades no coincide');
      fallo = true;
      continue;
    }
    const distintas = a.filter((t, i) => t !== b[i]).length;
    console.log(`  unidades con texto distinto: ${distintas}`);
    if (distintas) {
      for (let i = 0, m = 0; i < a.length && m < 5; i++) {
        if (a[i] !== b[i]) {
          console.log(`    #${i}:`);
          console.log(`      disco:    ${a[i].slice(0, 90)}`);
          console.log(`      generado: ${b[i].slice(0, 90)}`);
          m++;
        }
      }
      fallo = true;
    }
    const lineasA = fs.readFileSync(destino, 'utf8').split(/\r?\n/).length;
    const lineasB = salida.split(/\r?\n/).length;
    if (lineasA !== lineasB) {
      console.log(`  (informativo) lineas: ${lineasA} en disco contra ${lineasB} generadas — diferencia de espaciado, el esqueleto es el espanol`);
    }
  }
  if (fallo) {
    console.log('\nEl pipeline NO reproduce el contenido actual.');
    process.exit(1);
  }
  console.log('\nTodo el contenido se reproduce unidad por unidad.');
}

const cmd = process.argv[2] || 'status';
if (cmd === 'status') status();
else if (cmd === 'seed') seed();
else if (cmd === 'build') build(process.argv[3] || 'en');
else if (cmd === 'check') check();
else { console.log('uso: node tools/i18n.cjs [status|seed|build <locale>|check]'); process.exit(2); }
