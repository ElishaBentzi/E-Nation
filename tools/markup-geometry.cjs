/*
 * Lee la geometria RESUELTA de las capas desde el marcado renderizado.
 *
 * POR QUE ESTO Y NO LA BASE DE DATOS
 *   La base de datos guarda la configuracion tal como la dejo el autor, y el plugin
 *   la INTERPRETA al renderizar. Comparando las dos aparecen discrepancias que
 *   explican los defectos visuales:
 *
 *     - El anclaje. En los data-* de RevSlider, `x:c` es CENTRO y `x:r` es DERECHA,
 *       no numeros. La base de datos tiene `horizontal: "center"` y ademas un `x`
 *       con valor (`-527px`), y el plugin resuelve a `c`: IGNORA ese desplazamiento.
 *       Leyendo la base de datos se coloca la capa 527 px a la izquierda de donde va.
 *     - El orden de las capas DIFIERE entre las dos fuentes, asi que comparar "capa
 *       3 con capa 3" compara capas distintas. La clave fiable es el ID de capa
 *       (`slider-<slider>-slide-<slide>-layer-<uid>`), que esta en las dos.
 *     - Las animaciones de BUCLE (`data-loop_0`) solo estan en el marcado: la base
 *       de datos no las expone. Son las que dan vida continua a un banner —el corazon
 *       que late es `loop_0="sX:0.8;sY:0.8"`— y sin ellas todo queda estatico.
 *
 * LIMITE: el marcado solo trae las diapositivas que el plugin renderiza de entrada,
 * pero ahora son EXACTAMENTE las 5 de cada idioma, que es todo lo que hay.
 *
 * Uso: se importa desde tools/revslider-to-config.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RENDERED = path.join(ROOT, 'reference', 'rendered');

/** Convierte "x:19px;y:62px;" en un objeto. */
function pares(valor) {
  const out = {};
  for (const trozo of String(valor || '').split(';')) {
    const i = trozo.indexOf(':');
    if (i < 1) continue;
    out[trozo.slice(0, i).trim()] = trozo.slice(i + 1).trim();
  }
  return out;
}

/**
 * Interpreta un valor de `data-xy`.
 *
 *   "145px"  -> posicion absoluta en pixeles
 *   "c"      -> CENTRADO, sin desplazamiento
 *   "r"      -> anclado a la DERECHA
 *   "l"      -> anclado a la IZQUIERDA
 *   "t"/"m"/"b" -> arriba, medio, abajo
 *
 * Se devuelve el anclaje por separado del desplazamiento, que es como lo entiende el
 * componente: `anclaje` es la referencia y `offset` el desplazamiento en pixeles.
 */
function interpretar(valor) {
  if (valor === undefined || valor === null || valor === '') return { anclaje: null, offset: null };
  const v = String(valor).trim();
  if (v === 'c') return { anclaje: 'center', offset: null };
  if (v === 'r') return { anclaje: 'right', offset: null };
  if (v === 'l') return { anclaje: 'left', offset: null };
  if (v === 't') return { anclaje: 'top', offset: null };
  if (v === 'm') return { anclaje: 'middle', offset: null };
  if (v === 'b') return { anclaje: 'bottom', offset: null };
  return { anclaje: null, offset: v };
}

/**
 * Devuelve, por id de capa, la geometria y las animaciones resueltas.
 *
 * LA CLAVE INCLUYE LA DIAPOSITIVA: `"<moduloRevSlider>-<idDiapositiva>-<uid>"`.
 *
 * No es un detalle. Los `uid` de capa de RevSlider son **por diapositiva**, no
 * globales: la capa 48 de la diapositiva 75 y la capa 48 de la diapositiva 80 son
 * capas distintas. Indexando solo por modulo y uid, la animacion de bucle de una
 * diapositiva se aplicaba a la de otra — el pulso de las monedas de UnityCoin
 * aparecia en Mutual Welfare.
 */
function leerGeometriaResuelta() {
  const salida = new Map();
  if (!fs.existsSync(RENDERED)) return salida;

  for (const f of fs.readdirSync(RENDERED)) {
    if (!f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(RENDERED, f), 'utf8');

    for (const m of html.matchAll(/<rs-layer([\s\S]*?)>/g)) {
      const attrs = m[1];
      const idm = attrs.match(/id="slider-(\d+)-slide-(\d+)-layer-([^"]+)"/);
      if (!idm) continue;

      const d = {};
      for (const x of attrs.matchAll(/data-([a-z_0-9]+)\s*=\s*"([^"]*)"/gi)) d[x[1].toLowerCase()] = x[2];

      const xy = pares(d.xy);
      const dim = pares(d.dim);

      /*
       * `data-xy` admite ademas DESPLAZAMIENTOS SOBRE EL ANCLAJE: `xo` y `yo`.
       * Por ejemplo `y:c;yo:5px` es "centrado verticalmente y 5 px mas abajo". Sin
       * leer `yo`, esa capa se coloca a 5 px del borde superior en vez de centrada:
       * es el descentrado que se veia en el logo de la moneda.
       */
      const x = interpretar(xy.x);
      const y = interpretar(xy.y);
      if (xy.xo) x.offset = x.offset ? `calc(${x.offset} + ${xy.xo})` : xy.xo;
      if (xy.yo) y.offset = y.offset ? `calc(${y.offset} + ${xy.yo})` : xy.yo;

      salida.set(`${idm[1]}-${idm[2]}-${idm[3]}`, {
        tipo: d.type || null,
        x,
        y,
        ancho: dim.w || null,
        alto: dim.h || null,
        color: d.color || null,
        // Animaciones de ENTRADA
        frame0: d.frame_0 ? pares(d.frame_0) : null,
        frame1: d.frame_1 ? pares(d.frame_1) : null,
        // Animaciones de BUCLE: son las que dan vida continua. Sin ellas el banner
        // se queda estatico despues de la entrada.
        loop0: d.loop_0 ? pares(d.loop_0) : null,
        loop1: d.loop_1 ? pares(d.loop_1) : null,
        loopSpeed: d.loop_speed || null,
        loopEase: d.loop_ease || null,
        hover: d.frame_hover ? pares(d.frame_hover) : null,
        // La tipografia resuelta
        text: d.text ? pares(d.text) : null,
        align: d.align || null,
      });
    }
  }
  return salida;
}

module.exports = { leerGeometriaResuelta, interpretar, pares };
