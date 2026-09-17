/*
 * Extrae las FUENTES de los sliders desde el marcado renderizado.
 *
 * QUÉ FALTABA
 *   RevSlider emite un bloque `<style class="sr7-inline-css">` con las
 *   declaraciones `@font-face` de las tipografias que usan sus capas, y ademas pone
 *   la familia de cada capa en un `style` en linea (`font-family:'Martel Sans'`).
 *
 *   Sin ese bloque, el navegador NO encuentra la tipografia y usa una sustituta con
 *   METRICAS DISTINTAS: el texto ocupa mas ancho y mas alto de lo previsto y acaba
 *   solapando con las capas vecinas. Es la causa real de los solapamientos, y no se
 *   ve en el HTML —las clases y la familia estan bien escritas— sino en como se
 *   distribuye el texto al pintarlo.
 *
 * QUE HACE
 *   Lee el bloque, descarga los .woff2 al proyecto y reescribe las rutas para
 *   servirlos desde el propio sitio. Nada de depender de Google Fonts en tiempo de
 *   ejecucion: el original ya las auto-hospeda y es lo coherente con el proyecto.
 *
 * Uso: node tools/extract-slider-fonts.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RENDERED = path.join(ROOT, 'reference', 'rendered');
const DESTINO_CSS = path.join(ROOT, 'astro-site', 'src', 'styles', 'fuentes-sliders.css');
const DESTINO_FUENTES = path.join(ROOT, 'astro-site', 'public', 'fonts');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bloques @font-face con su familia y la URL del fichero. */
function extraerFontFaces(css) {
  const out = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const cuerpo = m[1];
    const fam = (cuerpo.match(/font-family:\s*['"]?([^;'"]+)/i) || [])[1];
    const peso = (cuerpo.match(/font-weight:\s*([^;]+)/i) || [])[1];
    const estilo = (cuerpo.match(/font-style:\s*([^;]+)/i) || [])[1];
    const rango = (cuerpo.match(/unicode-range:\s*([^;]+)/i) || [])[1];
    const url = (cuerpo.match(/url\(\s*['"]?([^'")]+)/i) || [])[1];
    if (fam && url) out.push({ familia: fam.trim(), peso: peso ? peso.trim() : null, estilo: estilo ? estilo.trim() : null, rango: rango ? rango.trim() : null, url: url.trim() });
  }
  return out;
}

(async () => {
  const todas = new Map(); // url -> datos
  const porFamilia = new Map();

  for (const f of fs.readdirSync(RENDERED)) {
    if (!f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(RENDERED, f), 'utf8');
    for (const m of html.matchAll(/<style[^>]*class="[^"]*sr7-inline-css[^"]*"[^>]*>([\s\S]*?)<\/style>/gi)) {
      for (const ff of extraerFontFaces(m[1])) {
        if (!todas.has(ff.url)) todas.set(ff.url, ff);
        if (!porFamilia.has(ff.familia)) porFamilia.set(ff.familia, new Set());
        porFamilia.get(ff.familia).add(ff.peso || '400');
      }
    }
  }

  if (!todas.size) {
    console.error('No se encontro ningun bloque sr7-inline-css con @font-face.');
    console.error('Comprobar que el marcado renderizado esta en reference/rendered/.');
    process.exit(2);
  }

  console.log(`Tipografias de los sliders encontradas: ${porFamilia.size}\n`);
  for (const [fam, pesos] of porFamilia) console.log(`  ${fam.padEnd(20)} pesos: ${[...pesos].join(', ')}`);
  console.log(`\nFicheros de fuente distintos: ${todas.size}\n`);

  fs.mkdirSync(DESTINO_FUENTES, { recursive: true });

  let bajados = 0, yaEstaban = 0, fallos = 0, bytes = 0;
  const reglas = [];

  for (const [url, ff] of todas) {
    const nombre = decodeURIComponent(url.split('/').pop().split('?')[0]);
    const destino = path.join(DESTINO_FUENTES, nombre);

    if (fs.existsSync(destino) && fs.statSync(destino).size > 0) {
      yaEstaban++;
    } else {
      // Las URLs del marcado son RELATIVAS AL PROTOCOLO ("//e-nation.org/...").
      // `fetch` no las parsea: hay que anteponer el esquema.
      const absoluta = url.startsWith('//') ? 'https:' + url : url;
      try {
        const res = await fetch(absoluta, { headers: { 'User-Agent': UA } });
        if (!res.ok) { fallos++; console.log(`  FALLO ${res.status}  ${nombre}`); await esperar(120); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(destino, buf);
        bajados++; bytes += buf.length;
        await esperar(150);
      } catch (e) { fallos++; console.log(`  FALLO ${nombre}: ${String(e).slice(0, 40)}`); continue; }
    }

    // El `format()` tiene que corresponder al TIPO DE FICHERO. Declarar
    // `format('woff2')` para un .ttf hace que algunos navegadores descarten la
    // fuente, y el texto vuelve a caer en una sustituta sin avisar.
    const ext = (nombre.match(/\.(woff2|woff|ttf|otf)$/i) || [])[1]?.toLowerCase();
    const formato = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype';

    reglas.push(
      [
        '@font-face {',
        `  font-family: '${ff.familia}';`,
        ff.estilo ? `  font-style: ${ff.estilo};` : null,
        ff.peso ? `  font-weight: ${ff.peso};` : null,
        '  font-display: swap;',
        `  src: url('/fonts/${nombre}') format('${formato}');`,
        ff.rango ? `  unicode-range: ${ff.rango};` : null,
        '}',
      ].filter(Boolean).join('\n')
    );
  }

  const cabecera = [
    '/*',
    ' * Tipografias de los sliders, AUTO-HOSPEDADAS.',
    ' *',
    ' * ARCHIVO GENERADO por `tools/extract-slider-fonts.cjs` desde el bloque',
    ' * `sr7-inline-css` del marcado renderizado. No editar a mano.',
    ' *',
    ' * POR QUE HACE FALTA: RevSlider declara sus @font-face en un <style> en linea del',
    ' * propio HTML, y asigna la familia de cada capa en un `style` en linea. Si ese',
    ' * bloque no se traslada, el navegador sustituye la tipografia por otra con',
    ' * METRICAS DISTINTAS: el texto ocupa mas de lo previsto y se solapa con las capas',
    ' * vecinas. El sintoma no se ve en el HTML, solo al pintar.',
    ' *',
    ' * Los .woff2 se sirven desde /fonts/ y no desde Google: el original ya las',
    ' * auto-hospeda y no conviene depender de un tercero en tiempo de ejecucion.',
    ' */',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(DESTINO_CSS), { recursive: true });
  fs.writeFileSync(DESTINO_CSS, cabecera + reglas.join('\n\n') + '\n', 'utf8');

  console.log(`descargadas: ${bajados} (${(bytes / 1024).toFixed(0)} KB)   ya estaban: ${yaEstaban}   fallos: ${fallos}`);
  console.log(`\nEscrito ${path.relative(ROOT, DESTINO_CSS)} con ${reglas.length} reglas @font-face`);
  console.log(`Fuentes en ${path.relative(ROOT, DESTINO_FUENTES)}`);
})();
