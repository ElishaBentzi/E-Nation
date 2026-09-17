/*
 * Extrae la configuracion de los sliders DESDE EL MARKUP RENDERIZADO.
 *
 * POR QUE ESTA FUENTE Y NO LA BASE DE DATOS
 *   El primer extractor leia la configuracion de las tablas del plugin. Funciona,
 *   pero exige deducir que significa cada valor ausente, y ahi me equivoque: di por
 *   hecho `center`/`middle` cuando el anclaje venia vacio, y eso mando 162 capas
 *   fuera de sitio.
 *
 *   El marcado que el plugin GENERA ya trae los valores por defecto aplicados, en
 *   un formato compacto y legible:
 *
 *     <rs-slide data-link="//sbmjuegos.com" data-target="_blank" data-duration="5000">
 *       <rs-layer data-type="text"
 *                 data-xy="x:34px;y:202px;"        <- posicion, con x resuelto
 *                 data-color="#ffffff"
 *                 data-text="w:normal;s:39;l:35;ls:0px;fw:700;"   <- tipografia
 *                 data-dim="w:665px;"
 *                 data-frame_0="tp:600;"           <- animacion de entrada
 *                 data-frame_1="tp:600;st:910;sp:1000;sR:910;">
 *
 *   Con esto no hay que interpretar: se lee.
 *
 * El lienzo (ancho x alto) SI se toma de la config del plugin, porque el marcado
 * no lo declara; esta verificado en reference/sliders/*.json.
 *
 * Uso: node tools/revslider-markup-to-config.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RENDERED = path.join(ROOT, 'reference', 'rendered');
const CONFIGS = path.join(ROOT, 'reference', 'sliders');
const DESTINO = path.join(ROOT, 'astro-site', 'src', 'sliders');

// id de modulo de RevSlider -> alias, segun lo medido en el original.
const ALIAS_POR_ID = {
  17: 'banner-publicidad',
  18: 'e-nation',
  19: 'vertical-horizontal',
  20: 'snake',
};

/** Convierte "s:39;l:35;fw:700;ls:0px;" en un objeto. */
function pares(valor) {
  const out = {};
  for (const trozo of String(valor || '').split(';')) {
    const i = trozo.indexOf(':');
    if (i < 1) continue;
    out[trozo.slice(0, i).trim()] = trozo.slice(i + 1).trim();
  }
  return out;
}

/** Lee los atributos data-* de una etiqueta. */
function datos(etiqueta) {
  const out = {};
  for (const m of String(etiqueta).matchAll(/data-([a-z_0-9]+)\s*=\s*"([^"]*)"/gi)) {
    out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

/**
 * Tipografia de una capa.
 *   s  = tamaño de fuente en px
 *   l  = interlineado
 *   fw = grosor
 *   ls = espaciado entre letras
 *   a  = alineacion
 */
function tipografia(d) {
  const t = pares(d.text);
  const t2 = pares(d.text2);
  const num = (v) => {
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? null : n;
  };
  return {
    tamano: num(t.s) ?? num(t2.s),
    interlineado: num(t.l) ?? num(t2.l),
    grosor: t.fw || t2.fw || null,
    espaciadoLetras: t.ls || t2.ls || null,
    alineacion: t.a || t2.a || null,
  };
}

/** Animacion de entrada, resumida a lo que el componente puede reproducir. */
function animacion(d) {
  const desde = pares(d.frame_0);
  const hasta = pares(d.frame_1);
  const dur = parseFloat(String(hasta.sp || desde.sp || '').replace(/ms$/, ''));
  const inicio = parseFloat(String(hasta.st || desde.st || ''));
  const desplazamiento = desde.x || desde.y || null;
  if (!desde.x && !desde.y && !hasta.sp && !desde.tp) return null;
  return {
    // El componente reproduce "aparece desplazandose desde", no los fotogramas
    // completos del plugin. Lo que no se cubre queda anotado mas abajo.
    desdeX: desde.x || null,
    desdeY: desde.y || null,
    duracionMs: Number.isNaN(dur) ? null : dur,
    inicioMs: Number.isNaN(inicio) ? null : inicio,
    opacidadInicial: desde.o ?? null,
  };
}

const avisos = [];
const resultado = new Map();

for (const f of fs.readdirSync(RENDERED)) {
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(RENDERED, f), 'utf8');

  for (const m of html.matchAll(/<rs-module\b[^>]*id="rev_slider_(\d+)_\d+"/g)) {
    const id = Number(m[1]);
    const alias = ALIAS_POR_ID[id];
    if (!alias || resultado.has(alias)) continue; // ya extraido de otra pagina

    // El bloque del modulo llega hasta su cierre
    const inicio = m.index;
    const fin = html.indexOf('</rs-module>', inicio);
    const bloque = html.slice(inicio, fin > 0 ? fin : inicio + 400000);

    const slides = [];
    const partes = bloque.split(/<rs-slide\b/).slice(1);
    for (const sp of partes) {
      const cabecera = sp.slice(0, sp.indexOf('>'));
      const d = datos(cabecera);
      const capas = [];

      for (const cm of sp.matchAll(/<rs-layer\b([\s\S]*?)>/g)) {
        const cd = datos(cm[1]);
        const xy = pares(cd.xy);
        const dim = pares(cd.dim);
        const tipo = cd.type || 'text';

        // El texto visible esta justo despues de la etiqueta de apertura.
        const tras = sp.slice(cm.index + cm[0].length, cm.index + cm[0].length + 400);
        const texto = (tras.match(/^\s*([^<][^<]{0,200})/) || [])[1];

        const capa = {
          uid: (cm[1].match(/id="[^"]*-layer-(\d+)"/) || [])[1] ? Number((cm[1].match(/id="[^"]*-layer-(\d+)"/) || [])[1]) : null,
          tipo: /image/i.test(tipo) ? 'imagen' : /shape/i.test(tipo) ? 'forma' : 'texto',
          texto: /image|shape/i.test(tipo) ? null : (texto ? texto.trim() : null),
          imagen: cd.lazyload || cd.src || null,
          // POSICION RESUELTA: si `data-xy` no trae `x`, es 0, no "centro". Ese fue
          // exactamente el error del extractor anterior.
          x: xy.x || '0px',
          y: xy.y || '0px',
          ancho: dim.w || null,
          alto: dim.h || null,
          color: cd.color || null,
          tipografia: /image|shape/i.test(tipo) ? null : tipografia(cd),
          animacion: animacion(cd),
          alineacionTexto: cd.align || null,
        };
        capas.push(capa);
      }

      // La imagen de fondo del slide suele venir como <img class="rev-slidebg">
      const fondoImg = (sp.match(/class="[^"]*rev-slidebg[^"]*"[^>]*data-lazyload="([^"]+)"/) || [])[1]
        || (sp.match(/data-lazyload="([^"]+)"[^>]*class="[^"]*rev-slidebg/) || [])[1]
        || null;

      slides.push({
        id: d.key || null,
        titulo: d.title || null,
        enlace: d.link ? {
          href: d.link.startsWith('//') ? 'https:' + d.link : d.link,
          target: d.target || '_self',
          externo: !/e-nation\.org/.test(d.link),
        } : null,
        duracionMs: d.duration ? Number(d.duration) : null,
        fondo: {
          imagen: fondoImg ? (fondoImg.startsWith('//') ? 'https:' + fondoImg : fondoImg) : null,
          color: null,
        },
        capas,
      });
    }

    resultado.set(alias, { id: alias, moduloRevSlider: id, slides });
  }
}

// ---------------------------------------------------------------------------
// Se combina con el lienzo ya verificado (el marcado no lo declara)
// ---------------------------------------------------------------------------
fs.mkdirSync(DESTINO, { recursive: true });
console.log('Extrayendo sliders desde el marcado renderizado\n');

for (const [alias, datosSlider] of resultado) {
  const fConfig = path.join(CONFIGS, `${alias}.json`);
  const previo = fs.existsSync(fConfig) ? JSON.parse(fs.readFileSync(fConfig, 'utf8')) : null;
  const lienzo = previo ? previo.lienzo : null;

  const totalCapas = datosSlider.slides.reduce((a, s) => a + s.capas.length, 0);
  const conEnlace = datosSlider.slides.filter((s) => s.enlace).length;
  const conTexto = datosSlider.slides.reduce((a, s) => a + s.capas.filter((c) => c.tipo === 'texto' && c.texto).length, 0);
  const conAnimacion = datosSlider.slides.reduce((a, s) => a + s.capas.filter((c) => c.animacion).length, 0);

  const config = {
    id: alias,
    origen: { plugin: 'slider-revolution', extraidoDe: 'markup renderizado', moduloRevSlider: datosSlider.moduloRevSlider },
    lienzo,
    comportamiento: previo ? previo.comportamiento : { autoplay: false, bucle: true, pausaAlPasarRaton: true },
    slides: datosSlider.slides,
  };

  const destino = path.join(DESTINO, `${alias}.json`);
  fs.writeFileSync(destino, JSON.stringify(config, null, 2), 'utf8');

  console.log(`  ${alias}`);
  console.log(`    slides: ${datosSlider.slides.length}   capas: ${totalCapas} (texto ${conTexto})   con enlace: ${conEnlace}`);
  console.log(`    lienzo: ${lienzo ? lienzo.ancho + 'x' + lienzo.alto : 'SIN LIENZO (falta la config del plugin)'}`);
  console.log(`    capas con animacion de entrada: ${conAnimacion}`);
  if (!conEnlace) console.log(`    (sin enlaces: es un slider de adorno)`);
  if (!lienzo) avisar(alias, 'sin lienzo: no habia config previa del plugin de donde tomarlo');
  console.log('');
}

function avisar(alias, que) { avisos.push({ alias, que }); }

if (avisos.length) {
  console.log('AVISOS:');
  for (const a of avisos) console.log(`  ${a.alias}: ${a.que}`);
}
