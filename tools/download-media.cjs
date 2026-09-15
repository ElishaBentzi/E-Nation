/*
 * Descarga los medios referenciados por el sitio original.
 *
 * POR QUE AHORA
 *   Los 90 medios solo existen en el WordPress original. Mientras el cutover no
 *   ocurra siguen accesibles, pero conviene tenerlos en local: la auditoria de
 *   "imagenes con texto" (que decide que se convierte en texto superpuesto) y la
 *   optimizacion con sharp se hacen sobre estos ficheros.
 *
 * QUE HACE
 *   Lee las URLs de `reference/wp-export.json` y las descarga replicando la
 *   estructura de `uploads/`, para que las rutas coincidan con el original.
 *   Es reanudable: lo que ya esta no se vuelve a pedir.
 *
 * Uso: node tools/download-media.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPORT = path.join(ROOT, 'reference', 'wp-export.json');
const DESTINO = path.join(ROOT, 'reference', 'uploads');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

if (!fs.existsSync(EXPORT)) {
  console.error(`no existe ${path.relative(ROOT, EXPORT)}`);
  process.exit(2);
}
const j = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));

// Se recogen tambien las imagenes destacadas, que no siempre estan en `medios`
const urls = new Set();
for (const m of j.medios || []) if (m.url) urls.add(m.url);
for (const p of j.paginas || []) {
  if (p.imagen_destacada && p.imagen_destacada.url) urls.add(p.imagen_destacada.url);
  for (const u of p.imagenes || []) urls.add(u);
}

/**
 * Expande una referencia del export a las URLs sueltas que contiene.
 *
 * El export trae dos formas mezcladas:
 *   - una URL normal
 *   - un `srcset` completo ("a.png 226w, https://.../b.png 66w, ..."), porque la
 *     expresion del extractor PHP no cortaba en las comas.
 *
 * Un srcset NO es basura: son las variantes responsivas que genero WordPress, y
 * entre ellas puede estar el tamano completo. Asi que se parsea en vez de
 * descartarlo.
 */
function expandir(ref) {
  if (!/[\s,]/.test(ref)) return [ref];
  const urls = [];
  // Cada entrada del srcset es "<url> <descriptor>", separadas por comas
  for (const trozo of ref.split(',')) {
    const m = trozo.trim().match(/^(https?:\/\/[^\s]+)/);
    if (m) urls.push(m[1]);
  }
  return urls;
}

/** Ruta local replicando la del original: .../uploads/2018/08/x.jpg */
function rutaLocal(u) {
  const m = u.match(/\/uploads\/([^\s?,]+)(\?|$)/);
  if (!m) return null;
  return path.join(DESTINO, decodeURIComponent(m[1]));
}

const lista = [];
const vistas = new Set();
let deSrcset = 0;
const porReferencia = { simple: 0, srcset: 0 };

for (const ref of urls) {
  const esSrcset = /[\s,]/.test(ref);
  porReferencia[esSrcset ? 'srcset' : 'simple']++;
  for (const u of expandir(ref)) {
    if (vistas.has(u)) continue;
    vistas.add(u);
    if (esSrcset) deSrcset++;
    const local = rutaLocal(u);
    if (local) lista.push({ url: u, local });
  }
}

console.log(`referencias en el export: ${urls.size} (simples: ${porReferencia.simple}, srcset: ${porReferencia.srcset})`);
console.log(`URLs sueltas tras expandir los srcset: ${vistas.size}`);
console.log(`ficheros unicos a descargar: ${lista.length}`);
console.log('');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let bajados = 0, yaEstaban = 0, fallos = 0, bytes = 0;
  const problemas = [];

  for (const { url, local } of lista) {
    if (fs.existsSync(local) && fs.statSync(local).size > 0) { yaEstaban++; continue; }
    fs.mkdirSync(path.dirname(local), { recursive: true });
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        fallos++;
        problemas.push({ url, status: res.status });
        await esperar(150);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(local, buf);
      bytes += buf.length;
      bajados++;
      await esperar(180); // cortesia con el servidor
    } catch (e) {
      fallos++;
      problemas.push({ url, error: String(e).slice(0, 60) });
      await esperar(150);
    }
  }

  console.log(`descargados: ${bajados} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`ya estaban:  ${yaEstaban}`);
  console.log(`fallos:      ${fallos}`);
  if (problemas.length) {
    console.log('\nproblemas:');
    for (const p of problemas.slice(0, 15)) console.log(`  ${p.status || p.error}  ${p.url.slice(0, 90)}`);
  }

  // Inventario por carpeta y extension, que es lo que necesita la auditoria
  const porCarpeta = {};
  const porExt = {};
  let total = 0, peso = 0;
  const recorrer = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { recorrer(p); continue; }
      const ext = path.extname(e.name).slice(1).toLowerCase();
      porExt[ext] = (porExt[ext] || 0) + 1;
      const rel = path.relative(DESTINO, path.dirname(p)).replace(/\\/g, '/');
      porCarpeta[rel] = (porCarpeta[rel] || 0) + 1;
      total++;
      peso += fs.statSync(p).size;
    }
  };
  recorrer(DESTINO);

  console.log(`\ninventario local: ${total} ficheros, ${(peso / 1024 / 1024).toFixed(1)} MB`);
  console.log('por extension: ' + Object.entries(porExt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
  console.log('por carpeta:');
  for (const [c, n] of Object.entries(porCarpeta).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(c).padEnd(12)} ${n}`);
  }
})();
