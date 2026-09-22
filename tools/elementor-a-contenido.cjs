/*
 * CONVIERTE EL ARBOL DE ELEMENTOR EN UN MODELO DE CONTENIDO.
 *
 * POR QUE
 *   El HTML capturado del original trae 100 KB de andamiaje del page builder, y el
 *   JSON de Elementor trae los widgets con decenas de ajustes de estilo que aqui no
 *   se usan (los estilos salen de `brand/tokens.css` y de Tailwind). Lo que hace
 *   falta es el CONTENIDO, en orden y con su jerarquia.
 *
 * QUE EMITE
 *   Un JSON por pagina con las secciones en orden, el fondo de cada una (que es lo
 *   que alimenta el parallax) y, dentro, los bloques con los datos que se pintan.
 *
 * NO SE USA CON LAS PAGINAS LEGALES: su texto no pasa por el chat ni por aqui.
 *
 * Uso:  node tools/elementor-a-contenido.cjs home-landing-page-en
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const NOMBRE = process.argv[2];
if (!NOMBRE) { console.error('Falta el nombre, por ejemplo: home-landing-page-en'); process.exit(1); }

const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'elementor', NOMBRE + '.json'), 'utf8'));

const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
/**
 * TEXTO DE UN ENCABEZADO, conservando los saltos de linea.
 *
 * 37 de los 141 encabezados de la presentacion traen etiquetas dentro (`<br>`,
 * `<span>`), porque el autor partia las frases en dos lineas a proposito. Dos
 * consecuencias, las dos pagadas:
 *
 *   - El texto PLANO (para comparar con el original y para el SEO) tiene que perder
 *     las etiquetas; si no, se cuelan en la comparacion y el encabezado parece
 *     distinto cuando es el mismo.
 *   - El salto de linea SI importa visualmente, asi que se conserva: se reduce el
 *     marcado a una lista blanca minima y se pinta con `set:html`. Pintado como
 *     texto, las etiquetas se verian LITERALMENTE en la pagina.
 */
const TAGS_PERMITidos = /<(?!\/?(?:br|strong|em|b|i)\b)[^>]*>/gi;
const textoEncabezado = (s) => String(s ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(TAGS_PERMITidos, '')
  .replace(/[ \t]+/g, ' ')
  .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
const plano = (s) => textoEncabezado(s).replace(/\s+/g, ' ').trim();
const tieneMarcado = (s) => /<(br|strong|em|b|i)\b/i.test(String(s ?? ''));
const url = (v) => (v && typeof v === 'object' && v.url ? String(v.url) : null);
/** Nombre del fichero de una imagen, que es como se referencia en el sitio. */
const archivo = (v) => { const u = url(v); return u ? u.split('?')[0].split('/').pop() : null; };
/**
 * RUTA UTILIZABLE de una imagen.
 *
 * Las del propio sitio se espejaron conservando la estructura de `uploads`, asi que
 * `.../wp-content/uploads/2018/10/problem-war.jpg` se sirve como
 * `/images/2018/10/problem-war.jpg` (que es la regla de `_redirects`).
 *
 * Las de OTROS dominios se dejan ABSOLUTAS a proposito: son de los proyectos que
 * enlazan los banners, no se espejan, y este proyecto solo reproduce el enlace tal
 * como esta. Cambiarlas por una ruta local daria un 404 silencioso.
 */
const rutaImg = (v) => {
  const u = url(v);
  if (!u) return null;
  const m = u.match(/\/wp-content\/uploads\/(.+)$/);
  if (m) return '/images/' + m[1];
  return /^https?:\/\//.test(u) ? u : '/' + u.split('/').pop();
};
const num = (v) => (v && typeof v === 'object' && v.size !== undefined ? v.size : v);

/** Color con alfa, para los velos: `rgba()` a partir de un hex y una opacidad. */
const conAlfa = (hex, alfa) => {
  const m = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(m)) return hex || null;
  const n = parseInt(m, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
};

/** Fondo y parallax de un contenedor. Es lo que gobierna el fondo fijo medido. */
function fondoDe(s) {
  if (!s) return null;
  const f = {};
  if (s.background_background === 'classic' || s.background_image) {
    if (s.background_color) f.color = s.background_color;
    const img = rutaImg(s.background_image);
    if (img) {
      f.imagen = img;
      f.tamano = s.background_size || null;
      f.posicion = s.background_position || null;
      f.repetir = s.background_repeat || null;
      f.attachment = s.background_attachment || null;
    }
  }
  // Los efectos de movimiento de Elementor se guardan como JSON en `data-settings`
  const mf = s.motion_fx_motion_fx_scrolling || s.motion_fx_translateY_effect;
  if (mf) f.movimiento = { scrolling: !!s.motion_fx_motion_fx_scrolling, velocidadY: s.motion_fx_translateY_speed ?? null };

  /*
   * EL VELO LLEVA OPACIDAD, y pintarlo opaco tapa la imagen de fondo entera.
   *
   * Elementor guarda el color del velo y su opacidad por separado, y la opacidad
   * viene con `unit: "px"` y el valor como fraccion (0.62), que es una rareza suya.
   * Leyendo solo el color, el velo se pintaba a plena opacidad: el fondo con imagen
   * quedaba convertido en un rectangulo de color plano y NO SE VEIA NINGUNA IMAGEN.
   * De ahi venia la sensacion de que los fondos no hacian nada: no habia nada que
   * ver moverse.
   */
  if (s.background_overlay_background === 'classic' && s.background_overlay_color) {
    const alfa = Number(s.background_overlay_opacity?.size ?? 1);
    f.velo = conAlfa(s.background_overlay_color, Number.isFinite(alfa) ? alfa : 1);
  }
  return Object.keys(f).length ? f : null;
}

/** Un widget -> un bloque del modelo. Solo los datos que se pintan. */
function bloqueDe(w) {
  const s = w.settings || {};
  const t = w.widgetType;
  const comun = { _id: w.id };

  if (t === 'heading') {
    return { ...comun, tipo: 'encabezado',
      texto: plano(s.title), nivel: s.header_size || 'h2', alineacion: s.align || null,
      // Solo cuando el original parte el texto en varias lineas
      html: tieneMarcado(s.title) ? textoEncabezado(s.title).replace(/\n/g, '<br>') : null,
      color: s.title_color || null, tamanoEm: num(s.typography_font_size),
      grosor: s.typography_font_weight || null, interlineadoEm: num(s.typography_line_height) };
  }
  if (t === 'text-editor') return { ...comun, tipo: 'texto', html: s.editor || '' };
  if (t === 'shortcode') {
    const sc = limpio(s.shortcode);
    const alias = (sc.match(/alias=["']([^"']+)["']/) || [])[1] || null;
    return { ...comun, tipo: alias ? 'slider' : 'shortcode', alias, shortcode: alias ? null : sc };
  }
  if (t === 'jet-banner') {
    return { ...comun, tipo: 'banner',
      imagen: rutaImg(s.banner_image), titulo: limpio(s.banner_title), texto: limpio(s.banner_text),
      fondo: s.background_color || null, fondoHover: s.background_hover_color || null,
      colorTitulo: s.banner_title_color || null, colorTexto: s.banner_text_color || null,
      efecto: s.animation_effect || null, clases: limpio(s._css_classes) || null,
      tamanoTituloEm: num(s.banner_title_typography_font_size) };
  }
  if (t === 'jet-animated-box') {
    /*
     * LA CAJA TIENE CUATRO TEXTOS, no dos: titulo y descripcion por CADA cara.
     * Leyendo solo `front_side_title` y `back_side_description` se perdian el titulo
     * del dorso y la descripcion del frente, que en este diseno es justo lo que
     * explica el concepto al girar la tarjeta.
     */
    return { ...comun, tipo: 'caja',
      titulo: limpio(s.front_side_title), descripcion: limpio(s.front_side_description),
      tituloDorso: limpio(s.back_side_title), descripcionDorso: limpio(s.back_side_description),
      imagen: rutaImg(s.front_side_background_image),
      fondoDorso: s.back_side_background_color || null,
      colorTitulo: s.front_title_color || null,
      colorDescripcion: s.back_description_color || null,
      alto: num(s.box_height), efecto: s.animation_effect || null,
      enlace: url(s.back_side_button_link) };
  }
  if (t === 'jet-animated-text') {
    const lista = Array.isArray(s.animated_text_list) ? s.animated_text_list : [];
    return { ...comun, tipo: 'textoAnimado',
      antes: limpio(s.before_text), despues: limpio(s.after_text),
      palabras: lista.map((x) => limpio(x.item_text)).filter(Boolean),
      color: s.animated_text_color || null, tamanoEm: num(s.animated_text_typography_font_size) };
  }
  if (t === 'jet-button') {
    return { ...comun, tipo: 'boton',
      etiqueta: limpio(s.button_label_normal), etiquetaHover: limpio(s.button_label_hover),
      enlace: url(s.button_url), icono: limpio(s.button_icon_normal) };
  }
  if (t === 'image') return { ...comun, tipo: 'imagen', imagen: rutaImg(s.image), alt: limpio(s.image?.alt) };
  if (t === 'html') return { ...comun, tipo: 'html', html: s.html || '' };
  if (t === 'video') return { ...comun, tipo: 'video', youtube: s.youtube_url || null, enlace: url(s.hosted_url) };
  if (t === 'icon-list') {
    const items = (s.icon_list || []).map((x) => limpio(x.text)).filter(Boolean);
    return { ...comun, tipo: 'lista', items };
  }
  if (t === 'divider') return { ...comun, tipo: 'separador' };
  if (t === 'spacer') return { ...comun, tipo: 'espacio', alto: num(s.space) };
  if (t === 'jet-slider') {
    /*
     * OJO CON EL NOMBRE DE LA CLAVE: los elementos NO estan en `slides` sino en
     * `item_list`, y cada uno trae `item_image`, `item_title` y `item_desc`. Leer
     * `slides` devolvia una lista VACIA sin dar ningun error, asi que las cuatro
     * imagenes del carrusel y sus titulos desaparecian de la pagina en silencio.
     */
    const items = (s.item_list || []).map((x) => ({
      imagen: rutaImg(x.item_image), titulo: limpio(x.item_title), texto: limpio(x.item_desc),
      boton: limpio(x.item_button_primary_text),
    }));
    return { ...comun, tipo: 'sliderJet', items };
  }
  if (t === 'jet-video') {
    return { ...comun, tipo: 'video',
      youtube: s.youtube_url || null, vimeo: s.vimeo_url || null,
      miniatura: rutaImg(s.thumbnail), aspecto: s.aspect_ratio || null };
  }
  // Cualquier otro widget se conserva marcado, para saber que existe y decidir
  return { ...comun, tipo: 'sinMapear', widget: t, muestra: limpio(JSON.stringify(s)).slice(0, 120) };
}

/**
 * Medidas de un contenedor (relleno y margen), listas para CSS.
 *
 * Elementor las guarda con su unidad. En `%` se emiten tal cual, y eso es correcto
 * porque CSS tambien resuelve los porcentajes de `padding` contra el ANCHO, igual
 * que Elementor. Sin esto, todas las secciones recibian el mismo relleno fijo y las
 * alturas no tenian nada que ver con el original.
 */
function medidas(ajustes, prop) {
  const m = ajustes?.[prop];
  if (!m || typeof m !== 'object') return null;
  const u = m.unit === '%' ? '%' : 'px';
  const v = (x) => (x === undefined || x === null || x === '' ? 0 : parseFloat(x));
  const [t, r, b, l] = [v(m.top), v(m.right), v(m.bottom), v(m.left)];
  if (!t && !r && !b && !l) return null;
  return `${t}${u} ${r}${u} ${b}${u} ${l}${u}`;
}

/**
 * COLUMNAS REALES DE UNA SECCION.
 *
 * Aqui estaba el fallo mas caro de esta fase. Elementor envuelve las columnas de
 * verdad dentro de una columna exterior cuando la seccion tiene una sola, y mi
 * version anterior recorria el arbol empujando cada columna interior como HERMANA de
 * la exterior. El resultado: secciones con seis o siete columnas donde las primeras
 * estaban VACIAS y la ultima se llevaba todos los widgets — y todas con ancho 100 %,
 * asi que una rejilla de catorce tarjetas se pintaba como una pila de 4800 px de alto
 * contra los 1049 del original.
 *
 * La regla es simple: **una columna que solo envuelve a otras columnas no es una
 * columna, es un envoltorio**, y se baja un nivel. Los widgets pertenecen a la
 * columna que los contiene directamente.
 */
function columnasDe(hijos) {
  const hojas = [];
  const visitar = (nodos) => {
    for (const c of nodos || []) {
      /*
       * Un widget suelto (sin columna que lo envuelva) se cuelga de una columna
       * propia. Descartarlo hacia desaparecer contenido sin ningun error.
       */
      if (c.elType === 'widget') {
        hojas.push({ ancho: 100, bloques: [bloqueDe(c)] });
        continue;
      }
      /*
       * SECCION INTERNA: Elementor permite meter una seccion dentro de una columna.
       * Sus columnas suben al nivel de la seccion exterior, que es como se comporta
       * en pantalla. Filtrar solo por `column` las descartaba enteras — y con ellas
       * se iban las catorce tarjetas de problematicas de la home.
       */
      if (c.elType === 'section' || c.elType === 'container') {
        const dentro = c.elements || [];
        const pareceColumna = dentro.length > 0 && dentro.every((h) => h.elType === 'column');
        if (!pareceColumna) { visitar(dentro); continue; }
      }
      if (c.elType !== 'column' && c.elType !== 'container') {
        if (c.elements) visitar(c.elements);
        continue;
      }
      const dentro = c.elements || [];
      const subColumnas = dentro.filter((h) => h.elType === 'column' || h.elType === 'container' || h.elType === 'section');
      const widgets = dentro.filter((h) => h.elType === 'widget');
      // Una columna que SOLO envuelve a otras columnas no es una columna: es un
      // envoltorio, y se baja un nivel.
      if (subColumnas.length && !widgets.length) {
        visitar(subColumnas);
        continue;
      }
      hojas.push({
        fondo: fondoDe(c.settings),
        /*
         * EL ANCHO DE COLUMNA NO ESTA EN `width`. Elementor lo guarda en
         * `_column_size` (el reparto base: 100 entera, 50 media, 33 un tercio) y en
         * `_inline_size` cuando el autor lo afina. Leer `settings.width` devolvia
         * `undefined` SIEMPRE, asi que todas las columnas quedaban al 100 % y una
         * rejilla de seis tarjetas se pintaba como seis filas en vez de dos.
         */
        ancho: num(c.settings?._inline_size) ?? num(c.settings?._column_size) ?? 100,
        relleno: medidas(c.settings, 'padding'),
        bloques: widgets.map(bloqueDe),
      });
      if (subColumnas.length) visitar(subColumnas);
    }
  };
  visitar(hijos);
  return hojas;
}

/**
 * Recorre el arbol conservando la jerarquia: seccion -> columna -> widget.
 * La jerarquia importa porque el fondo es de la SECCION y las columnas reparten el
 * ancho.
 */
function recorrer(nodos, acumulador) {
  for (const n of nodos || []) {
    if (n.elType === 'section' || n.elType === 'container') {
      const seccion = {
        _id: n.id,
        ...(n.elType === 'container' ? { contenedor: true } : {}),
        fondo: fondoDe(n.settings),
        relleno: medidas(n.settings, 'padding'),
        margen: medidas(n.settings, 'margin'),
        estirada: n.settings?.stretch_section === 'section-stretched' || undefined,
        columnas: columnasDe(n.elements),
      };
      acumulador.push(seccion);
    } else if (n.elements) {
      recorrer(n.elements, acumulador);
    }
  }
}

const secciones = [];
recorrer(Array.isArray(j) ? j : (j.content || j.elements || j.sections || []), secciones);

const modelo = { pagina: NOMBRE, secciones };
const salida = path.join(RAIZ, 'astro-site', 'src', 'contenido', NOMBRE + '.json');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, JSON.stringify(modelo, null, 1), 'utf8');

const bloques = secciones.reduce((a, s) => a + s.columnas.reduce((b, c) => b + c.bloques.length, 0), 0);
const sinMapear = new Map();
const contar = (m) => m.secciones.forEach((s) => s.columnas.forEach((c) => c.bloques.forEach((b) => {
  if (b.tipo === 'sinMapear') sinMapear.set(b.widget, (sinMapear.get(b.widget) || 0) + 1);
})));
contar(modelo);

console.log(`${NOMBRE}: ${secciones.length} secciones, ${bloques} bloques -> ${path.relative(RAIZ, salida)}`);
if (sinMapear.size) console.log('  widgets sin mapear: ' + [...sinMapear].map(([k, v]) => `${k}:${v}`).join(', '));
console.log('  tipos: ' + (() => {
  const c = {};
  modelo.secciones.forEach((s) => s.columnas.forEach((x) => x.bloques.forEach((b) => { c[b.tipo] = (c[b.tipo] || 0) + 1; })));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ');
})());
