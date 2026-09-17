/*
 * Sonda: de donde sale el `font-weight` de una capa de texto.
 *
 * El original renderiza 400 y nuestra config manda 900, asi que hay que ver las
 * TRES fuentes de la cascada para saber cual miente:
 *   1. el `idle` de la capa en el volcado crudo de WordPress,
 *   2. el marcado YA RENDERIZADO por el plugin,
 *   3. el preset de estilo (`revslider_css`).
 */
const fs = require('node:fs');
const path = require('node:path');

const TEXTO = process.argv[2] || 'A Social and Economic Model to bring';
const RAIZ = path.join(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'wp-export.json'), 'utf8'));

// --- 1. La capa en el volcado de WordPress -------------------------------
const filas = raw.sliders_revolution || [];
const fila = filas.find((t) => JSON.stringify(t).includes(TEXTO));
console.log('=== 1. VOLCADO DE WORDPRESS ===');
console.log('  tabla:', fila ? fila.tabla : 'NO ENCONTRADA');

const recorrer = (o, visita) => {
  if (o === null || o === undefined) return;
  if (typeof o === 'string') return visita(o);
  if (Array.isArray(o)) return o.forEach((x) => recorrer(x, visita));
  if (typeof o === 'object') return Object.values(o).forEach((x) => recorrer(x, visita));
};

if (fila) {
  const p = fila.params_decodificado || (fila.params ? JSON.parse(fila.params) : null);
  let etiqueta = null;
  recorrer(p, (s) => {
    if (etiqueta || !s.includes(TEXTO)) return;
    const m = s.replace(/\\n/g, ' ').match(/<rs-layer[^>]*>/);
    if (m) etiqueta = m[0];
  });
  if (etiqueta) {
    // Se muestran solo los atributos que deciden la tipografia
    for (const attr of ['id', 'data-fontweight', 'data-fontsize', 'data-lineheight', 'data-letterspacing', 'data-style', 'data-color']) {
      const m = etiqueta.match(new RegExp(attr + '="([^"]*)"'));
      if (m) console.log('  ' + attr.padEnd(20), '=', m[1]);
    }
    const estilo = etiqueta.match(/style="([^"]*)"/);
    if (estilo) {
      const fw = estilo[1].match(/font-weight:\s*([^;]*)/);
      console.log('  ' + 'style/font-weight'.padEnd(20), '=', fw ? fw[1] : '(no declarado)');
    }
  } else {
    console.log('  (no se localizo la etiqueta <rs-layer> en el volcado)');
  }

  // El `idle` de la capa, que es la primera fuente de la cascada
  const idle = JSON.stringify(p).match(/"fontWeight"\s*:\s*"([^"]*)"/g);
  console.log('  apariciones de "fontWeight" en el JSON de la diapositiva:', idle ? idle.length : 0);
  if (idle) console.log('   ', [...new Set(idle)].slice(0, 8).join('  '));
}

// --- 2. El marcado renderizado -------------------------------------------
const rendered = path.join(RAIZ, 'reference', 'rendered', 'presentation-en.html');
if (fs.existsSync(rendered)) {
  const h = fs.readFileSync(rendered, 'utf8');
  const i = h.indexOf(TEXTO);
  console.log('');
  console.log('=== 2. MARCADO RENDERIZADO ===');
  if (i < 0) {
    console.log('  el texto no aparece en el marcado (el plugin no renderiza todas las diapositivas de entrada)');
  } else {
    const trozo = h.slice(Math.max(0, i - 1500), i);
    const m = [...trozo.matchAll(/<rs-layer[^>]*>/g)].pop();
    if (m) {
      for (const attr of ['data-fontweight', 'data-fontsize', 'data-lineheight', 'data-letterspacing', 'data-style']) {
        const v = m[0].match(new RegExp(attr + '="([^"]*)"'));
        if (v) console.log('  ' + attr.padEnd(20), '=', v[1]);
      }
    } else {
      console.log('  (no se encontro la etiqueta rs-layer anterior al texto)');
    }
  }
} else {
  console.log('');
  console.log('=== 2. MARCADO RENDERIZADO ===');
  console.log('  no existe', rendered);
}
