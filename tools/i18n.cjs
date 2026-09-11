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

// Paginas de los docs. `index` es el landing de bienvenida de cada idioma: sin
// el, /fr/ daria 404 y el selector de idioma apuntaria a un enlace roto, porque
// Starlight enlaza al inicio del idioma, no a la pagina que estas viendo.
const PAGES = [
  { slug: 'pacto-social', locales: ['en', 'fr'] },
  { slug: 'index', locales: ['en', 'fr'] },
];
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

// La CLAVE incluye la pagina ademas de la seccion. Sin el slug, el landing y el
// Pacto colisionarian: los dos tienen unidades en la seccion 0 y 1, y una cadena
// corta que se repitiese en ambos recibiria una sola traduccion para los dos
// sitios, que puede no ser la correcta.
const clave = (u, slug) => sha1(`${slug}\u0000${u.seccion}\u0000${u.kind}\u0000${u.texto}`);

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
  // `--strict` anade una condicion mas: falla tambien si queda algo SIN REVISAR.
  // El modo normal solo falla si falta texto, porque publicar en un dominio de
  // ensayo para poder revisar las traducciones en contexto es legitimo. Antes de
  // cambiar al dominio real hay que correrlo en estricto.
  const estricto = process.argv.includes('--strict');
  let faltaAlgo = false;
  let haySinRevisar = false;
  console.log(`Matriz de traduccion${estricto ? ' (modo estricto: tambien falla lo sin revisar)' : ''}\n`);
  for (const page of PAGES) {
    const src = parse(fs.readFileSync(rutaDe(DEFAULT_LOCALE, page.slug), 'utf8'));
    const total = src.unidades.length;
    console.log(`${page.slug}  (${total} unidades)`);
    for (const locale of page.locales) {
      const tm = cargarTM(locale);
      let ok = 0, ausentes = 0, sinRevisar = 0;
      for (const u of src.unidades) {
        const e = tm.get(clave(u, page.slug));
        if (!e || !e.target) { ausentes++; continue; }
        ok++;
        if (!e.reviewed) sinRevisar++;
      }
      const estado = ausentes ? 'AUSENTE' : sinRevisar ? 'sin revisar' : 'OK';
      if (ausentes) faltaAlgo = true;
      if (sinRevisar) haySinRevisar = true;
      console.log(`  ${locale.padEnd(4)} traducidas ${String(ok).padStart(3)}/${total}   ausentes ${String(ausentes).padStart(3)}   sin revisar ${String(sinRevisar).padStart(3)}   ${estado}`);
    }
    console.log('');
  }
  if (faltaAlgo) {
    console.log('Hay cadenas ausentes: no se puede publicar texto viejo en otro idioma.');
    process.exit(1);
  }
  if (estricto && haySinRevisar) {
    console.log('Hay traducciones sin revisar. Antes del cambio al dominio real, revisarlas y marcarlas.');
    process.exit(1);
  }
  console.log(estricto
    ? 'Todas las cadenas estan traducidas y revisadas.'
    : 'Todas las cadenas estan traducidas.');
}

// ---------------------------------------------------------------------------
// importar: toma un Markdown YA TRADUCIDO y rellena la memoria emparejando
// unidad por unidad con la fuente espanola.
//
// Se traduce el DOCUMENTO, no el JSONL. Es mejor por dos razones: una traduccion
// se escribe como prosa coherente (terminologia consistente entre apartados, no
// frase a frase aislada), y el emparejamiento por posicion ya esta probado. El
// JSONL de la memoria es un artefacto derivado, no algo que se escriba a mano.
//
// Empareja por posicion DENTRO DE CADA SECCION y aborta si alguna seccion tiene
// distinto numero de unidades: eso detecta una traduccion que se ha saltado o
// anadido un parrafo, que es el error caro de este metodo. Un simple recuento
// total lo dejaria pasar si un parrafo se pierde en una seccion y se gana en
// otra.
// ---------------------------------------------------------------------------
function importar(locale, archivo, method, reviewed, slug) {
  const es = parse(fs.readFileSync(rutaDe(DEFAULT_LOCALE, slug), 'utf8'));
  const trad = parse(fs.readFileSync(archivo, 'utf8'));

  const porSeccion = (u) => {
    const m = new Map();
    for (const x of u.filter((y) => y.seccion !== -1)) m.set(x.seccion, (m.get(x.seccion) || 0) + 1);
    return m;
  };
  const a = porSeccion(es.unidades), b = porSeccion(trad.unidades);

  const problemas = [];
  for (const [sec, n] of a) {
    const m = b.get(sec);
    if (m === undefined) problemas.push(`seccion ${sec}: falta entera (la fuente tiene ${n} unidades)`);
    else if (m !== n) problemas.push(`seccion ${sec}: ${n} unidades en la fuente contra ${m} en la traduccion`);
  }

  if (es.unidades.length !== trad.unidades.length || problemas.length) {
    console.log(`ABORTADO: la traduccion no alinea con la fuente.`);
    console.log(`  unidades totales: fuente ${es.unidades.length} contra traduccion ${trad.unidades.length}`);
    if (problemas.length) {
      console.log(`  secciones desalineadas (${problemas.length}):`);
      problemas.slice(0, 15).forEach((p) => console.log(`    ${p}`));
      if (problemas.length > 15) console.log(`    ... y ${problemas.length - 15} mas`);
    }
    process.exit(1);
  }

  // Se MEZCLA con lo que ya hubiera en la memoria de ese idioma. Reemplazarla
  // entera borraria las traducciones de las demas paginas: importar el landing
  // se llevaria por delante el Pacto.
  const tm = cargarTM(locale);
  for (let i = 0; i < es.unidades.length; i++) {
    const u = es.unidades[i], t = trad.unidades[i];
    tm.set(clave(u, slug), {
      key: clave(u, slug), pagina: slug, seccion: u.seccion, kind: u.kind,
      source: u.texto, target: t.texto,
      method, reviewed,
    });
  }
  guardarTM(locale, tm);
  console.log(`${locale}/${slug}: ${es.unidades.length} entradas importadas de ${path.relative(ROOT, archivo)} (method=${method}, reviewed=${reviewed})`);
}

// ---------------------------------------------------------------------------
// seed: siembra el ingles desde el Markdown que ya existe en el proyecto. Son
// traducciones que escribio el autor del sitio, no generadas: entran como
// `original` y revisadas, y no se regeneran.
// ---------------------------------------------------------------------------
function seed() {
  for (const page of PAGES) {
    importar('en', rutaDe('en', page.slug), 'original', true, page.slug);
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
    fm[u.campo] = (tm.get(clave(u, page.slug)) || {}).target || u.texto;
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
    const e = tm.get(clave(unidad, page.slug));
    partes.push((b.prefijo || '') + (e && e.target ? e.target : unidad.texto));
    ultimoRaw = null;
  }

  const salida = partes.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
  const usadas = src.unidades.filter((u) => { const e = tm.get(clave(u, page.slug)); return e && e.target; }).length;
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
// review: marca como revisadas las entradas de un idioma. Se hace con un
// comando y no editando el JSONL a mano para que quede en el historial de git
// que la revision la hizo el autor y cuando.
//
// NO se cambia `method`: el texto lo genero la IA y lo que ha ocurrido es que el
// autor lo ha aprobado. Ponerlo como `humana` falsearia la procedencia, que es
// justo lo que la memoria sirve para no perder.
// ---------------------------------------------------------------------------
function review(locale) {
  const tm = cargarTM(locale);
  const hoy = new Date().toISOString().slice(0, 10);
  let n = 0;
  for (const e of tm.values()) {
    if (!e.reviewed) { e.reviewed = true; e.reviewedAt = hoy; n++; }
  }
  guardarTM(locale, tm);
  console.log(`${locale}: ${n} entradas marcadas como revisadas el ${hoy}`);
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
else if (cmd === 'import') {
  const locale = process.argv[3];
  const archivo = process.argv[4];
  const slug = process.argv[5] || PAGES[0].slug;
  if (!locale || !archivo) {
    console.log('uso: node tools/i18n.cjs import <locale> <ruta-al-md-traducido> [slug]');
    console.log(`  slug por defecto: ${PAGES[0].slug}. Disponibles: ${PAGES.map((p) => p.slug).join(', ')}`);
    process.exit(2);
  }
  if (!PAGES.some((p) => p.slug === slug)) {
    console.log(`slug desconocido: ${slug}. Disponibles: ${PAGES.map((p) => p.slug).join(', ')}`);
    process.exit(2);
  }
  const abs = path.isAbsolute(archivo) ? archivo : path.join(ROOT, archivo);
  if (!fs.existsSync(abs)) { console.log(`no existe el archivo: ${abs}`); process.exit(2); }
  importar(locale, abs, 'ia', false, slug);
}
else if (cmd === 'review') {
  const locale = process.argv[3];
  if (!locale) { console.log('uso: node tools/i18n.cjs review <locale>'); process.exit(2); }
  review(locale);
}
else if (cmd === 'build') build(process.argv[3] || 'en');
else if (cmd === 'check') check();
else {
  console.log('uso: node tools/i18n.cjs status [--strict] | seed | import <locale> <archivo> [slug] | review <locale> | build <locale> | check');
  process.exit(2);
}
