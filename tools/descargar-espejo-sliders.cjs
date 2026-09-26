/*
 * DESCARGA EL ESPEJO de las imagenes de los sliders.
 *
 * POR QUE EXISTE
 *   El generador reescribe las imagenes de e-nation.org a `/images/...` para servir
 *   las ours en vez de enlazar al original (hotlinking). Las que falten en disco se
 *   traen de aqui. Las de OTROS dominios se quedan absolutas a proposito: son de los
 *   proyectos hermanos.
 *
 * Uso:  node tools/descargar-espejo-sliders.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'astro-site', 'src', 'sliders');
const PUBLICO = path.join(RAIZ, 'astro-site', 'public');

const pendientes = new Map();
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.json')) continue;
  const j = fs.readFileSync(path.join(DIR, f), 'utf8');
  for (const m of j.matchAll(/"(\/images\/[^"]+)"/g)) {
    const ruta = m[1];
    if (!pendientes.has(ruta)) {
      pendientes.set(ruta, `https://e-nation.org/zero/wp-content/uploads/${ruta.slice('/images/'.length)}`);
    }
  }
}

console.log(`rutas /images/ en las configs de sliders: ${pendientes.size}`);
let bajadas = 0, ya = 0, fallos = 0;

(async () => {
  for (const [ruta, origen] of pendientes) {
    const destino = path.join(PUBLICO, ruta);
    if (fs.existsSync(destino)) { ya++; continue; }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    try {
      const r = await fetch(origen);
      if (!r.ok) { console.log(`  sin descarga (${r.status}): ${ruta}`); fallos++; continue; }
      fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      bajadas++;
    } catch (e) {
      console.log(`  sin descarga (${String(e.message).slice(0, 40)}): ${ruta}`);
      fallos++;
    }
  }
  console.log(`ya estaban: ${ya}   descargadas: ${bajadas}   fallos: ${fallos}`);
})();
