/*
 * Convierte la configuracion de Slider Revolution al formato GENERICO del
 * componente `shared/banner-slider/`.
 *
 * POR QUE UN FORMATO PROPIO EN VEZ DE USAR EL DE REVSLIDER
 *   El de RevSlider esta pensado para su plugin: anida por categorias, mete JSON
 *   dentro de cadenas, y describe cada capa con variantes por dispositivo en una
 *   estructura de cuatro niveles. Reconstruirlo tal cual obligaria a arrastrar
 *   esa complejidad a todos los proyectos que lo usen.
 *
 *   El formato de destino es plano, legible y documentado, y el componente lo
 *   consume sin saber que detras hubo un Slider Revolution. Eso es lo que lo hace
 *   reutilizable en otras migraciones.
 *
 * PRINCIPIO: NADA SE PIERDE EN SILENCIO
 *   Lo que el generador no sepa mapear NO se descarta callando: se cuenta y se
 *   lista al final. Un banner al que le falta un texto y nadie lo nota es el peor
 *   resultado posible de una migracion.
 *
 * Uso: node tools/revslider-to-config.cjs [alias]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ORIGEN = path.join(ROOT, 'reference', 'sliders');
const DESTINO = path.join(ROOT, 'astro-site', 'src', 'sliders');
// El export del WordPress: de aqui salen los PRESETS de estilo (tabla
// `revslider_css`), que es donde las capas toman el color y parte de la tipografia.
const EXPORT = path.join(ROOT, 'reference', 'wp-export.json');
// Geometria RESUELTA por el plugin, leida del marcado renderizado. Manda sobre la
// base de datos: ver la explicacion en el bloque de posicion.
const { leerGeometriaResuelta } = require('./markup-geometry.cjs');
// El HTML renderizado del original, del que se leen los valores ya resueltos.
const RENDERED = path.join(ROOT, 'reference', 'rendered');

if (!fs.existsSync(ORIGEN)) {
  console.error('no hay sliders extraidos en reference/sliders/');
  process.exit(2);
}
if (!fs.existsSync(EXPORT)) {
  console.error('no existe reference/wp-export.json: sin el no hay presets y las');
  console.error('capas se quedarian sin color.');
  process.exit(2);
}

const DISPOSITIVOS = ['d', 'n', 't', 'm'];
const NOMBRE_DISPOSITIVO = { d: 'escritorio', n: 'portatil', t: 'tableta', m: 'movil' };

/**
 * Los valores por dispositivo se guardan como { d: { v }, n: { v }, ... }.
 * Devuelve el valor de escritorio y avisa si los demas difieren, porque el
 * componente puede necesitar variantes responsive.
 */
function porDispositivo(obj) {
  if (!obj || typeof obj !== 'object') return { valor: obj, difieren: false, todos: {} };
  const todos = {};
  for (const d of DISPOSITIVOS) {
    const v = obj[d];
    if (v && typeof v === 'object' && 'v' in v) todos[d] = v.v;
    else if (v !== undefined && typeof v !== 'object') todos[d] = v;
  }
  const valores = Object.values(todos).filter((v) => v !== undefined);
  const difieren = new Set(valores.map((v) => JSON.stringify(v))).size > 1;
  return { valor: todos.d !== undefined ? todos.d : valores[0], difieren, todos };
}

/** Busca una propiedad por ruta con puntos, sin romperse si falta. */
function ruta(o, camino, porDefecto = undefined) {
  let actual = o;
  for (const parte of camino.split('.')) {
    if (actual === null || actual === undefined || typeof actual !== 'object') return porDefecto;
    actual = actual[parte];
  }
  return actual === undefined ? porDefecto : actual;
}

/**
 * Estilos de una capa. VIVEN EN `idle`, que es el estado base del sistema de
 * estados de RevSlider (hay tambien `hover`).
 *
 * Esto costo encontrarlo: en la base de datos la capa no tiene `fontSize` ni
 * `color` en primer nivel, y `customCSS` solo trae el espaciado entre letras. La
 * tipografia esta anidada en `idle`.
 *
 * El COLOR suele venir VACIO (`{e:true}`) porque se resuelve por la hoja de estilos
 * del preset (`idle.style`, p. ej. "Fashion-BigDisplay"). Cuando pasa eso se deja
 * en null y se AVISA: inventarse un color seria peor que reconocer que falta.
 *
 * `customCSS` NO ES SOLO EL ESPACIADO, y creerlo costo un defecto visible: de las
 * 48 capas de texto, 39 declaran ahi `white-space:nowrap`. Sin ese `nowrap` el
 * texto ENVUELVE de linea donde el original lo mantiene entero, la capa crece de
 * alto y se pisa con la de abajo. Se comprobo midiendo el original: su titular de
 * Mutual Welfare ocupa UNA linea de 727 px dentro de una caja de 761.
 */
function estilosDe(capa, uidCapa, modulo) {
  const idle = capa.idle || {};
  const s = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'object') {
      const d = v.d;
      const val = d && typeof d === 'object' && 'v' in d ? d.v : (typeof d === 'string' ? d : undefined);
      return val === undefined || val === '' ? null : val;
    }
    return v === '' ? null : v;
  };

  /** Lee una propiedad suelta de un bloque `customCSS` ("a:b;c:d"). */
  const css = (bloque, prop) => {
    if (typeof bloque !== 'string') return null;
    const m = bloque.match(new RegExp(prop + '\\s*:\\s*([^;]+)', 'i'));
    return m ? m[1].trim() : null;
  };

  const preset = PRESETS.get(idle.style) || null;
  const resuelto = RESUELTOS.get(`${modulo}-${uidCapa}`) || null;

  /*
   * ORDEN DE PRECEDENCIA, y el porque de cada puesto:
   *
   *   1. LO QUE DECLARA LA PROPIA CAPA (`idle`). Es una decision explicita del autor
   *      para esa capa concreta.
   *   2. LO QUE RESUELVE EL MARCADO RENDERIZADO. Es la SALIDA FINAL del plugin, con
   *      el preset y la capa ya combinados. Manda sobre el preset porque el preset
   *      es solo la BASE: el plugin puede aplicar encima valores que no estan ni en
   *      la configuracion de la capa ni en la del preset.
   *   3. EL PRESET, como base para lo que no haya quedado resuelto.
   *
   * TENIA ESTE ORDEN AL REVES y se notaba: el texto del banner salia NEGRO (del
   * preset "Fashion-BigDisplay", #000000) cuando el original lo pinta BLANCO
   * (`data-color="#ffffff"` en el marcado). Poner el preset por delante del
   * resultado real es invertir la cascada.
   *
   * Limite conocido: el marcado solo trae los slides que el plugin renderiza de
   * entrada (5 de los 21 del banner), asi que para el resto se cae al preset.
   */
  const propio = (v, resuelto_, delPreset_) => s(v) ?? resuelto_ ?? delPreset_;
  const tiene = (v) => s(v) !== null;

  return {
    familia: propio(idle.fontFamily, resuelto?.familia ?? null, delPreset(preset, 'font-family')),
    tamano: propio(idle.fontSize, resuelto?.tamano ?? null, delPreset(preset, 'font-size')),
    /*
     * EL PRESET NO VALE COMO FUENTE DEL PESO, y es contraintuitivo, asi que queda
     * escrito: hay 57 capas de las 93 con `fontWeight` VACIO (`{"d":{"e":true}}`, o
     * sea "no lo declares"). El respaldo natural era el preset
     * ("Fashion-BigDisplay", que declara 900), pero MEDIDO en el original esa misma
     * capa se pinta con 400: el plugin no aplica el peso del preset.
     *
     * El dano no era cosmetico. Un titular que alli ocupa UNA linea (727 px dentro
     * de una caja de 761) aqui pesaba 900, no cabia en su caja, envolvia a dos
     * lineas, la capa doblaba su alto y se pISABA con la capa de abajo.
     *
     * Sin valor, no se emite `font-weight` y el navegador usa el suyo (400), que es
     * justo lo que hace el original. Las 36 capas que SI declaran 700 lo conservan.
     */
    grosor: propio(idle.fontWeight, resuelto?.grosor ?? null, null),
    interlineado: propio(idle.lineHeight, resuelto?.interlineado ?? null, delPreset(preset, 'line-height')),
    espaciadoLetras: propio(idle.letterSpacing, resuelto?.espaciadoLetras ?? null, css(capa.customCSS, 'letter-spacing')),
    /*
     * `white-space` solo vive en `customCSS` (no hay estado `idle` para el). Cuando
     * vale `nowrap` el texto NO debe envolver, y eso es una decision de diseno del
     * original que hay que respetar: cambiarla altera el alto de la capa y produce
     * solapes con la capa de abajo.
     */
    sinEnvolver: /nowrap/i.test(String(css(capa.customCSS, 'white-space') || '')),
    alineacion: propio(idle.textAlign, null, null),
    color: propio(idle.color, resuelto?.color ?? null, delPreset(preset, 'color')),
    fondo: propio(idle.backgroundColor, null, delPreset(preset, 'background-color')),
    radio: s(idle.borderRadius),
    preset: idle.style || null,
    /** De donde salio cada valor, para poder auditar la cascada. */
    origen: {
      familia: tiene(idle.fontFamily) ? 'capa' : (resuelto?.familia ? 'marcado' : (delPreset(preset, 'font-family') ? 'preset' : null)),
      tamano: tiene(idle.fontSize) ? 'capa' : (resuelto?.tamano ? 'marcado' : (delPreset(preset, 'font-size') ? 'preset' : null)),
      color: tiene(idle.color) ? 'capa' : (resuelto?.color ? 'marcado' : (delPreset(preset, 'color') ? 'preset' : null)),
    },
  };
}

// ---------------------------------------------------------------------------
// PRESETS DE ESTILO (`revslider_css`)
//
// Es la pieza que faltaba. Las capas NO declaran color ni, a menudo, tipografia:
// toman un PRESET por nombre (`idle.style`, p. ej. "Fashion-BigDisplay"), y el
// preset si trae color, font-family, font-size, font-weight, line-height...
//
// LA CASCADA ES: preset como base, y encima lo que declare el `idle` de la capa.
// Por eso las capas pueden usar "Martel Sans" cuando el preset dice "Raleway":
// la capa gana. Sin la tabla de presets hay que adivinar los colores, y adivinar
// es exactamente lo que no se hace en una migracion.
// ---------------------------------------------------------------------------
const j = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
const PRESETS = new Map();
for (const c of (j.sliders_revolution || []).filter((x) => x.tabla === 'revslider_css')) {
  const nombre = String(c.handle || '').split('.').pop();
  PRESETS.set(nombre, c.params_decodificado || {});
}

/** Extrae un valor del preset, que viene plano y en cadenas. */
function delPreset(preset, clave) {
  if (!preset) return null;
  const v = preset[clave];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') {
    const d = v.d;
    const val = d && typeof d === 'object' && 'v' in d ? d.v : d;
    return val === undefined || val === '' ? null : val;
  }
  return v;
}

// ---------------------------------------------------------------------------
// SEGUNDA FUENTE: los valores RESUELTOS del marcado renderizado.
//
// Hay capas que no declaran estilo propio Y TAMPOCO referencian un preset (las del
// slider `e-nation`): dependen de los valores por defecto internos del plugin, que
// no estan en ninguna configuracion.
//
// Pero el marcado que el plugin genera SI trae el resultado final ya resuelto
// (`data-color="#fff" data-text="s:110;l:110;ls:-2px;fw:900"`). Asi que se usa
// como ultimo recurso: preset -> capa -> marcado resuelto. Con esto no queda
// ninguna capa sin color, y no hay que adivinar ninguno.
// ---------------------------------------------------------------------------
const RESUELTOS = new Map(); // "<moduloRevSlider>-<uid>" -> estilos resueltos
if (fs.existsSync(RENDERED)) {
  for (const f of fs.readdirSync(RENDERED)) {
    if (!f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(RENDERED, f), 'utf8');
    for (const m of html.matchAll(/<rs-layer([\s\S]*?)>/g)) {
      const attrs = m[1];
      // El id del marcado es `slider-<modulo>-slide-<slide>-layer-<uid>`. Se
      // capturan LOS DOS. Los uid de RevSlider son por slider, no globales: con
      // solo el uid, las capas de sliders distintos colisionan entre si y se le
      // acaba asignando a una el color de otra.
      const idm = attrs.match(/id="slider-(\d+)-slide-\d+-layer-([^"]+)"/);
      if (!idm) continue;
      const d = {};
      for (const x of attrs.matchAll(/data-([a-z_0-9]+)\s*=\s*"([^"]*)"/gi)) d[x[1].toLowerCase()] = x[2];
      const t = {};
      for (const trozo of String(d.text || '').split(';')) {
        const i = trozo.indexOf(':');
        if (i > 0) t[trozo.slice(0, i).trim()] = trozo.slice(i + 1).trim();
      }
      RESUELTOS.set(`${idm[1]}-${idm[2]}`, {
        color: d.color || null,
        tamano: t.s ? t.s + 'px' : null,
        interlineado: t.l ? t.l + 'px' : null,
        grosor: t.fw || null,
        espaciadoLetras: t.ls || null,
        // El marcado no declara la familia: si no esta en el preset ni en la capa,
        // se deja sin declarar en vez de inventar una.
        familia: null,
      });
    }
  }
}

/**
 * Animacion de entrada de una capa.
 *
 * RevSlider guarda la animacion como FOTOGRAMAS: `frame_0` es el estado inicial,
 * `frame_1` el final, y `frame_999` la salida. Cada fotograma trae su `speed`
 * (duracion) y su `start` (retardo).
 *
 * LO QUE HACE ATRACTIVO UN BANNER ES EL ESCALONADO, no la animacion en si: en el
 * original las cinco capas del primer slide entran con retardos de 10, 290, 490,
 * 900 y 910 ms, de modo que el banner se va componiendo en vez de aparecer de
 * golpe. Reproducir eso es lo que se nota; ignorar el retardo lo deja plano.
 *
 * Se reproduce "entra desde" (opacidad y desplazamiento) que es lo que cubre este
 * componente. Los fotogramas completos del plugin —con transformaciones por eje y
 * por dispositivo— no se traducen enteros, y se avisa de cuantos quedan.
 */
function animacionDe(capa) {
  const tl = capa.timeline || {};
  const frames = tl.frames || {};
  const desde = frames.frame_0;
  if (!desde) return null;

  const val = (frame, clave) => {
    const v = frame && frame.transform ? frame.transform[clave] : undefined;
    if (v === undefined || v === null) return null;
    if (typeof v === 'object') {
      const d = v.d;
      const x = d && typeof d === 'object' && 'v' in d ? d.v : d;
      return x === undefined || x === 'inherit' ? null : x;
    }
    return v === 'inherit' ? null : v;
  };

  const hasta = frames.frame_1;
  const timing = (hasta && hasta.timeline) || desde.timeline || {};

  // `inherit` significa "se queda donde esta", o sea sin desplazamiento.
  const desdeX = val(desde, 'x');
  const desdeY = val(desde, 'y');
  const op0 = val(desde, 'opacity');
  const op1 = val(hasta, 'opacity');

  const duracion = Number(timing.speed) || null;
  const retardo = Number(timing.start) || 0;

  // Si no hay nada que animar, no se genera animacion: una animacion vacia solo
  // anade ruido al archivo y una clase inutil al HTML.
  const tieneCambio = (desdeX !== null && desdeX !== 0 && desdeX !== '0px')
    || (desdeY !== null && desdeY !== 0 && desdeY !== '0px')
    || (op0 !== null && String(op0) === '0' && String(op1) !== '0');

  if (!tieneCambio) return null;

  return {
    // Estado inicial. Solo se incluye lo que difiere del final.
    desde: {
      opacidad: op0 !== null ? Number(op0) : 1,
      x: desdeX !== null ? String(desdeX) : null,
      y: desdeY !== null ? String(desdeY) : null,
    },
    duracionMs: duracion,
    retardoMs: retardo || null,
  };
}

const GEOMETRIA = leerGeometriaResuelta();

/*
 * EFECTOS AÑADIDOS POR EL USUARIO (no extraidos del original).
 *
 * Viven en un archivo de DECISION, aparte de la configuracion generada, por dos
 * motivos: para que una regeneracion no los borre, y para que quede claro QUE ES
 * DEL ORIGINAL Y QUE NO. El original no tiene animacion continua en estas
 * diapositivas, asi que estos efectos son una mejora, no fidelidad.
 *
 * Se indexan por DESTINO del banner y no por numero de diapositiva: asi el efecto
 * cubre todas sus variantes de idioma de una vez.
 */
const RUTA_EFECTOS = path.join(ROOT, 'astro-site', 'src', 'sliders', 'efectos.json');
const EFECTOS = fs.existsSync(RUTA_EFECTOS) ? JSON.parse(fs.readFileSync(RUTA_EFECTOS, 'utf8')) : {};
let animaciones = 0;
const avisos = [];
const avisar = (alias, que) => avisos.push({ alias, que });
const fuentesVistas = new Map();
const presetsVistos = new Map();
let capasSinColor = 0;

/** Traduce un slider completo. */
function traducir(s) {
  const alias = s.alias;
  const p = s.params || {};

  // --- Ajustes del slider ---------------------------------------------------
  // OJO CON LAS CLAVES: son `size.width` y `size.height`, NO `gridWidth`/
  // `gridHeight`. Leer las equivocadas no falla, simplemente devuelve undefined y
  // el lienzo queda en 'auto'... y con altura automatica el contenedor colapsa a 0
  // y todas las capas se apilan encima del pie de pagina. El fallo es visual, no
  // de build, asi que no se detecta hasta que se mira.
  const ancho = porDispositivo(ruta(p, 'size.width'));
  const alto = porDispositivo(ruta(p, 'size.height'));
  const autoplay = ruta(p, 'general.slideshow') === 'true' || ruta(p, 'general.slideshow') === true;
  const intervalo = Number(ruta(p, 'general.slideshowDelay', 0)) || null;

  // Variantes de lienzo: la relacion de aspecto CAMBIA por dispositivo en el
  // original (1240x300 en escritorio, 480x116 en movil), asi que hay que
  // conservarlas o el banner queda deformado en movil.
  const variantesLienzo = {};
  for (const d of ['n', 't', 'm']) {
    const a = ancho.todos[d];
    const h = alto.todos[d];
    if (a !== undefined && h !== undefined && (a !== ancho.valor || h !== alto.valor)) {
      variantesLienzo[NOMBRE_DISPOSITIVO[d]] = { ancho: a, alto: h };
    }
  }

  // El original limita el ancho de algunos sliders (`banner-publicidad` usa 1166).
  // Ignorarlo los estira a todo el ancho de la ventana y cambia la escala de las
  // capas, que estan posicionadas en pixeles relativos a ese lienzo.
  const maxAnchoCrudo = ruta(p, 'size.maxWidth');
  const maxAncho = (() => {
    if (maxAnchoCrudo === undefined || maxAnchoCrudo === null || maxAnchoCrudo === '') return null;
    if (typeof maxAnchoCrudo === 'object') {
      const d = maxAnchoCrudo.d;
      const v = d && typeof d === 'object' && 'v' in d ? d.v : d;
      return v ? Number(v) || null : null;
    }
    return Number(maxAnchoCrudo) || null;
  })();

  const config = {
    id: alias,
    origen: { plugin: 'slider-revolution', id: s.id, totalSlidesOriginal: s.total_slides },
    lienzo: {
      ancho: ancho.valor !== undefined ? ancho.valor : null,
      alto: alto.valor !== undefined ? alto.valor : null,
      anchoMaximo: maxAncho,
      ...(Object.keys(variantesLienzo).length ? { variantes: variantesLienzo } : {}),
    },
    comportamiento: {
      autoplay,
      intervaloMs: intervalo,
      bucle: ruta(p, 'general.loop') !== 'false',
      pausaAlPasarRaton: ruta(p, 'general.stopOnHover') !== 'false',
    },
    slides: [],
  };

  // La animacion de entrada de las capas vive en el timeline; se anota la
  // presencia y los tiempos, no los fotogramas enteros.
  const framesNoMapeados = new Set();

  for (const sl of s.slides || []) {
    const sp = sl.params || {};
    const capasCrudas = sl.capas ? (Array.isArray(sl.capas) ? sl.capas : Object.values(sl.capas)) : [];

    // El fondo del slide puede ser color, imagen o video
    const fondo = sp.bg || {};
    const imagenFondo = fondo.image || ruta(fondo, 'image.url') || null;
    const colorFondo = fondo.color || null;
    const tipoFondo = fondo.type || (imagenFondo ? 'image' : 'transparent');

    const slide = {
      id: sl.id,
      orden: sl.orden,
      titulo: sp.title || null,
      // ENLACE DEL SLIDE. Aqui esta lo que convierte estos sliders en banners
      // entre proyectos, y es lo que casi se pierde: los enlaces NO viven en las
      // capas sino en `params.seo.link`, a nivel de slide, con su `target`. Se
      // mira aqui Y en las acciones de las capas, porque puede haber de los dos.
      enlace: null,
      fondo: {
        tipo: tipoFondo,
        color: colorFondo && colorFondo !== 'transparent' ? colorFondo : null,
        imagen: imagenFondo,
        // TODO lo que no sea color ni imagen simple (video, gradiente) hay que
        // mirarlo a mano: se avisa en vez de perderlo.
        sinMapear: null,
      },
      capas: [],
    };

    const seo = sp.seo || {};

    /*
     * EFECTOS AÑADIDOS POR EL USUARIO para esta diapositiva, si los hay.
     *
     * Se resuelven por DESTINO del banner: asi el mismo efecto cubre sus variantes
     * de idioma sin repetirlo. Y van DESPUES de declarar `seo`, porque necesitan su
     * enlace — ponerlos antes daba un error de zona muerta temporal.
     */
    // Se empareja por HOST EXACTO, no por texto contenido. Buscar la cadena dentro
    // de la URL tiene una trampa real: `bienestarmutuo.org.ve` (Venezuela) CONTIENE
    // `bienestarmutuo.org` (Mutual Welfare), asi que por texto el efecto de una
    // diapositiva se aplicaria a la de otro proyecto.
    let hostDestino = '';
    try { hostDestino = new URL(seo.link).hostname.replace(/^www./, ''); } catch (e) { hostDestino = ''; }
    const efectosDeLaDiapositiva = Object.entries(EFECTOS['banner-publicidad'] || {})
      .filter(([clave]) => clave && !clave.startsWith('_') && hostDestino === clave.replace(/^www./, ''))
      .map(([, v]) => v)[0] || null;

    if (seo.set && seo.link) {
      slide.enlace = {
        href: seo.link,
        target: seo.target || '_self',
        externo: !/^(https?:\/\/)?([a-z0-9-]+\.)*e-nation\.org/i.test(seo.link),
      };
    }
    if (fondo.video && fondo.video.url) {
      slide.fondo.sinMapear = 'video de fondo';
      avisar(alias, `slide ${sl.id}: fondo de video (${fondo.video.url})`);
    }

    for (const capa of capasCrudas) {
      if (!capa || typeof capa !== 'object') continue;

      const tipo = capa.type || 'text';
      // Geometria resuelta por el plugin para ESTA capa, emparejando por id.
      // La clave lleva tambien la DIAPOSITIVA: los uid de capa son por diapositiva.
      const resuelta = GEOMETRIA.get(`${s.id}-${sl.id}-${capa.uid}`) || null;
      const tam = capa.size || {};
      const pos = capa.position || {};
      const w = porDispositivo(tam.width);
      const h = porDispositivo(tam.height);
      const horiz = porDispositivo(pos.horizontal);
      const vert = porDispositivo(pos.vertical);
      const ox = porDispositivo(pos.x);
      const oy = porDispositivo(pos.y);

      const c = {
        uid: capa.uid,
        alias: capa.alias || null,
        tipo: /image/i.test(tipo) ? 'imagen' : /shape/i.test(tipo) ? 'forma' : 'texto',
        texto: /image|shape/i.test(tipo) ? null : (capa.text || null),
        // Seis capas de estos sliders llevan HTML de verdad en el texto
        // ("Spanish Edition <i class=\"fa-download\"></i>"): texto mas un icono
        // que el original SI renderizaba. Se marca para que el componente sepa
        // que debe interpretarlo, y no mostrarlo como codigo.
        textoConHtml: !/image|shape/i.test(tipo) && /<[a-z][^>]*>/i.test(String(capa.text || '')),
        imagen: ruta(capa, 'media.imageUrl', null),
        alt: ruta(capa, 'media.alt', null),
        /*
         * POSICION: se usa la que RESUELVE EL MARCADO cuando esta disponible, y solo
         * se cae a la base de datos cuando no.
         *
         * POR QUE EL MARCADO MANDA, y no es un detalle:
         *
         *   - EL ANCLAJE. En la base de datos una capa puede tener
         *     `horizontal: "center"` Y ADEMAS un `x` con valor (`-527px`). El plugin
         *     resuelve eso a `x:c`: centrado, IGNORANDO el desplazamiento. Leyendo la
         *     base de datos esa capa se coloca 527 px a la izquierda de donde va, y
         *     acaba solapando con las vecinas — que es exactamente lo que se veia.
         *   - LOS DESPLAZAMIENTOS SOBRE EL ANCLAJE (`xo`/`yo`) solo aparecen en el
         *     marcado. `y:c;yo:5px` es "centrado y 5 px mas abajo"; sin leerlo, la
         *     capa se coloca a 5 px del borde superior. Es el descentrado del logo de
         *     la moneda.
         *   - EL ORDEN DE LAS CAPAS difiere entre las dos fuentes, asi que se empareja
         *     por ID de capa (`modulo-uid`), no por posicion en la lista.
         */
        posicion: resuelta
          ? {
              horizontal: resuelta.x.anclaje,
              vertical: resuelta.y.anclaje,
              x: resuelta.x.offset,
              y: resuelta.y.offset,
              porPixeles: !resuelta.x.anclaje && !resuelta.y.anclaje,
              zIndex: pos.zIndex || null,
            }
          : {
              horizontal: horiz.valor !== undefined ? horiz.valor : null,
              vertical: vert.valor !== undefined ? vert.valor : null,
              x: ox.valor !== undefined ? ox.valor : null,
              y: oy.valor !== undefined ? oy.valor : null,
              porPixeles: horiz.valor === undefined && vert.valor === undefined,
              zIndex: pos.zIndex || null,
            },
        tamano: {
          ancho: (resuelta && resuelta.ancho) || (w.valor !== undefined ? w.valor : null),
          alto: h.valor !== undefined ? h.valor : null,
        },
        // Tipografia y color, del estado `idle`
        estilos: /image|shape/i.test(tipo) ? null : (() => {
          const e = estilosDe(capa, capa.uid, s.id);
          if (e.familia) fuentesVistas.set(e.familia, (fuentesVistas.get(e.familia) || 0) + 1);
          if (!e.color) avisar(alias, `capa ${capa.uid}: sin color declarado (se resuelve por el preset "${e.preset || '?'}")`);
          return e;
        })(),
        // Variantes responsive: solo se anotan cuando DIFIEREN del escritorio.
        variantes: {},
      };

      for (const d of ['n', 't', 'm']) {
        const v = {};
        if (w.todos[d] !== undefined && w.todos[d] !== w.valor) v.ancho = w.todos[d];
        if (h.todos[d] !== undefined && h.todos[d] !== h.valor) v.alto = h.todos[d];
        if (Object.keys(v).length) c.variantes[NOMBRE_DISPOSITIVO[d]] = v;
      }
      if (!Object.keys(c.variantes).length) delete c.variantes;

      // Enlaces a nivel de CAPA. En estos sliders el enlace suele estar en el
      // slide, pero RevSlider tambien admite acciones por capa (`image_link`,
      // `link`, `url`) y si existen hay que conservarlas.
      const acciones = capa.actions || {};
      const candidatos = [
        ruta(acciones, 'simpleEvent.0.url'),
        ruta(acciones, 'simpleEvent.url'),
        ruta(capa, 'action.0.image_link'),
        ruta(capa, 'action.0.link'),
        ruta(capa, 'action.0.url'),
        ruta(capa, 'link'),
      ].filter((x) => typeof x === 'string' && /^(https?:\/\/|\/)/.test(x));

      if (candidatos.length) {
        c.enlace = {
          href: candidatos[0],
          target: ruta(acciones, 'simpleEvent.0.target', '_self'),
          externo: !/^(https?:\/\/)?([a-z0-9-]+\.)*e-nation\.org/i.test(candidatos[0]),
        };
        // Una capa con VARIOS enlaces distintos es algo que el componente no
        // cubre: se avisa en lugar de quedarse con el primero y callar.
        if (new Set(candidatos).size > 1) {
          avisar(alias, `slide ${sl.id}, capa ${capa.uid}: ${candidatos.length} enlaces distintos, solo se usa el primero`);
        }
      }

      /*
       * ANIMACION CONTINUA (bucle). Solo esta en el marcado: la base de datos no la
       * expone. Es la que da VIDA al banner despues de la entrada — el corazon que
       * late es `loop_0="sX:0.8;sY:0.8"`: se encoge al 80 % y vuelve, en bucle.
       *
       * Sin esto todo queda estatico al terminar la animacion de entrada, que es
       * justo lo que se notaba.
       */
      const loop0 = resuelta ? resuelta.loop0 : null;
      if (loop0) {
        const escala = loop0.sX || loop0.sY;
        const rotacion = loop0.xR || loop0.yR;
        // `oX`/`oY` solos son solo el origen de la transformacion: no animan nada.
        if (escala && escala !== '1') {
          c.bucle = { tipo: 'escala', valor: Number(escala) };
          animaciones++;
        } else if (rotacion) {
          c.bucle = { tipo: 'rotacion', valor: Number(rotacion) };
          animaciones++;
        }
      }

      /*
       * Efectos anadidos por el usuario. Se marcan en la capa para que el componente
       * sepa que hacer, y NO se confunden con lo extraido del original: el nombre del
       * campo lo deja claro.
       */
      if (efectosDeLaDiapositiva) {
        if (efectosDeLaDiapositiva.texto === 'ola' && c.tipo === 'texto' && c.texto) {
          // La ola necesita el texto partido en letras, y eso solo se puede hacer con
          // texto plano: si trae HTML se animaria el bloque entero y quedaria peor.
          c.efectoTexto = c.textoConHtml ? null : 'ola';
          if (c.efectoTexto) animaciones++;
        }
        if (efectosDeLaDiapositiva.imagen === 'flotar' && c.tipo === 'imagen' && /logo|logotipo/i.test(String(c.imagen || ''))) {
          c.efectoImagen = 'flotar';
          animaciones++;
        }
      }

      // Animacion de entrada: opacidad y desplazamiento iniciales, con su duracion
      // y su retardo. El RETARDO escalonado es lo que hace que el banner se
      // componga en vez de aparecer de golpe.
      const anim = animacionDe(capa);
      if (anim) {
        c.animacion = anim;
        animaciones++;
      }
      // Los fotogramas de SALIDA (frame_999) y los que llevan transformaciones por
      // eje no se reproducen: se cuentan para poder decirlo.
      const tl = capa.timeline || {};
      const frames = tl.frames ? Object.keys(tl.frames).filter((k) => !/^frame_999$/.test(k)) : [];
      if (frames.length) framesNoMapeados.add(`${tipo}/${frames.length}f`);

      slide.capas.push(c);
    }

    config.slides.push(slide);
  }

  const totalCapas = config.slides.reduce((a, sl) => a + sl.capas.length, 0);
  const totalTexto = config.slides.reduce((a, sl) => a + sl.capas.filter((c) => c.tipo === 'texto' && c.texto).length, 0);
  const totalImagen = config.slides.reduce((a, sl) => a + sl.capas.filter((c) => c.tipo === 'imagen' && c.imagen).length, 0);
  const enlacesSlide = config.slides.filter((sl) => sl.enlace).length;
  const enlacesCapa = config.slides.reduce((a, sl) => a + sl.capas.filter((c) => c.enlace).length, 0);
  const sinEnlace = config.slides.filter((sl) => !sl.enlace && !sl.capas.some((c) => c.enlace));

  // COMPROBACION QUE IMPORTA: si estos sliders son banners que enlazan a otros
  // proyectos, un slide SIN enlace es sospechoso de mapeo perdido. Se avisa, en
  // vez de dar el trabajo por bueno.
  if (sinEnlace.length) {
    avisar(alias, `${sinEnlace.length} de ${config.slides.length} slides SIN ningun enlace (¿banner sin destino?): ` +
      sinEnlace.slice(0, 5).map((sl) => 'slide ' + sl.id).join(', '));
  }

  return {
    config,
    resumen: {
      totalCapas, totalTexto, totalImagen,
      enlacesSlide, enlacesCapa,
      slidesSinEnlace: sinEnlace.length,
      // Se cuenta del RESULTADO y no del contador global, para que el numero sea el
      // de este slider y no arrastre el de los anteriores.
      animacionesDeEntrada: config.slides.reduce((a, sl) => a + sl.capas.filter((c) => c.animacion).length, 0),
      framesNoMapeados: [...framesNoMapeados],
    },
  };
}

// ---------------------------------------------------------------------------

const pedido = process.argv[2];
const ficheros = fs.readdirSync(ORIGEN).filter((f) => f.endsWith('.json') && (!pedido || f.includes(pedido)));
if (!ficheros.length) { console.error(`no hay sliders que coincidan con "${pedido}"`); process.exit(2); }

fs.mkdirSync(DESTINO, { recursive: true });

console.log('Convirtiendo sliders de RevSlider al formato del componente\n');
for (const f of ficheros.sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(ORIGEN, f), 'utf8'));
  const { config, resumen } = traducir(s);
  const destino = path.join(DESTINO, `${config.id}.json`);
  fs.writeFileSync(destino, JSON.stringify(config, null, 2), 'utf8');

  const kb = Math.round(fs.statSync(destino).size / 1024);
  console.log(`  ${config.id}`);
  console.log(`    slides: ${config.slides.length}   capas: ${resumen.totalCapas} (texto ${resumen.totalTexto}, imagen ${resumen.totalImagen})`);
  console.log(`    enlaces: ${resumen.enlacesSlide} en el slide + ${resumen.enlacesCapa} en capas${resumen.slidesSinEnlace ? `   AVISO: ${resumen.slidesSinEnlace} slides sin enlace` : ''}`);
  console.log(`    autoplay: ${config.comportamiento.autoplay}${config.comportamiento.intervaloMs ? ' cada ' + config.comportamiento.intervaloMs + 'ms' : ''}   lienzo: ${config.lienzo.ancho} x ${config.lienzo.alto}`);
  console.log(`    escrito: src/sliders/${config.id}.json (${kb} KB)`);
  if (resumen.framesNoMapeados.length) {
    console.log(`    animaciones de entrada extraidas: ${resumen.animacionesDeEntrada}`);
  if (resumen.framesNoMapeados.length) console.log(`    fotogramas originales por capa (informativo): ${resumen.framesNoMapeados.join(', ')}`);
  }
  console.log('');

  // Lista de destinos: es lo que hace que estos sliders sean banners entre
  // proyectos, asi que conviene verlo de un vistazo.
  const destinos = [...new Set(config.slides.filter((sl) => sl.enlace).map((sl) => sl.enlace.href))];
  if (destinos.length) {
    console.log(`    destinos (${destinos.length}):`);
    for (const d of destinos.slice(0, 14)) console.log(`      ${d}`);
    if (destinos.length > 14) console.log(`      ... y ${destinos.length - 14} mas`);
    console.log('');
  }
}

if (avisos.length) {
  console.log(`AVISOS — ${avisos.length} cosas que el generador NO ha mapeado y hay que mirar:`);
  const porAlias = new Map();
  for (const a of avisos) {
    if (!porAlias.has(a.alias)) porAlias.set(a.alias, []);
    porAlias.get(a.alias).push(a.que);
  }
  for (const [alias, lista] of porAlias) {
    console.log(`  ${alias}:`);
    for (const x of lista.slice(0, 8)) console.log(`    - ${x}`);
    if (lista.length > 8) console.log(`    ... y ${lista.length - 8} mas`);
  }
} else {
  console.log('Sin avisos: todo lo relevante se ha mapeado.');
}
