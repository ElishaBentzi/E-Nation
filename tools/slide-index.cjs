/*
 * Genera el INDICE DE DIAPOSITIVAS de los sliders.
 *
 * PARA QUE SIRVE
 *   La pagina de presentacion viene de una presentacion de diapositivas, y el
 *   carrusel de banners tiene 21. Para poder hablar de una concreta hace falta un
 *   vocabulario COMUN: un numero estable, su titulo y su destino.
 *
 *   Este indice da las tres cosas, mas los textos que aparecen dentro, que es por
 *   donde se reconoce una diapositiva de un vistazo. Asi se puede decir "la 7, la
 *   de SBM Juegos" y las dos partes hablamos de la misma.
 *
 *   Se regenera con `node tools/slide-index.cjs` para que no se desincronice de la
 *   configuracion.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SLIDERS = path.join(ROOT, 'astro-site', 'src', 'sliders');
const DESTINO = path.join(ROOT, 'reference', 'INDICE-DIAPOSITIVAS.md');

const ficheros = fs.readdirSync(SLIDERS).filter((f) => f.endsWith('.json') && f !== 'idiomas.json');
// Idioma de cada diapositiva: archivo de decision, no de datos.
const IDIOMAS = fs.existsSync(path.join(SLIDERS, 'idiomas.json')) ? JSON.parse(fs.readFileSync(path.join(SLIDERS, 'idiomas.json'), 'utf8')) : {};
const lineas = [];
const p = (s = '') => lineas.push(s);

p('# Índice de diapositivas');
p();
p('Generado con `tools/slide-index.cjs`. **Cada diapositiva tiene un número estable**');
p('(su posición en el carrusel) con el que se puede pedir un cambio sin ambigüedad.');
p();
p('Cómo referirse a una: **«la 7, la de SBM Juegos»** — número, título y destino.');
p();

for (const f of ficheros.sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(SLIDERS, f), 'utf8'));
  const conEnlaces = c.slides.filter((s) => s.enlace).length;

  p(`## \`${c.id}\``);
  p();
  p(`- Diapositivas: **${c.slides.length}**`);
  p(`- Con enlace: ${conEnlaces}${conEnlaces === 0 ? ' (es un carrusel de adorno, sin destinos)' : ''}`);
  p(`- Lienzo: ${c.lienzo?.ancho ?? '?'} × ${c.lienzo?.alto ?? '?'}${c.lienzo?.anchoMaximo ? ` (máximo ${c.lienzo.anchoMaximo} px)` : ''}`);
  p(`- Guardado en: \`astro-site/src/sliders/${f}\``);
  p();

  if (c.slides.length > 1) {
    p('| # | idioma | título | destino | textos visibles |');
    p('|---|---|---|---|---|');
    c.slides.forEach((s, i) => {
      const textos = [...new Set(
        (s.capas || [])
          .filter((x) => x.tipo === 'texto' && x.texto)
          .map((x) => String(x.texto).replace(/<[^>]*>/g, '').trim())
          .filter(Boolean)
      )];
      const destino = s.enlace ? s.enlace.href.replace(/^https?:\/\//, '') : '—';
      const titulo = (s.titulo || '').slice(0, 24) || '—';
      const txt = textos.join(' · ').slice(0, 78) || '—';
      // El idioma sale de `idiomas.json`, que es un archivo de DECISION: se genero
      // detectandolo, pero se puede corregir a mano y no se pisa al regenerar.
      const idioma = ((IDIOMAS[c.id] || {})[String(i + 1)]) || '?';
      p(`| **${i + 1}** | ${idioma === '*' ? 'todos' : idioma} | ${titulo} | ${destino} | ${txt} |`);
    });
    p();
  } else {
    p('Una sola diapositiva:');
    p();
    const s = c.slides[0] || { capas: [] };
    const textos = (s.capas || []).filter((x) => x.tipo === 'texto' && x.texto).map((x) => String(x.texto).replace(/<[^>]*>/g, '').trim());
    p(`- Destino: ${s.enlace ? s.enlace.href : 'ninguno'}`);
    p(`- Textos: ${textos.filter(Boolean).join(' · ') || 'ninguno'}`);
    p();
  }
}

p('---');
p();
p('## Qué se puede pedir sobre una diapositiva');
p();
p('Todo lo que hay en la configuración es editable por diapositiva:');
p();
p('| Campo | Qué es |');
p('|---|---|');
p('| `enlace.href` | a dónde lleva el banner al pulsarlo |');
p('| `capas[].texto` | el texto de cada capa |');
p('| `capas[].estilos` | tipografía, tamaño, color |');
p('| `capas[].posicion` | dónde está colocada |');
p('| `capas[].animacion` | desde dónde entra y con cuánto retardo |');
p('| `fondo.imagen` | la imagen de fondo |');
p();
p('Las imágenes de los banners **viven en otros dominios** (los proyectos enlazados),');
p('así que cambiarlas es cambiar la URL. Ver `reference/ANALISIS-SLIDERS.md` para el');
p('reparto completo de assets por dominio.');
p();

fs.writeFileSync(DESTINO, lineas.join('\n') + '\n', 'utf8');
console.log(`Escrito ${path.relative(ROOT, DESTINO)}\n`);
for (const f of ficheros.sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(SLIDERS, f), 'utf8'));
  console.log(`  ${c.id.padEnd(22)} ${String(c.slides.length).padStart(3)} diapositivas, ${c.slides.filter((s) => s.enlace).length} con enlace`);
}
