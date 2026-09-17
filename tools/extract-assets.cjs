/*
 * Extrae del export los activos estructurados que necesita la reconstruccion,
 * en archivos sueltos y navegables:
 *
 *   reference/sliders/<alias>.json   — la config completa de cada slider de
 *                                      Slider Revolution (params + capas)
 *   reference/elementor/<slug>-<idioma>.json — los datos de Elementor por pagina
 *   reference/elementor/kit-global.json      — el kit (colores y tipografias)
 *   reference/manifest.json          — el manifiesto i18n del sitio: para cada
 *                                      grupo de traduccion, la relacion entre
 *                                      paginas, sus slugs por idioma y su SEO
 *
 * POR QUE EL MANIFIESTO IMPORTA
 *   Los grupos de traduccion de WPML (trid) son la fuente de verdad para las
 *   URLs del sitio: dan, sin adivinar, que pagina es la traduccion de cual y
 *   con que slug en cada idioma. Es lo que alimentara `src/i18n/config.ts`.
 *
 * Uso: node tools/extract-assets.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPORT = path.join(ROOT, 'reference', 'wp-export.json');
const SLIDERS = path.join(ROOT, 'reference', 'sliders');
const ELEMENTOR = path.join(ROOT, 'reference', 'elementor');

if (!fs.existsSync(EXPORT)) {
  console.error(`no existe ${path.relative(ROOT, EXPORT)}`);
  process.exit(2);
}
const j = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
fs.mkdirSync(SLIDERS, { recursive: true });
fs.mkdirSync(ELEMENTOR, { recursive: true });

const log = [];

// --- Sliders de Slider Revolution -----------------------------------------
// Se agrupan por slider: la tabla `revslider_sliders` da los params y la de
// slides las capas. Juntos son la materia prima para reconstruir sin el plugin.
const sliders = (j.sliders_revolution || []).filter((s) => s.tabla === 'revslider_sliders');
const slides = (j.sliders_revolution || []).filter((s) => s.tabla === 'revslider_slides');

for (const s of sliders) {
  const alias = s.alias || `slider-${s.id}`;
  const mios = slides.filter((x) => String(x.slider_id) === String(s.id));

  /*
   * SE DESCARTAN LAS DIAPOSITIVAS HUERFANAS.
   *
   * RevSlider 6 organiza las diapositivas en PADRE E HIJOS: el padre es la version
   * base (aqui, el espanol) y los hijos son sus variantes de idioma, enlazadas por
   * `child.parentId`. Los hijos declaran ademas su idioma en `child.language`.
   *
   * Cuando se borra un padre, sus hijos QUEDAN HUERFANOS: siguen en la base de
   * datos y el plugin YA NO LOS RENDERIZA, pero una extraccion ingenua se los lleva
   * todos. En el slider de banners eran 6 de 21 (tres versiones viejas en dos
   * idiomas), y era la causa de que se vieran 8 elementos donde el original tiene 5.
   *
   * El criterio es el correcto: una diapositiva es huerfana si declara un
   * `parentId` que no existe entre las de SU MISMO slider. No se borra por numero
   * ni por contenido —eso dejaria fuera a los hijos legitimos y a sus parejas de
   * idioma—, se borra por estructura.
   */
  const idsDelSlider = new Set(mios.map((x) => String(x.id)));
  const esHuerfana = (x) => {
    const p = x.params_decodificado || (x.params ? JSON.parse(x.params) : null);
    const child = p && p.child;
    return !!(child && child.parentId && !idsDelSlider.has(String(child.parentId)));
  };
  const utiles = mios.filter((x) => !esHuerfana(x));
  const huerfanas = mios.filter(esHuerfana);

  const salida = {
    id: s.id,
    alias,
    titulo: s.title,
    params: s.params_decodificado || null,
    total_slides: utiles.length,
    slides: utiles.map((x) => ({
      id: x.id,
      titulo: x.title,
      orden: x.slide_order,
      // El idioma y el padre vienen declarados por el plugin: no hay que deducirlos.
      idioma: (() => {
        const p = x.params_decodificado || (x.params ? JSON.parse(x.params) : null);
        return p && p.child ? p.child.language || null : null;
      })(),
      padre: (() => {
        const p = x.params_decodificado || (x.params ? JSON.parse(x.params) : null);
        return p && p.child ? p.child.parentId || null : null;
      })(),
      // `params` es la definicion de capas: posiciones, tiempos, easings
      params: x.params_decodificado || (x.params ? JSON.parse(x.params) : null),
      capas: x.layers ? JSON.parse(x.layers) : null,
    })),
  };
  if (huerfanas.length) {
    console.log(`  ${alias}: ${huerfanas.length} diapositivas HUERFANAS descartadas (de ${mios.length}): ${huerfanas.map((x) => x.id).join(', ')}`);
  }
  // Si el plugin serializo los params como string JSON anidado, se decodifica
  if (typeof salida.params === 'string') {
    try { salida.params = JSON.parse(salida.params); } catch (e) { /* se deja tal cual */ }
  }
  const destino = path.join(SLIDERS, `${alias}.json`);
  fs.writeFileSync(destino, JSON.stringify(salida, null, 2), 'utf8');
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  log.push(`  sliders/${alias}.json — ${mios.length} slides, ${kb} KB`);
}

// --- Datos de Elementor por pagina ----------------------------------------
for (const pg of j.paginas || []) {
  const datos = pg.elementor && pg.elementor.datos_crudos;
  if (!datos) continue;
  const idioma = (pg.idioma && pg.idioma.code) || 'xx';
  const nombre = `${pg.slug}-${idioma}.json`;
  let contenido = datos;
  // Se guarda el arbol ya parseado si se puede, para que sea util de verdad
  try { contenido = JSON.stringify(JSON.parse(datos), null, 2); } catch (e) { /* se guarda crudo */ }
  const destino = path.join(ELEMENTOR, nombre);
  fs.writeFileSync(destino, contenido, 'utf8');
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  log.push(`  elementor/${nombre} — ${kb} KB`);
}

// --- Kit global -----------------------------------------------------------
if (j.kit_global_elementor) {
  const destino = path.join(ELEMENTOR, 'kit-global.json');
  fs.writeFileSync(destino, JSON.stringify(j.kit_global_elementor, null, 2), 'utf8');
  log.push(`  elementor/kit-global.json — ${(fs.statSync(destino).size / 1024).toFixed(1)} KB`);
}

// --- Manifiesto i18n del sitio --------------------------------------------
// Agrupa por trid: es el mapa autoritativo pagina <-> traducciones.
const grupos = new Map();
for (const pg of j.paginas || []) {
  const trid = pg.idioma && pg.idioma.trid ? pg.idioma.trid : `suelta-${pg.id}`;
  if (!grupos.has(trid)) grupos.set(trid, []);
  grupos.get(trid).push(pg);
}

const idiomas = (j.idiomas || []).map((l) => ({
  code: l.code,
  locale: l.locale,
  nombre: l.name,
  predeterminado: !!l.es_predeterminado,
}));

const paginasManifiesto = [];
for (const [trid, pgs] of grupos) {
  const porIdioma = {};
  for (const pg of pgs) {
    const code = (pg.idioma && pg.idioma.code) || 'xx';
    porIdioma[code] = {
      id: pg.id,
      slug: pg.slug,
      url: pg.url,
      titulo: pg.titulo,
      tipo: pg.elementor && pg.elementor.es_builder ? 'elementor' : 'plana',
      seo: { titulo: pg.seo && pg.seo.titulo, focus_keyword: pg.seo && pg.seo.focus_keyword },
      bytes_contenido: (pg.contenido || '').length,
    };
  }
  paginasManifiesto.push({
    trid: Number.isNaN(Number(trid)) ? trid : Number(trid),
    idiomas_presentes: Object.keys(porIdioma),
    paginas: porIdioma,
  });
}

const manifiesto = {
  generado_de: 'reference/wp-export.json',
  sitio: j.meta.sitio,
  inicio: j.meta.inicio,
  tema: j.meta.tema,
  idiomas,
  paginas: paginasManifiesto.sort((a, b) => String(a.trid).localeCompare(String(b.trid))),
  menus: (j.menus || []).map((m) => ({ nombre: m.nombre, slug: m.slug, ubicaciones: m.ubicaciones, items: m.items.length })),
  aviso: 'Los items de menu del export NO reflejan lo que sirve el front-end: WPML los traduce al renderizar. Para la navegacion, la fuente de verdad es el HTML renderizado en reference/rendered/.',
};
fs.writeFileSync(path.join(ROOT, 'reference', 'manifest.json'), JSON.stringify(manifiesto, null, 2), 'utf8');
log.push(`  manifest.json — ${paginasManifiesto.length} grupos de traduccion, ${idiomas.length} idiomas`);

console.log('Extraido:');
console.log(log.join('\n'));
console.log(`\nGrupos de traduccion: ${paginasManifiesto.length}`);
for (const g of paginasManifiesto) {
  console.log(`  trid ${String(g.trid).padEnd(6)} ${g.idiomas_presentes.join(', ')}`);
}
