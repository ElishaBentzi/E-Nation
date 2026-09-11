/*
 * Convierte los .rst de Sphinx (docs/) al Markdown de Starlight (astro-docs/).
 *
 * Decisiones y por que:
 *
 * - El texto de origen es el .rst del repo, NO los .md de la raiz: aquellos
 *   son el borrador de 2018 y les faltan seis anos de edicion (349-496 palabras
 *   menos). Ver findings.md.
 *
 * - MAPEO DE NIVELES. En RST el nivel lo da el ORDEN de aparicion de los
 *   subrayados, y este documento usa 7 caracteres distintos (= - ~ ^ ' " *),
 *   que serian 7 niveles y pasarian de h6. Ademas en el original los articulos
 *   (`~`) quedan por encima de las secciones numeradas (`^`), lo que produce
 *   un anidamiento raro. Mapeo explicito y deliberado:
 *
 *       =  ->  h2   las Partes ("Primera Parte:", "Segunda Parte:", ...)
 *       -  ->  h3   subtitulos de parte ("El Fundamento.", "Desarrollo en...")
 *       ~  ->  h3   los articulos (0., 1., 2., ... 33.)
 *       ^  ->  h4   las secciones numeradas (2.1., 2.2., ... 33.x)
 *       '  ->  h5   (2.4.1., 3.3.1., ...)
 *       "  ->  h6   (6.5.1.1., ...)
 *       *  ->  h6   se colapsa en h6: no hay h7 y el nivel mas profundo del
 *                   documento solo tiene 2 apariciones
 *
 * - El titulo del documento (primer encabezado) NO se emite como encabezado:
 *   pasa al frontmatter, porque Starlight ya pinta el h1 de la pagina. Y se le
 *   quita el sufijo de idioma ("in **English**"), que sobra en un sitio con
 *   selector de idioma: en RTD estaba porque la pagina mezclaba los dos.
 *
 * - ARREGLO: el subrayado roto del EN (`'' '' '' '` con espacios) se normaliza,
 *   asi el 20.2.1. vuelve a ser encabezado. Es el unico defecto estructural.
 *
 * - NO se toca la prosa ni la ortografia. La redaccion y las tildes
 *   inconsistentes son decision editorial del autor, no de la migracion.
 *
 * Uso: node tools/rst-to-md.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'astro-docs', 'src', 'content', 'docs');

// loc -> { src, index, slug, suffix, titleFallback, docDesc, idxDesc }
// El SLUG es el mismo en todos los idiomas (ver la nota en astro-docs/astro.config.mjs):
// Starlight construye los hreflang reutilizando el slug por idioma y Astro no
// soporta slugs traducidos por configuracion. En los docs no hay equity que
// perder porque las URLs indexadas eran las .html de RTD, que se redirigen.
//
// LA META DESCRIPTION VA POR IDIOMA. Antes se fijaba la misma cadena para los
// dos y el ingles quedaba con la description en espanol, que es lo que Google
// muestra en los resultados de busqueda.
const SLUG = 'pacto-social';
const DOCS = [
  {
    loc: 'es',
    src: 'docs/es/Pacto-Social-Constitucion-Spanish.rst',
    index: 'docs/es/index.rst',
    slug: SLUG,
    suffix: /en \*\*Español\*\*$/i,
    titleFallback: 'Constitución de E-Nation',
    docDesc: 'Pacto Social de E-Nation — Worldwide Physical Distributed Nation',
    idxDesc: 'Documentación del Pacto Social de E-Nation',
  },
  {
    loc: 'en',
    src: 'docs/en/Social-Pact-Constitution-English.rst',
    index: 'docs/en/index.rst',
    slug: SLUG,
    suffix: /in \*\*English\*\*$/i,
    titleFallback: "E-Nation's Constitution",
    docDesc: "E-Nation's Social Pact — Worldwide Physical Distributed Nation",
    idxDesc: "E-Nation's Social Pact documentation",
  },
];

const LEVELS = { '=': 2, '-': 3, '~': 3, '^': 4, "'": 5, '"': 6, '*': 6 };
const PUNCT = /^([=\-~^"'`#*+!$%&()+,./:;<>?@[\]_{|}])/;

function isUnderlineLine(l) {
  const t = l.trim();
  if (!t) return false;
  const punct = t.replace(/\s/g, '');
  if (punct.length < 2) return false;
  // subrayado valido: un solo caracter repetido
  if (/^(.)\1+$/.test(punct) && Object.prototype.hasOwnProperty.call(LEVELS, punct[0])) return true;
  // subrayado ROTO con espacios intercalados: `'' '' '' '` -> lo tratamos como valido del mismo caracter
  return /^['"^~=*+\-](\s*['"^~=*+\-])+$/.test(t) && new Set(punct).size === 1;
}

function underlineChar(l) {
  return l.trim().replace(/\s/g, '')[0];
}

// RST inline -> Markdown inline
function inline(s) {
  return s
    .replace(/`([^`<]+?)\s*<([^>]+)>`_/g, '[$1]($2)') // enlaces RST
    .replace(/`([^`]+)`_/g, '$1')
    .replace(/\\([_*`])/g, '$1') // escapes de RST (\_\_\_\_ -> ____)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function convert(rst) {
  const lines = rst.split(/\r?\n/);
  const out = [];
  let title = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (next && isUnderlineLine(next) && line.trim()) {
      const level = LEVELS[underlineChar(next)];
      const text = inline(line.trim().replace(/\s+$/, ''));
      if (title === null) {
        title = text; // el primer encabezado es el titulo del documento
      } else {
        out.push(`${'#'.repeat(level)} ${text}`);
      }
      i++; // consume la linea de subrayado
      continue;
    }
    // linea de subrayado suelta (no deberia quedar ninguna)
    if (isUnderlineLine(line) && !line.trim().match(/[A-Za-z0-9]/)) {
      if (out.length && !out[out.length - 1]) continue;
      continue;
    }
    out.push(inline(line.replace(/\s+$/, '')));
  }

  // Colapsa 3+ lineas en blanco seguidas a una sola
  const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, body };
}

function landing(rst) {
  // El index.rst es la pagina de bienvenida: titulo, lema, parrafo, logo y la
  // lista de idiomas.
  //
  // DOS COSAS QUE NO SE COPIAN:
  //
  // 1. La lista de idiomas (`* English`, `* Español` apuntando a readthedocs) NO
  //    se reproduce. Es navegacion, no contenido, y Starlight ya trae su propio
  //    selector que ademas es mejor: lleva a la MISMA pagina en el otro idioma,
  //    no solo al inicio. Mantenerla seria ademas incrustar URLs dentro de texto
  //    traducible, que se rompe en cuanto cambie una ruta.
  //
  // 2. El cuerpo se corta en la frase que introduce esa lista, porque si no
  //    quedaria una frase huerfana anunciando unos enlaces que ya no estan.
  //
  // Y OJO: el cuerpo pasa por `inline()`. Sin eso, los enlaces RST salian sin
  // convertir y se veian como texto literal con backticks en la web.
  const lines = rst.split(/\r?\n/);
  let title = null;
  const body = [];
  let cortado = false;
  for (let i = 0; i < lines.length; i++) {
    if (cortado) break;
    const line = lines[i];
    const next = lines[i + 1];
    if (next && isUnderlineLine(next) && line.trim()) {
      if (title === null) title = inline(line.trim());
      else body.push(`## ${inline(line.trim())}`);
      i++;
      continue;
    }
    if (isUnderlineLine(line)) continue;
    if (line.trim() === '-----') continue;
    if (line.trim().startsWith('.. toctree::')) break;
    if (/idiomas:|languages:/i.test(line)) break; // aqui empieza la lista de idiomas
    if (line.trim().startsWith('.. image::')) {
      body.push('![E-Nation logo](/e-nation300x300.png)');
      continue;
    }
    if (/^:(height|width|align):/.test(line.trim())) continue;
    body.push(inline(line));
  }
  return { title, body: body.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

fs.mkdirSync(OUT, { recursive: true });

for (const d of DOCS) {
  const srcAbs = path.join(ROOT, d.src);
  if (!fs.existsSync(srcAbs)) { console.log(`FALTA ${d.src}`); continue; }
  const raw = fs.readFileSync(srcAbs, 'utf8');
  const { title, body } = convert(raw);
  const cleanTitle = (title || d.titleFallback).replace(d.suffix, '').trim();

  const dir = d.loc === 'es' ? OUT : path.join(OUT, d.loc);
  fs.mkdirSync(dir, { recursive: true });

  const page = `---\ntitle: ${JSON.stringify(cleanTitle)}\ndescription: ${JSON.stringify(d.docDesc)}\n---\n\n${body}\n`;
  fs.writeFileSync(path.join(dir, `${d.slug}.md`), page, 'utf8');

  // El landing ya no lleva la lista de idiomas: ver la nota en landing().
  const idx = fs.readFileSync(path.join(ROOT, d.index), 'utf8');
  const L = landing(idx);
  const indexPage = `---\ntitle: ${JSON.stringify(L.title || 'E-Nation')}\ndescription: ${JSON.stringify(d.idxDesc)}\n---\n\n${L.body}\n`;
  fs.writeFileSync(path.join(dir, 'index.md'), indexPage, 'utf8');

  console.log(`${d.loc}: ${d.slug}.md (${body.length} bytes, titulo "${cleanTitle}") + index.md (${L.body.length} bytes)`);
}
console.log('\nConversion terminada.');
