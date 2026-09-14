/*
 * Compara la navegacion de la home EN y la ES en el HTML RENDERIZADO.
 *
 * POR QUE
 *   El export de WordPress dice que hay 3 menus (uno por idioma, cosa de WPML)
 *   pero que los TRES apuntan a URLs en ingles. Si eso se confirma en el HTML
 *   servido, la navegacion del sitio en espanol lleva a las paginas inglesas, y
 *   es un defecto del original que hay que decidir si se replica o se corrige.
 *
 * Uso: node tools/compare-nav.cjs
 */
const fs = require('fs');
const path = require('path');

const RENDERED = path.resolve(__dirname, '..', 'reference', 'rendered');

/** Saca los enlaces del bloque de navegacion principal de un HTML. */
function navDe(archivo) {
  const h = fs.readFileSync(path.join(RENDERED, archivo), 'utf8');

  // The7 marca el menu con un <ul> que lleva id/class reconocible. Se prueban
  // varios y se toma el primero que exista.
  const patrones = [
    /<ul[^>]*id=["']primary-menu["'][^>]*>([\s\S]*?)<\/ul>/i,
    /<ul[^>]*class=["'][^"']*main-nav[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
    /<ul[^>]*id=["']main-nav["'][^>]*>([\s\S]*?)<\/ul>/i,
    /<nav[^>]*>([\s\S]*?)<\/nav>/i,
  ];
  let bloque = null;
  let usado = null;
  for (const p of patrones) {
    const m = h.match(p);
    if (m) { bloque = m[1]; usado = String(p).slice(0, 60); break; }
  }
  if (!bloque) return { archivo, error: 'no se encontro el bloque de navegacion', usado: null, enlaces: [] };

  const enlaces = [];
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(bloque)) !== null) {
    const texto = m[2].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    enlaces.push({ href: m[1], texto });
  }
  return { archivo, error: null, usado, enlaces };
}

const a = navDe('home-en.html');
const b = navDe('home-es.html');

for (const r of [a, b]) {
  console.log(`\n=== ${r.archivo} ===`);
  if (r.error) { console.log(`  ${r.error}`); continue; }
  console.log(`  patron usado: ${r.usado}`);
  console.log(`  ${r.enlaces.length} enlaces:`);
  for (const e of r.enlaces.slice(0, 16)) {
    console.log(`    ${String(e.texto || '(sin texto)').slice(0, 26).padEnd(28)} -> ${e.href.slice(0, 70)}`);
  }
}

// El dato que importa: ¿la navegacion del ES apunta a rutas en español?
console.log('\n\n=== DIAGNOSTICO ===\n');
const esEnlaces = b.enlaces.filter((e) => !/^https?:\/\/(www\.)?(docs|unitycoin)/.test(e.href));
const conPrefijoEs = esEnlaces.filter((e) => e.href.includes('/es/'));
const sinPrefijo = esEnlaces.filter((e) => !e.href.includes('/es/') && !/^https?:/.test(e.href.replace(/https?:\/\/e-nation\.org/, '')));

console.log(`enlaces internos del menu ES: ${esEnlaces.length}`);
console.log(`  con prefijo /es/: ${conPrefijoEs.length}`);
console.log(`  SIN prefijo (apuntan a la version inglesa): ${esEnlaces.length - conPrefijoEs.length}`);
if (conPrefijoEs.length === 0 && esEnlaces.length > 0) {
  console.log('\n  CONFIRMADO: el menu del sitio en español apunta a las paginas en INGLES.');
  console.log('  Es un defecto del original (los menus de WPML no se sincronizaron).');
} else if (conPrefijoEs.length > 0) {
  console.log('\n  El menu ES SI tiene enlaces a /es/: el export de WP menu no reflejaba');
  console.log('  lo que sirve el front-end. Revisar por que.');
}
