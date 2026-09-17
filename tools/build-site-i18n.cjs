/*
 * Genera el manifiesto i18n del SITIO desde los grupos de traduccion de WPML.
 *
 * POR QUE SE GENERA Y NO SE ESCRIBE A MANO
 *   Astro no soporta slugs traducidos por configuracion (no existe
 *   `i18n.routing.pathnames`, solo hay una propuesta abierta en su roadmap). La
 *   receta oficial es un mapa manual, y escribirlo a mano para 7 paginas x 3
 *   idiomas es exactamente donde se cuelan los errores. Los grupos de traduccion
 *   de WPML ya contienen la verdad: que pagina es la traduccion de cual y con que
 *   slug en cada idioma. Se extrae `reference/manifest.json` y se emite el mapa.
 *
 *   El resultado SI se versiona (a diferencia de `reference/`, que esta ignorado),
 *   porque es codigo fuente del sitio. Si cambia el original, se vuelve a correr.
 *
 * Uso: node tools/build-site-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFIESTO = path.join(ROOT, 'reference', 'manifest.json');
const DESTINO = path.join(ROOT, 'astro-site', 'src', 'i18n');

if (!fs.existsSync(MANIFIESTO)) {
  console.error(`no existe ${path.relative(ROOT, MANIFIESTO)}. Hay que generar el export primero.`);
  process.exit(2);
}
const m = JSON.parse(fs.readFileSync(MANIFIESTO, 'utf8'));

// El idioma predeterminado del SITIO es el ingles: es el que vive en la raiz
// (/, /presentation/, ...) y el que el original canoniza. En la documentacion es
// al reves, porque alli el espanol es el idioma de autoria; son decisiones
// distintas y conviene no confundirlas.
const DEFAULT_LOCALE = 'en';

// Los idiomas se ordenan con el PREDETERMINADO PRIMERO y el resto alfabetico. El
// manifiesto los devuelve en su propio orden (fr, es, en), y ese orden acaba en el
// selector de idioma y en las columnas de los informes: mejor que sea estable y
// legible que heredado. ESTE ORDEN ES EL QUE VERAN LOS USUARIOS en el selector.
const todos = m.idiomas.map((i) => i.code);
const locales = [DEFAULT_LOCALE, ...todos.filter((l) => l !== DEFAULT_LOCALE).sort()];
if (!todos.includes(DEFAULT_LOCALE)) {
  console.error(`el idioma predeterminado "${DEFAULT_LOCALE}" no esta entre los del manifiesto: ${todos.join(', ')}`);
  process.exit(1);
}

/**
 * Identifica el id estable de cada pagina a partir del slug INGLES, que es el
 * que no cambia de idioma a idioma en el manifiesto y por tanto sirve de clave.
 */
function idDeGrupo(g) {
  const en = g.paginas.en;
  const slugs = Object.fromEntries(Object.entries(g.paginas).map(([code, p]) => [code, p.slug]));
  const alguno = en || Object.values(g.paginas)[0];
  return {
    // El slug ingles "home-landing-page" no sirve como id: se normaliza.
    id: /home/i.test(alguno.slug) ? 'home' : alguno.slug.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
    slugs,
    tipo: alguno.tipo,
    seo: Object.fromEntries(
      Object.entries(g.paginas).map(([code, p]) => [code, { titulo: p.seo.titulo || '', keyword: p.seo.focus_keyword || null }])
    ),
    bytes: Object.fromEntries(Object.entries(g.paginas).map(([code, p]) => [code, p.bytes_contenido])),
  };
}

const paginas = m.paginas.map(idDeGrupo);

// El home vive en el indice, no en una ruta con slug: se le da cadena vacia.
for (const p of paginas) if (p.id === 'home') p.slugs = Object.fromEntries(Object.keys(p.slugs).map((k) => [k, '']));

const etiquetas = { en: 'English', es: 'Español', fr: 'Français' };

const lineas = [];
const w = (s = '') => lineas.push(s);

w('/*');
w(' * MANIFIESTO i18n DEL SITIO — ARCHIVO GENERADO, NO EDITAR A MANO.');
w(' *');
w(' * Generado por `tools/build-site-i18n.cjs` a partir de los GRUPOS DE TRADUCCION');
w(' * de WPML extraidos del WordPress original (`reference/manifest.json`).');
w(' *');
w(' * Contiene, por pagina, su slug en cada idioma. Es la fuente de verdad para las');
w(' * rutas, el hreflang, el selector de idioma y el sitemap. Astro no soporta slugs');
w(' * traducidos por configuracion, asi que este mapa es imprescindible y se genera');
w(' * en vez de escribirse a mano para no equivocarse con 7 paginas x 3 idiomas.');
w(' *');
w(' * Si cambia el sitio original, volver a correr el generador.');
w(' */');
w();
w(`export const LOCALES = [${locales.map((l) => `'${l}'`).join(', ')}] as const;`);
w('export type Locale = (typeof LOCALES)[number];');
w();
w(`export const DEFAULT_LOCALE: Locale = '${DEFAULT_LOCALE}';`);
w();
w('export const LOCALE_LABELS: Record<Locale, string> = {');
for (const l of locales) w(`  ${l}: '${etiquetas[l] || l}',`);
w('};');
w();
w('export type PageId =');
for (const p of paginas) w(`  | '${p.id}'`);
w(';');
w();
w('export interface PageDef {');
w('  /** Slug por idioma. Cadena vacia = vive en el indice de su idioma. */');
w('  slugs: Partial<Record<Locale, string>>;');
w("  /** 'elementor' = pagina construida con el page builder; 'plana' = contenido simple. */");
w("  kind: 'elementor' | 'plana';");
w('  /** Titulo SEO del original por idioma. Punto de partida, se revisa en la fase de SEO. */');
w('  seo: Partial<Record<Locale, { titulo: string; keyword: string | null }>>;');
w('}');
w();
w('export const PAGES: Record<PageId, PageDef> = {');
for (const p of paginas) {
  // Los ids con guion ("privacy-policy") NO son claves validas sin comillas en
  // TypeScript: `privacy-policy: {` es un error de sintaxis. Se entrecomilla solo
  // cuando hace falta, para que el archivo siga siendo legible.
  const clave = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p.id) ? p.id : `'${p.id}'`;
  w(`  ${clave}: {`);
  w('    slugs: {');
  for (const l of locales) if (p.slugs[l] !== undefined) w(`      ${l}: '${p.slugs[l]}',`);
  w('    },');
  w(`    kind: '${p.tipo}',`);
  w('    seo: {');
  for (const l of locales) {
    const s = p.seo[l];
    if (!s) continue;
    const titulo = String(s.titulo).replace(/'/g, "\\'");
    const kw = s.keyword ? `'${String(s.keyword).replace(/'/g, "\\'")}'` : 'null';
    w(`      ${l}: { titulo: '${titulo}', keyword: ${kw} },`);
  }
  w('    },');
  w('  },');
}
w('};');
w();
w('/**');
w(' * Ruta publica de una pagina en un idioma.');
w(' *   rutaDe("presentation", "es") -> "/es/presentacion/"');
w(' *   rutaDe("home", "en")         -> "/"');
w(' * Devuelve null si esa pagina no existe en ese idioma: no todas las paginas');
w(' * estan traducidas a todos los idiomas (el frances solo tiene 2).');
w(' */');
w('export function rutaDe(page: PageId, locale: Locale): string | null {');
w('  const def = PAGES[page];');
w('  const slug = def.slugs[locale];');
w('  if (slug === undefined) return null;');
w('  const prefijo = locale === DEFAULT_LOCALE ? "" : `/${locale}`;');
w('  return slug === "" ? `${prefijo}/` : `${prefijo}/${slug}/`;');
w('}');
w();
w('/**');
w(' * Idiomas en los que existe una pagina, para el hreflang y el selector.');
w(' * El x-default apunta al idioma predeterminado.');
w(' */');
w('export function idiomasDe(page: PageId): Locale[] {');
w('  return LOCALES.filter((l) => PAGES[page].slugs[l] !== undefined);');
w('}');
w();
w('/**');
w(' * Paginas que existen en un idioma, para generar rutas y el sitemap.');
w(' */');
w('export function paginasDe(locale: Locale): PageId[] {');
w('  return (Object.keys(PAGES) as PageId[]).filter((p) => PAGES[p].slugs[locale] !== undefined);');
w('}');
w();

fs.mkdirSync(DESTINO, { recursive: true });
const salida = path.join(DESTINO, 'config.ts');
fs.writeFileSync(salida, lineas.join('\n'), 'utf8');

console.log(`Escrito ${path.relative(ROOT, salida)}\n`);
console.log(`idiomas: ${locales.join(', ')} (predeterminado: ${DEFAULT_LOCALE}, el primero)`);
console.log(`paginas: ${paginas.length}`);
console.log('');
// La cabecera se construye del propio array: antes estaba escrita a mano y no
// coincidia con el orden real de las columnas.
console.log('  ' + 'id'.padEnd(21) + 'kind'.padEnd(12) + locales.join('  '));
console.log('  ' + '-'.repeat(74));
for (const p of paginas) {
  const s = locales.map((l) => (p.slugs[l] === undefined ? '(no)' : `/${p.slugs[l]}`)).join('  ');
  console.log(`  ${p.id.padEnd(21)} ${p.tipo.padEnd(11)} ${s}`);
}
console.log('');
const cobertura = locales.map((l) => `${l}: ${paginas.filter((p) => p.slugs[l] !== undefined).length}/${paginas.length}`);
console.log(`cobertura por idioma -> ${cobertura.join('   ')}`);
