/*
 * Analiza wp-export.json y reporta ESTRUCTURA Y METRICAS, no contenido.
 *
 * POR QUE SOLO METRICAS
 *   El export incluye la politica de privacidad y los terminos y condiciones.
 *   Ese texto no debe pasar por el chat, ni citado, ni a un subagente: dispara
 *   falsos positivos de filtros de seguridad. Este script informa de tamanos,
 *   conteos, claves y relaciones, pero NO imprime el cuerpo de las paginas.
 *
 *   Las cadenas cortas que SI imprime (titulos de pagina, focus keywords de
 *   Rank Math, nombres de widgets, slugs) son informacion publica de una linea
 *   que ya aparece en Google, no el cuerpo legal.
 *
 * Uso: node tools/analyze-export.cjs [ruta]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// El export vive en reference/, que esta ignorado por git. Se comprueba tambien
// la raiz porque si alguien lo deja ahi, git lo veria y el repositorio es
// PUBLICO: el archivo contiene la politica de privacidad y los terminos.
const enRaiz = path.join(ROOT, 'wp-export.json');
if (fs.existsSync(enRaiz)) {
  console.error('AVISO: hay un wp-export.json en la RAIZ del proyecto y git NO lo ignora.');
  console.error('El repositorio es publico y ese archivo contiene las paginas legales.');
  console.error(`Muevelo:  mv wp-export.json reference/wp-export.json`);
  console.error('');
}

const porDefecto = path.join(ROOT, 'reference', 'wp-export.json');
const ruta = process.argv[2] || (fs.existsSync(porDefecto) ? porDefecto : enRaiz);
if (!fs.existsSync(ruta)) {
  console.error(`no existe el export. Buscado en:`);
  console.error(`  ${porDefecto}`);
  console.error(`  ${enRaiz}`);
  process.exit(2);
}
console.error(`Analizando ${path.relative(ROOT, ruta)} (${(fs.statSync(ruta).size / 1024 / 1024).toFixed(2)} MB)\n`);

const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const p = (s = '') => console.log(s);

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## IDIOMAS Y GRUPOS DE TRADUCCION');
p('#'.repeat(78));
p();
p('Idiomas configurados:');
for (const l of j.idiomas || []) {
  p(`  ${String(l.code).padEnd(5)} ${String(l.name).padEnd(22)} ${l.locale || ''}${l.es_predeterminado ? '  [PREDETERMINADO]' : ''}`);
}
p();

// Agrupa por trid: es el manifiesto de traduccion del sitio, la fuente de verdad
// para las URLs y los slugs traducidos.
const grupos = new Map();
for (const pg of j.paginas || []) {
  const trid = pg.idioma && pg.idioma.trid ? pg.idioma.trid : `solo-${pg.id}`;
  if (!grupos.has(trid)) grupos.set(trid, []);
  grupos.get(trid).push(pg);
}
p(`Grupos de traduccion (trid) encontrados: ${grupos.size}`);
p();
p('  trid     idiomas  slugs por idioma');
p('  ' + '-'.repeat(96));
const ordenados = [...grupos.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [trid, pgs] of ordenados) {
  const porIdioma = pgs.map((x) => `${(x.idioma && x.idioma.code) || '?'}:${x.slug || '(sin slug)'}`);
  p(`  ${String(trid).padEnd(8)} ${String(pgs.length).padEnd(8)} ${porIdioma.join('  ')}`);
}
p();

p('Cobertura por idioma (cuantas paginas tiene cada uno):');
const porIdioma = {};
for (const pg of j.paginas || []) {
  const c = (pg.idioma && pg.idioma.code) || '(sin idioma)';
  porIdioma[c] = (porIdioma[c] || 0) + 1;
}
for (const [c, n] of Object.entries(porIdioma).sort((a, b) => b[1] - a[1])) p(`  ${String(c).padEnd(6)} ${n} paginas`);
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## PAGINAS: estructura y SEO (sin el cuerpo)');
p('#'.repeat(78));
p();
p('  id     idioma  slug                          contenido  elemento  tipo                            plantilla');
p('  ' + '-'.repeat(118));
const paginas = (j.paginas || []).slice().sort((a, b) => {
  const ia = (a.idioma && a.idioma.code) || ''; const ib = (b.idioma && b.idioma.code) || '';
  return ia.localeCompare(ib) || String(a.slug).localeCompare(String(b.slug));
});
for (const pg of paginas) {
  const cuerpo = (pg.contenido || '').length;
  const el = pg.elementor && pg.elementor.datos_crudos ? pg.elementor.datos_crudos.length : 0;
  const tipo = pg.elementor && pg.elementor.es_builder ? 'elementor' : 'plana';
  p(`  ${String(pg.id).padEnd(6)} ${String((pg.idioma && pg.idioma.code) || '?').padEnd(7)} ${String(pg.slug).padEnd(30)} ${String(cuerpo).padStart(8)}  ${String(el).padStart(8)}  ${tipo.padEnd(30)} ${pg.plantilla || ''}`);
}
p();
p(`Total de contenido en post_content: ${(j.paginas || []).reduce((a, x) => a + (x.contenido || '').length, 0)} bytes`);
p(`Total de datos de Elementor:        ${(j.paginas || []).reduce((a, x) => a + (x.elementor && x.elementor.datos_crudos ? x.elementor.datos_crudos.length : 0), 0)} bytes`);
p();

p('SEO de Rank Math (titulo y focus keyword; es lo que Google ya muestra):');
p();
p('  idioma  slug                          focus keyword              titulo SEO');
p('  ' + '-'.repeat(120));
for (const pg of paginas) {
  const seo = pg.seo || {};
  const fk = seo.focus_keyword || '(vacia)';
  const t = (seo.titulo || '').slice(0, 46);
  p(`  ${String((pg.idioma && pg.idioma.code) || '?').padEnd(7)} ${String(pg.slug).padEnd(30)} ${String(fk).slice(0, 26).padEnd(26)} ${t}`);
}
p();
const sinKeyword = paginas.filter((x) => !(x.seo && x.seo.focus_keyword)).length;
p(`Paginas SIN focus keyword definida: ${sinKeyword} de ${paginas.length}`);
p(`Las que si la tienen: ${ [...new Set(paginas.filter((x) => x.seo && x.seo.focus_keyword).map((x) => x.seo.focus_keyword))].length} keywords distintas`);
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## KIT GLOBAL DE ELEMENTOR (los tokens de marca REALES)');
p('#'.repeat(78));
p();
const kit = j.kit_global_elementor;
if (!kit || !kit.ajustes) {
  p('  NO capturado. Sin esto la paleta hay que sacarla del CSS (ver TOKENS.md).');
} else {
  const a = kit.ajustes;
  const colores = Object.keys(a).filter((k) => /^system_colors$/.test(k) || /^custom_colors$/.test(k) || /color/.test(k));
  p(`  claves del kit: ${Object.keys(a).length}`);
  for (const k of Object.keys(a)) {
    if (/^system_colors$|^custom_colors$/.test(k) && Array.isArray(a[k])) {
      p(`  ${k}: ${a[k].length} entradas`);
      for (const c of a[k]) {
        if (c && typeof c === 'object') p(`      ${String(c._id || '').padEnd(10)} ${String(c.title || '').padEnd(18)} ${c.color || ''}`);
      }
    } else if (/^system_typography$|^custom_typography$/.test(k) && Array.isArray(a[k])) {
      p(`  ${k}: ${a[k].length} entradas`);
      for (const t of a[k]) {
        if (t && typeof t === 'object') {
          const f = t.typography_font_family || t.typography_font_weight || '';
          p(`      ${String(t._id || '').padEnd(10)} ${String(t.title || '').padEnd(18)} ${f} ${t.typography_font_size && t.typography_font_size.size ? t.typography_font_size.size + (t.typography_font_size.unit || '') : ''}`);
        }
      }
    }
  }
}
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## WIDGETS DE ELEMENTOR: inventario de lo que hay que reconstruir');
p('#'.repeat(78));
p();
const inv = Object.entries(j.inventario_widgets || {}).sort((a, b) => b[1] - a[1]);
for (const [t, n] of inv) p(`  ${String(t).padEnd(28)} ${String(n).padStart(4)}`);
p(`  ${'TOTAL'.padEnd(28)} ${String(inv.reduce((a, x) => a + x[1], 0)).padStart(4)}`);
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## EFECTOS: que técnica usa cada uno');
p('#'.repeat(78));
p();
const porAnim = {};
for (const a of j.animaciones || []) {
  const k = a.animacion || '(desconocida)';
  porAnim[k] = (porAnim[k] || 0) + 1;
}
p('  animacion                     apariciones');
p('  ' + '-'.repeat(50));
for (const [k, n] of Object.entries(porAnim).sort((a, b) => b[1] - a[1])) p(`  ${k.padEnd(30)} ${String(n).padStart(4)}`);
p();

const fondos = (j.animaciones || []).filter((a) => a.animacion === 'background' && a.detalle_fondo);
if (fondos.length) {
  const porAttach = {};
  for (const f of fondos) {
    const k = f.detalle_fondo.attachment || '(sin declarar)';
    porAttach[k] = (porAttach[k] || 0) + 1;
  }
  p('  De los fondos, por background-attachment declarado:');
  for (const [k, n] of Object.entries(porAttach).sort((a, b) => b[1] - a[1])) p(`    ${k.padEnd(24)} ${n}`);
  p();
  p('  OJO: esto es lo DECLARADO en Elementor. El valor efectivo puede pisarlo el');
  p('  tema o el CSS de la pagina, asi que se confirma midiendo en el navegador.');
  p();
}

const motion = (j.animaciones || []).filter((a) => a.animacion === 'motion_fx_scrolling');
if (motion.length) {
  p(`  Elementos con motion_fx (desplazamiento por JS): ${motion.length}`);
  const velocidades = {};
  for (const m of motion) {
    const v = m.detalle_motion && m.detalle_motion.velocidad != null ? m.detalle_motion.velocidad : '(sin velocidad)';
    velocidades[v] = (velocidades[v] || 0) + 1;
  }
  for (const [k, n] of Object.entries(velocidades).sort((a, b) => b[1] - a[1]).slice(0, 8)) p(`    velocidad ${String(k).padEnd(12)} ${n}`);
  p();
}

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## SLIDERS DE SLIDER REVOLUTION');
p('#'.repeat(78));
p();
const sl = j.sliders_revolution || [];
const porTabla = {};
for (const s of sl) porTabla[s.tabla] = (porTabla[s.tabla] || 0) + 1;
for (const [t, n] of Object.entries(porTabla)) p(`  ${t}: ${n} filas`);
p();
for (const s of sl) {
  if (s.tabla !== 'revslider_sliders') continue;
  const params = s.params_decodificado || {};
  p(`  slider id=${s.id} alias="${s.alias || ''}" titulo="${(s.title || '').slice(0, 40)}"`);
  if (params.slideStageWidth) p(`     escenario: ${params.slideStageWidth}x${params.slideStageHeight} (${params.slideStageDimensions || ''})`);
  if (params.sliderType) p(`     tipo: ${params.sliderType}, layout: ${params.sliderLayout || ''}`);
  if (params.navigation) {
    const nav = Object.entries(params.navigation).filter(([, v]) => v && v !== 'false' && v !== false).map(([k]) => k);
    if (nav.length) p(`     navegacion activa: ${nav.slice(0, 8).join(', ')}`);
  }
}
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## MEDIOS');
p('#'.repeat(78));
p();
const medios = j.medios || [];
p(`  imagenes distintas referenciadas: ${medios.length}`);
const porCarpeta = {};
const porExt = {};
for (const m of medios) {
  const u = m.url || '';
  const ext = (u.match(/\.([a-z0-9]+)(\?|$)/i) || [])[1] || '?';
  porExt[ext.toLowerCase()] = (porExt[ext.toLowerCase()] || 0) + 1;
  const carpeta = (u.match(/uploads\/(\d{4})\/(\d{2})/) || []).slice(1).join('/') || '(otra)';
  porCarpeta[carpeta] = (porCarpeta[carpeta] || 0) + 1;
}
p('  por extension: ' + Object.entries(porExt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
p('  por carpeta de subida:');
for (const [c, n] of Object.entries(porCarpeta).sort((a, b) => b[1] - a[1]).slice(0, 12)) p(`    ${String(c).padEnd(12)} ${n}`);
p();

// ---------------------------------------------------------------------------
p('#'.repeat(78));
p('## MENUS');
p('#'.repeat(78));
p();
for (const m of j.menus || []) {
  p(`  "${m.nombre}" (${m.slug}) — ${m.items.length} items, ubicaciones: ${(m.ubicaciones || []).join(', ') || '(ninguna)'}`);
  for (const it of m.items.slice(0, 14)) {
    const idioma = it.idioma ? it.idioma.code : '?';
    p(`      [${idioma}] ${String(it.titulo).slice(0, 28).padEnd(30)} -> ${String(it.url).slice(0, 58)}`);
  }
  if (m.items.length > 14) p(`      ... y ${m.items.length - 14} mas`);
}
