/*
 * ESQUEMA DEL CONTENIDO DE ELEMENTOR (las homes y las presentaciones).
 *
 * Recorre el arbol de Elementor y lista, por seccion, los widgets que la componen
 * con su tipo, sus encabezados y cuanto texto llevan. Es el plano para reconstruir
 * la pagina sin leer el HTML entero.
 *
 * Uso:  node tools/esquema-elementor.cjs home-landing-page-en
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const NOMBRE = process.argv[2];
if (!NOMBRE) { console.error('Falta el nombre, por ejemplo: home-landing-page-en'); process.exit(1); }

const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'reference', 'elementor', NOMBRE + '.json'), 'utf8'));

/** Texto de un widget, sin etiquetas. */
const limpio = (s) => String(s ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const TITULO = { heading: 'ENCABEZADO', 'text-editor': 'TEXTO', image: 'IMAGEN', button: 'BOTON',
  video: 'VIDEO', 'icon-list': 'LISTA', 'icon-box': 'CAJA', divider: 'SEPARADOR', spacer: 'ESPACIO',
  'google_maps': 'MAPA', 'shortcode': 'SHORTCODE', 'html': 'HTML', 'image-carousel': 'CARRUSEL-IMG',
  'image-gallery': 'GALERIA', 'tabs': 'PESTANAS', 'accordion': 'ACORDEON', 'toggle': 'DESPLEGABLE',
  'social-icons': 'ICONOS-SOCIALES', 'icon': 'ICONO', 'counter': 'CONTADOR', 'progress': 'BARRA',
  'testimonial': 'TESTIMONIO', 'form': 'FORMULARIO', 'nav-menu': 'MENU', 'sidebar': 'BARRA-LAT',
  'posts': 'ENTRADAS', 'portfolio': 'PORTAFOLIO', 'slides': 'DIAPOSITIVAS', 'wp-widget-*': 'WIDGET' };

let totalWidgets = 0, totalTexto = 0, totalImgs = 0;
const cuenta = {};

function recorrer(nodos, profundidad, salida) {
  for (const n of nodos || []) {
    const tipo = n.widgetType || n.elType;
    if (n.elType === 'widget' && n.widgetType) {
      totalWidgets++;
      const s = n.settings || {};
      const texto = limpio(s.title ?? s.text ?? s.editor ?? s.description ?? s.title_text ?? '');
      const enc = s.title ? limpio(s.title).slice(0, 80) : null;
      const img = s.image?.url ? String(s.image.url).split('?')[0].split('/').pop() : null;
      const extras = [];
      if (s.link?.url) extras.push('enlace-> ' + String(s.link.url).slice(0, 60));
      if (s.video_type || s.youtube_url) extras.push('video');
      if (s.shortcode) extras.push('shortcode: ' + limpio(s.shortcode).slice(0, 60));
      if (img) totalImgs++;
      totalTexto += texto.length;
      cuenta[n.widgetType] = (cuenta[n.widgetType] || 0) + 1;
      salida.push({ nivel: profundidad, papel: TITULO[n.widgetType] || n.widgetType, enc, texto, img, extras });
    }
    if (n.elements) recorrer(n.elements, profundidad + (n.elType === 'section' ? 1 : 0), salida);
  }
}

const salida = [];
// El JSON puede venir como arbol de secciones o envuelto
const raiz = Array.isArray(j) ? j : (j.content || j.elements || j.sections || []);
recorrer(raiz, 0, salida);

console.log(`=== ${NOMBRE} ===`);
console.log(`widgets: ${totalWidgets}   texto: ${totalTexto} caracteres   imagenes: ${totalImgs}`);
console.log('por tipo: ' + Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('');

salida.forEach((s, k) => {
  if (!s.enc && !s.texto && !s.img && !s.extras.length) return;
  const marca = '  '.repeat(Math.min(s.nivel, 3));
  console.log(`${marca}[${k + 1}] ${s.papel}`);
  if (s.enc) console.log(marca + '    TITULO: ' + s.enc);
  if (s.img) console.log(marca + '    imagen: ' + s.img);
  s.extras.forEach((e) => console.log(marca + '    ' + e));
  if (s.texto && s.texto !== s.enc) console.log(marca + '    > ' + s.texto.slice(0, 300) + (s.texto.length > 300 ? ' …' : ''));
});
