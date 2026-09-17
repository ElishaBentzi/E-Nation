/*
 * Prepara la auditoria de imagenes: reduce los 112 ficheros a las imagenes
 * UNICAS, saca sus dimensiones reales y determina su PAPEL en la pagina.
 *
 * POR QUE EL PAPEL ES LO QUE MAS DESCARTA
 *   Una imagen usada como fondo de seccion es decorativa: no lleva texto que
 *   traducir, y su papel lo dice el propio diseno. Una imagen de contenido o un
 *   logo son otra cosa. Clasificar por papel evita mirar una por una las que no
 *   pueden tener texto.
 *
 * Dimensiones sin dependencias: se leen las cabeceras PNG (IHDR), JPEG (marcador
 * SOF) y GIF a mano. Instalar sharp para esto seria desproporcionado.
 *
 * Uso: node tools/audit-images.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'reference', 'uploads');
const EXPORT = path.join(ROOT, 'reference', 'wp-export.json');

// --- Dimensiones leyendo la cabecera del fichero ---------------------------
function dimensiones(abs) {
  const b = fs.readFileSync(abs);
  // PNG: firma de 8 bytes + longitud + "IHDR" + ancho + alto (big endian)
  if (b.length > 24 && b.slice(1, 4).toString() === 'PNG') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), tipo: 'png' };
  }
  // GIF: "GIF87a"/"GIF89a", ancho y alto en little endian de 16 bits
  if (b.slice(0, 3).toString() === 'GIF') {
    return { w: b.readUInt16LE(6), h: b.readUInt16LE(8), tipo: 'gif' };
  }
  // JPEG: se recorren los marcadores hasta encontrar un SOF (inicio de frame)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const marca = b[i + 1];
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), tipo: 'jpg' };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return { w: null, h: null, tipo: path.extname(abs).slice(1).toLowerCase() };
}

/** Nombre base sin el sufijo de tamano que anade WordPress: "x-300x200.png" -> "x.png" */
function base(nombre) {
  return nombre.replace(/-\d+x\d+(?=\.\w+$)/, '');
}

// --- Contexto: en que paginas se usa cada imagen y con que papel -----------
//
// EL PAPEL SE DEDUCE DEL HTML RENDERIZADO, no del JSON de Elementor. Intentarlo
// con expresiones sobre el JSON resulto fragil (las claves y el orden varian y
// no encontraba los roles). En el HTML servido la distincion es inequivoca:
//   <img src="...">            -> imagen de CONTENIDO
//   background-image: url(...)  -> DECORATIVA (fondo de seccion o banner)
// Es la misma distincion que importa para la auditoria: una decorativa no lleva
// texto que traducir.
const j = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
const uso = new Map(); // NOMBRE BASE -> { paginas:Set, papeles:Set }

const RENDERED = path.join(ROOT, 'reference', 'rendered');

const anota = (url, paginas, papel) => {
  const m = String(url).match(/\/uploads\/([^\s?,]+)/);
  if (!m) return;
  const f = base(decodeURIComponent(m[1]).split('/').pop());
  if (!uso.has(f)) uso.set(f, { paginas: new Set(), papeles: new Set() });
  const r = uso.get(f);
  (Array.isArray(paginas) ? paginas : [paginas]).forEach((p) => r.paginas.add(p));
  r.papeles.add(papel);
};

if (fs.existsSync(RENDERED)) {
  for (const f of fs.readdirSync(RENDERED)) {
    if (!f.endsWith('.html')) continue;
    const pagina = f.replace(/\.html$/, '');
    const html = fs.readFileSync(path.join(RENDERED, f), 'utf8');

    // Contenido: atributos src/srcset de etiquetas img
    for (const m of html.matchAll(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/gi)) {
      anota(m[1], pagina, 'contenido');
    }
    // Decorativas: fondos declarados en el CSS inline o en style=""
    for (const m of html.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi)) {
      anota(m[1], pagina, 'decorativa (fondo)');
    }
    // Fondos diferidos por WP Rocket: guardan la URL en un atributo data-*
    for (const m of html.matchAll(/data-bg=["']([^"']+)["']/gi)) {
      anota(m[1], pagina, 'decorativa (fondo)');
    }
  }
}

// Los fondos de seccion NO estan en el HTML: viven en el CSS EXTERNO de Elementor
// (uploads/elementor/css/post-*.css) y en el del tema. Sin mirar ahi, todas las
// imagenes de fondo se clasifican como contenido por error.
const CSSDIR = path.join(ROOT, 'reference', 'css');
const recorrerCss = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { recorrerCss(p); continue; }
    if (!/\.css$/i.test(e.name)) continue;
    const css = fs.readFileSync(p, 'utf8');
    const esElementorDePagina = /uploads[\\/]elementor[\\/]css[\\/]post-\d+\.css$/i.test(p);
    const esTema = /the7-css/i.test(p);
    if (!esElementorDePagina && !esTema) continue;
    for (const m of css.matchAll(/background(?:-image)?:[^;{}]*url\(["']?([^"')]+)["']?\)/gi)) {
      anota(m[1], esElementorDePagina ? 'css de pagina (Elementor)' : 'css del tema', 'decorativa (fondo)');
    }
  }
};
if (fs.existsSync(CSSDIR)) recorrerCss(CSSDIR);

// Red de seguridad: lo que aparezca en `medios` del export y no se haya visto en
// el HTML queda como "referenciada sin papel claro", para no perderlo.
for (const m of j.medios || []) anota(m.url, m.pagina || '?', 'referenciada (papel sin determinar)');

// --- Recorrido del disco ---------------------------------------------------
const ficheros = [];
const recorrer = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { recorrer(p); continue; }
    ficheros.push(p);
  }
};
recorrer(UPLOADS);

const imagenes = ficheros.map((abs) => {
  const nombre = path.basename(abs);
  const dim = dimensiones(abs);
  const info = uso.get(nombre);
  const kb = Math.round(fs.statSync(abs).size / 1024);
  return {
    nombre,
    base: base(nombre),
    rel: path.relative(UPLOADS, abs).replace(/\\/g, '/'),
    ...dim,
    kb,
    variante: nombre !== base(nombre),
    paginas: info ? [...info.paginas].slice(0, 3) : [],
    papeles: info ? [...info.papeles] : ['(no referenciada)'],
  };
});

// --- Agrupacion por imagen base -------------------------------------------
const porBase = new Map();
for (const im of imagenes) {
  if (!porBase.has(im.base)) porBase.set(im.base, []);
  porBase.get(im.base).push(im);
}

const lineas = [];
const p = (s = '') => lineas.push(s);

p('# Auditoría de imágenes: qué es cada una y para qué se usa');
p();
p(`Generado con \`tools/audit-images.cjs\` sobre ${imagenes.length} ficheros.`);
p();
p('## Resumen');
p();
p(`- Ficheros en disco: **${imagenes.length}**`);
p(`- Imágenes únicas (sin contar las variantes de tamaño de WordPress): **${porBase.size}**`);
p(`- Variantes de tamaño: ${imagenes.filter((i) => i.variante).length}`);
p();
const papeles = {};
for (const im of imagenes) for (const r of im.papeles) papeles[r] = (papeles[r] || 0) + 1;
p('Papel declarado (un fichero puede tener varios):');
p();
p('| papel | ficheros |');
p('|---|---|');
for (const [k, v] of Object.entries(papeles).sort((a, b) => b[1] - a[1])) p(`| ${k} | ${v} |`);
p();
p('> **Las que son fondo de sección o overlay son decorativas**: no llevan texto que');
p('> traducir, y eso no hay que mirarlo, lo dice el diseño. Solo las de **contenido** y');
p('> los **logotipos** pueden necesitar conversión a texto superpuesto.');
p();

// Las que hay que mirar con vision: contenido o sin papel claro
const aMirar = imagenes.filter((i) => !i.variante && (i.papeles.includes('contenido') || i.papeles.includes('(no referenciada)')));
const soloFondo = imagenes.filter((i) => !i.variante && i.papeles.includes('fondo de seccion') && !i.papeles.includes('contenido'));

p('## Imágenes de contenido (candidatas a revisión visual)');
p();
p(`**${aMirar.length}** imágenes únicas, tras excluir las que son solo fondo de sección.`);
p();
p('| fichero | dim | KB | papel | páginas |');
p('|---|---|---|---|---|');
for (const i of aMirar.sort((a, b) => b.kb - a.kb)) {
  p(`| \`${i.nombre}\` | ${i.w}×${i.h} | ${i.kb} | ${i.papeles.join(', ')} | ${i.paginas.join(', ') || '—'} |`);
}
p();
p('## Solo fondo de sección (decorativas, no hace falta mirarlas)');
p();
p(`**${soloFondo.length}** imágenes.`);
p();
for (const i of soloFondo.sort((a, b) => b.kb - a.kb)) {
  p(`- \`${i.nombre}\` — ${i.w}×${i.h}, ${i.kb} KB`);
}
p();
p('## Dimensiones sospechosas de ser un logotipo o un gráfico con texto');
p();
p('Se marcan las de proporción muy apaisada o muy cuadrada y tamaño pequeño, que es');
p('el patrón de un logo o un sello. No es una clasificación, es un filtro para la');
p('revisión visual.');
p();
const sospechosas = imagenes.filter((i) => !i.variante && i.w && (i.w / i.h > 3 || (i.w < 400 && i.h < 400)));
p('| fichero | dim | KB | papel |');
p('|---|---|---|---|');
for (const i of sospechosas.sort((a, b) => b.kb - a.kb).slice(0, 30)) {
  p(`| \`${i.nombre}\` | ${i.w}×${i.h} | ${i.kb} | ${i.papeles.join(', ')} |`);
}
p();

const salida = path.join(ROOT, 'reference', 'AUDITORIA-IMAGENES.md');
fs.writeFileSync(salida, lineas.join('\n') + '\n', 'utf8');

// Lista en JSON de las imagenes de CONTENIDO que hay que revisar con vision, para
// que el revisor reciba rutas concretas y no tenga que interpretar el informe.
const contenido = imagenes
  .filter((i) => !i.variante && i.papeles.includes('contenido'))
  .sort((a, b) => b.kb - a.kb)
  .map((i) => ({ nombre: i.nombre, rel: i.rel, ruta: path.join(UPLOADS, i.rel).replace(/\\/g, '/'), dim: `${i.w}x${i.h}`, kb: i.kb, paginas: i.paginas }));
fs.writeFileSync(path.join(ROOT, 'reference', 'imagenes-contenido.json'), JSON.stringify(contenido, null, 2), 'utf8');
console.log(`Escrito reference/imagenes-contenido.json (${contenido.length} imagenes)`);

console.log(`Escrito ${path.relative(ROOT, salida)}\n`);
console.log(`ficheros: ${imagenes.length} | unicas: ${porBase.size} | variantes: ${imagenes.filter((i) => i.variante).length}`);
console.log('\npapel:');
for (const [k, v] of Object.entries(papeles).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`\npara revisar con vision (contenido): ${aMirar.length}`);
console.log(`solo fondo, decorativas: ${soloFondo.length}`);
console.log('\nlas 12 mas pesadas de contenido:');
for (const i of aMirar.sort((a, b) => b.kb - a.kb).slice(0, 12)) {
  console.log(`  ${String(i.nombre).padEnd(42)} ${i.w}x${i.h}  ${String(i.kb).padStart(5)} KB  ${i.papeles.join('/')}`);
}
