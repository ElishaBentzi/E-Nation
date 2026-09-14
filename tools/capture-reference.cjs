/*
 * Captura el material de referencia del sitio WordPress original.
 *
 * QUE DESCARGA
 *   1. El HTML RENDERIZADO de cada pagina (DOM post-JS), no el fuente.
 *   2. Los bloques <style> inline de cada pagina, en su propio archivo.
 *   3. El CSS en su RUTA ORIGINAL (ver nota) mas el CSS de Elementor de cada
 *      pagina, los estilos del tema, los de los plugins de efectos y las fuentes.
 *   4. Un inventario de todo lo referenciado, con pesos, en reference/INDEX.md.
 *
 * LA CLAVE: WP Rocket reescribe las URLs del CSS a rutas de cache
 * (/cache/min/1/... y /cache/background-css/1/...). Descargar lo que enlaza el
 * HTML da archivos MINIFICADOS y combinados, ilegibles justo para lo que hacen
 * falta: extraer la paleta, los radios, las sombras y los efectos. Por eso el
 * script recupera la ruta original quitando el prefijo de cache y descarga ESA.
 *
 * Uso: node tools/capture-reference.cjs [--solo-html] [--solo-css]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RENDERED = path.join(ROOT, 'reference', 'rendered');
const CSSDIR = path.join(ROOT, 'reference', 'css');
const ORIGIN = 'https://e-nation.org';

const PAGINAS = [
  { slug: 'home-en', url: '/' },
  { slug: 'presentation-en', url: '/presentation/' },
  { slug: 'articles-en', url: '/articles/' },
  { slug: 'news-en', url: '/news/' },
  { slug: 'verify-en', url: '/verify/' },
  { slug: 'privacy-policy-en', url: '/privacy-policy/' },
  { slug: 'terms-and-conditions-en', url: '/terms-and-conditions/' },
  { slug: 'home-es', url: '/es/' },
  { slug: 'presentacion-es', url: '/es/presentacion/' },
  { slug: 'articulos-es', url: '/es/articulos/' },
  { slug: 'noticias-es', url: '/es/noticias/' },
  { slug: 'verificar-es', url: '/es/verificar/' },
  { slug: 'politica-de-privacidad-es', url: '/es/politica-de-privacidad/' },
  { slug: 'terminos-y-condiciones-es', url: '/es/terminos-condiciones-del-servicio/' },
  { slug: 'articles-fr', url: '/fr/articles/' },
  { slug: 'nouvelles-fr', url: '/fr/nouvelles/' },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const solo = process.argv.includes('--solo-html') ? 'html'
  : process.argv.includes('--solo-css') ? 'css' : 'todo';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function traer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  if (!res.ok) return { ok: false, status: res.status, cuerpo: null };
  return { ok: true, status: res.status, cuerpo: await res.text() };
}

/**
 * Recupera la ruta original desde una URL reescrita por WP Rocket.
 *   /zero/wp-content/cache/min/1/zero/wp-content/plugins/x.css
 *     -> /zero/wp-content/plugins/x.css
 *   /zero/wp-content/cache/background-css/1/e-nation.org/zero/wp-content/uploads/y.css
 *     -> /zero/wp-content/uploads/y.css
 */
function rutaOriginal(u) {
  let s = u.replace(ORIGIN, '');
  s = s.replace(/^\/zero\/wp-content\/cache\/background-css\/\d+\/[^/]+\//, '/');
  s = s.replace(/^\/zero\/wp-content\/cache\/min\/\d+\//, '/');
  return s.split('?')[0];
}

/**
 * Convierte una ruta del sitio en una ruta local que REPLICA la estructura de
 * directorios original. Se replica en vez de aplanar el nombre porque asi el
 * material es navegable igual que el sitio (themes/dt-the7/css/...) y no hay
 * colisiones entre archivos que se llaman igual en carpetas distintas.
 */
function rutaLocal(ruta) {
  const limpia = ruta.split('?')[0].replace(/^\/+/, '');
  return path.join(CSSDIR, limpia);
}

/** Extrae las URLs de CSS y JS referenciadas en un HTML. */
function recursosDe(html) {
  const css = new Map(), js = new Map(), elementor = new Set();
  const re = /(?:href|src)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const bruto = m[1];
    const abs = bruto.startsWith('http') ? bruto : ORIGIN + (bruto.startsWith('/') ? '' : '/') + bruto;
    if (!abs.includes('e-nation.org')) continue;
    const orig = rutaOriginal(abs);
    if (/\.css$/i.test(orig)) {
      // Se guarda tambien la URL absoluta tal cual aparece: si la ruta original
      // da 404 (hay assets que solo existen dentro de la cache de WP Rocket),
      // hay que poder caer a la que si funciona.
      css.set(orig, abs.split('?')[0]);
      if (/uploads\/elementor\/css\/post-\d+\.css$/.test(orig)) elementor.add(orig);
    } else if (/\.js$/i.test(orig)) {
      js.set(orig, abs.split('?')[0]);
    }
  }
  return { css: [...css.keys()].sort(), js: [...js.keys()].sort(), elementor: [...elementor].sort(), cssUrls: css, jsUrls: js };
}

/** Extrae los bloques <style> inline, en orden, con su contenido. */
function estilosInline(html) {
  const bloques = [];
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = (m[1] || '').trim();
    const id = (attrs.match(/id=["']([^"']+)["']/) || [])[1] || `bloque-${bloques.length + 1}`;
    bloques.push({ id, attrs, contenido: m[2] });
  }
  return bloques;
}

(async () => {
  fs.mkdirSync(RENDERED, { recursive: true });
  fs.mkdirSync(CSSDIR, { recursive: true });

  const inventario = [];
  const cssGlobal = new Set();
  const jsGlobal = new Set();
  // ruta original -> URL absoluta que enlaza el HTML (para la reserva de cache)
  const cssUrls = new Map();
  const jsUrls = new Map();

  /** Acumula los recursos de un HTML en los conjuntos globales. */
  const acumular = (html) => {
    const rec = recursosDe(html);
    for (const [k, v] of rec.cssUrls) { cssGlobal.add(k); if (!cssUrls.has(k)) cssUrls.set(k, v); }
    for (const [k, v] of rec.jsUrls) { jsGlobal.add(k); if (!jsUrls.has(k)) jsUrls.set(k, v); }
    return rec;
  };

  // La lista de CSS se construye SIEMPRE leyendo los HTML del disco, no solo los
  // que se acaban de descargar. Asi `--solo-css` funciona por si solo y el
  // script es reanudable: si una pasada se corta, la siguiente continua.
  const leerRecursosDeDisco = () => {
    for (const p of PAGINAS) {
      const f = path.join(RENDERED, `${p.slug}.html`);
      if (!fs.existsSync(f)) continue;
      acumular(fs.readFileSync(f, 'utf8'));
    }
  };

  if (solo !== 'css') {
    console.log('=== 1. HTML renderizado y estilos inline ===\n');
    for (const p of PAGINAS) {
      const r = await traer(ORIGIN + p.url);
      if (!r.ok) {
        console.log(`  ${p.slug.padEnd(30)} FALLO ${r.status}`);
        inventario.push({ ...p, error: `HTTP ${r.status}` });
        await esperar(300);
        continue;
      }
      const html = r.cuerpo;
      fs.writeFileSync(path.join(RENDERED, `${p.slug}.html`), html, 'utf8');

      const bloques = estilosInline(html);
      const css = bloques.map((b) => `/* ---- ${b.id} ${b.attrs} ---- */\n${b.contenido.trim()}`).join('\n\n');
      fs.writeFileSync(
        path.join(RENDERED, `${p.slug}.inline.css`),
        `/* Estilos inline de ${p.url} — ${bloques.length} bloques */\n\n${css}\n`,
        'utf8'
      );

      const rec = acumular(html);

      inventario.push({
        ...p,
        htmlBytes: Buffer.byteLength(html, 'utf8'),
        inlineBloques: bloques.length,
        inlineBytes: Buffer.byteLength(css, 'utf8'),
        css: rec.css.length,
        js: rec.js.length,
        elementorCss: rec.elementor,
      });

      console.log(`  ${p.slug.padEnd(30)} html ${String(Buffer.byteLength(html, 'utf8')).padStart(7)} B · inline ${String(bloques.length).padStart(2)} bloques · css ${String(rec.css.length).padStart(2)} · js ${String(rec.js.length).padStart(2)}`);
      await esperar(300); // cortesia con el servidor
    }
  }

  // En modo `--solo-css` los HTML ya estan en disco, asi que el inventario de
  // paginas se reconstruye de ellos en vez de quedar vacio.
  if (solo === 'css') {
    for (const p of PAGINAS) {
      const f = path.join(RENDERED, `${p.slug}.html`);
      if (!fs.existsSync(f)) { inventario.push({ ...p, error: 'HTML no capturado' }); continue; }
      const html = fs.readFileSync(f, 'utf8');
      const rec = acumular(html);
      const inline = fs.existsSync(path.join(RENDERED, `${p.slug}.inline.css`))
        ? fs.statSync(path.join(RENDERED, `${p.slug}.inline.css`)).size : 0;
      inventario.push({
        ...p,
        htmlBytes: Buffer.byteLength(html, 'utf8'),
        inlineBloques: estilosInline(html).length,
        inlineBytes: inline,
        css: rec.css.length,
        js: rec.js.length,
        elementorCss: rec.elementor,
      });
    }
  }

  leerRecursosDeDisco();

  if (solo !== 'html') {
    console.log('\n=== 2. CSS en su ruta ORIGINAL (no la minificada de cache) ===\n');
    const lista = [...cssGlobal].sort();
    let ok = 0, fallos = 0, porCache = 0, bytes = 0;
    for (const ruta of lista) {
      const destino = rutaLocal(ruta);
      if (fs.existsSync(destino) && fs.statSync(destino).size > 0) {
        console.log(`  ${ruta.slice(0, 70).padEnd(72)} ya estaba`);
        ok++;
        continue;
      }
      fs.mkdirSync(path.dirname(destino), { recursive: true });

      let r = await traer(ORIGIN + ruta);
      let via = 'original';

      // Hay assets que solo existen dentro de la cache de WP Rocket (por
      // ejemplo el CSS del formulario de Mailchimp, que vive fuera de
      // wp-content). Si la ruta original no esta, se usa la que enlaza el HTML.
      if (!r.ok) {
        const urlCache = cssUrls.get(ruta);
        if (urlCache) {
          r = await traer(urlCache);
          via = 'cache';
        }
      }

      if (!r.ok) {
        console.log(`  ${ruta.slice(0, 70).padEnd(72)} FALLO ${r.status}`);
        fallos++;
        await esperar(200);
        continue;
      }
      fs.writeFileSync(destino, r.cuerpo, 'utf8');
      const b = Buffer.byteLength(r.cuerpo, 'utf8');
      bytes += b;
      ok++;
      if (via === 'cache') porCache++;
      console.log(`  ${ruta.slice(0, 70).padEnd(72)} ${String(b).padStart(8)} B${via === 'cache' ? '  (desde cache)' : ''}`);
      await esperar(250);
    }
    console.log(`\n  descargados ${ok} (${fallos} fallos, ${porCache} desde la cache de WP Rocket), ${bytes} bytes nuevos`);
  }

  // Inventario para consumo humano y para el registro de findings
  const lineas = [];
  lineas.push('# Inventario de recursos del original');
  lineas.push('');
  lineas.push(`Capturado con \`tools/capture-reference.cjs\` desde ${ORIGIN}.`);
  lineas.push('');
  lineas.push('> El CSS se descarga en su **ruta original**, no en la de cache de WP Rocket:');
  lineas.push('> lo que enlaza el HTML esta minificado y combinado, e ilegible para extraer diseno.');
  lineas.push('');
  lineas.push('## Paginas');
  lineas.push('');
  lineas.push('| slug | url | HTML | inline | css | js | Elementor por pagina |');
  lineas.push('|---|---|---|---|---|---|---|');
  for (const i of inventario) {
    if (i.error) { lineas.push(`| ${i.slug} | ${i.url} | **${i.error}** | | | | |`); continue; }
    lineas.push(`| ${i.slug} | \`${i.url}\` | ${i.htmlBytes} B | ${i.inlineBloques} bloques / ${i.inlineBytes} B | ${i.css} | ${i.js} | ${i.elementorCss.map((e) => '`' + e.split('/').pop() + '`').join(' ')} |`);
  }
  lineas.push('');
  lineas.push('## CSS descargado');
  lineas.push('');
  const archivos = fs.existsSync(CSSDIR) ? fs.readdirSync(CSSDIR).sort() : [];
  lineas.push(`Total: ${archivos.length} archivos en \`reference/css/\`.`);
  lineas.push('');
  for (const a of archivos) {
    const b = fs.statSync(path.join(CSSDIR, a)).size;
    lineas.push(`- \`${a}\` — ${b} B`);
  }
  fs.writeFileSync(path.join(ROOT, 'reference', 'INDEX.md'), lineas.join('\n') + '\n', 'utf8');

  console.log(`\nInventario escrito en reference/INDEX.md`);
  console.log(`CSS totales: ${cssGlobal.size} | JS referenciados: ${jsGlobal.size}`);
})();
