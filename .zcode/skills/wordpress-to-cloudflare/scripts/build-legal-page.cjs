/**
 * Genera src/pages/charte-de-protection-des-donnees-personnelles.astro a partir del
 * HTML renderizado del original. El contenido legal NUNCA se imprime en consola:
 * el script solo reporta métricas (bytes, nº de nodos, imágenes).
 */
const fs = require('fs');
const path = require('path');

(async () => {

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'reference/rendered/charte.html');
const OUT = path.join(ROOT, 'astro-site/src/pages/charte-de-protection-des-donnees-personnelles.astro');
const IMG_DIR = path.join(ROOT, 'astro-site/public/images/charte');

const html = fs.readFileSync(SRC, 'utf8');
const docTitle = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Protection des Données Personnelles';

let body = html.slice(html.search(/<\/header>/i), html.search(/<footer|data-elementor-type=.footer./i));
body = body
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<form[\s\S]*?<\/form>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

// El título de página del banner sale del primer h1 (si existe) y se elimina del cuerpo
const h1Match = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
const pageTitle = h1Match
  ? h1Match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  : 'Protection des Données Personnelles';
if (h1Match) body = body.replace(h1Match[0], '');

// Sanear atributos: solo se conservan href/src/alt/target/colspan/rowspan
body = body.replace(/<([a-z][a-z0-9]*)((?:\s+[^<>]*?)?)>/gi, (m, tag, attrs) => {
  const keep = [];
  const re = /(href|src|alt|target|colspan|rowspan)="([^"]*)"/gi;
  let a;
  while ((a = re.exec(attrs))) {
    let [, name, value] = a;
    if (name === 'href' && value.startsWith('/')) value = `https://pharmacie-puymirol.com${value}`;
    if (name === 'src' && value.startsWith('/')) value = `https://pharmacie-puymirol.com${value}`;
    keep.push(`${name.toLowerCase()}="${value}"`);
  }
  return `<${tag}${keep.length ? ' ' + keep.join(' ') : ''}>`;
});
body = body.replace(/<\/?(div|span|section|article|header|footer|nav|aside|main|figure|figcaption|br)\b[^>]*>/gi, (m) =>
  /^<br/i.test(m) ? '<br />' : '',
);
body = body.replace(/(<p>|<ul>|<ol>|<table>|<h[2-6]>)\s+/gi, '$1').replace(/\s+(<\/p>|<\/ul>|<\/ol>|<\/table>|<\/h[2-6]>)/gi, '$1');

// Imágenes: descargarlas a /images/charte/ y reescribir src
fs.mkdirSync(IMG_DIR, { recursive: true });
let imgIndex = 0;
let imgCount = 0;
const imgUrls = [...body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)].map((m) => m[1]);
for (const url of imgUrls) {
  imgIndex += 1;
  const ext = (url.match(/\.(jpe?g|png|gif|webp|svg)(\?|$)/i) || [])[1] || 'jpg';
  const fname = `charte-${imgIndex}.${ext.toLowerCase()}`;
  const dest = path.join(IMG_DIR, fname);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    body = body.replace(url, `/images/charte/${fname}`);
    imgCount += 1;
  } catch (e) {
    // imagen no descargable: se elimina del documento
    body = body.replace(new RegExp(`<img[^>]*src="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'gi'), '');
  }
}

// Párrafos vacíos fuera
body = body.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();

const astro = `---
import BasePage from '../components/BasePage.astro';
import Breadcrumb from '../components/Breadcrumb.astro';

const title = ${JSON.stringify(docTitle)};
const description = "Charte de protection des données personnelles de la Pharmacie Puymirol (32 rue Royale, 47270 PUYMIROL).";
---

<BasePage title={title} description={description} ogType="article">
  <Breadcrumb items={[{ label: 'Protection des Données Personnelles' }]} />

  <!-- Banner verde -->
  <section class="bg-teal-500 py-10 lg:py-14">
    <div class="container-site text-center">
      <h1 class="text-4xl font-bold text-white lg:text-[56px] lg:leading-tight">${pageTitle.replace(/`/g, '')}</h1>
    </div>
  </section>

  <!-- Contenido legal (migrado del original por script) -->
  <section class="bg-white py-10 dark:bg-ink-900 lg:py-14">
    <div class="container-site charte-content max-w-4xl text-[14px] leading-relaxed text-ink-600 dark:text-ink-300" style="max-width: 56rem">
${body
  .split('\n')
  .map((l) => '      ' + l.trim())
  .filter((l) => l.trim())
  .join('\n')}
    </div>
  </section>
</BasePage>

<style>
  /* Tipografía legal fiel: títulos y listas del documento */
  .charte-content :global(h2) { font-size: 1.5rem; font-weight: 700; margin: 1.6em 0 0.6em; color: var(--color-ink-700); }
  .charte-content :global(h3) { font-size: 1.2rem; font-weight: 700; margin: 1.4em 0 0.5em; color: var(--color-ink-700); }
  .charte-content :global(h4) { font-size: 1.05rem; font-weight: 700; margin: 1.2em 0 0.4em; color: var(--color-ink-700); }
  .charte-content :global(p) { margin: 0.8em 0; }
  .charte-content :global(ul) { list-style: disc; padding-left: 1.4rem; margin: 0.8em 0; }
  .charte-content :global(ol) { list-style: decimal; padding-left: 1.4rem; margin: 0.8em 0; }
  .charte-content :global(li) { margin: 0.35em 0; }
  .charte-content :global(table) { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9rem; }
  .charte-content :global(td), .charte-content :global(th) { border: 1px solid var(--color-ink-200); padding: 0.5em 0.7em; text-align: left; }
  .charte-content :global(a) { text-decoration: underline; }
  .dark .charte-content :global(h2), .dark .charte-content :global(h3), .dark .charte-content :global(h4) { color: var(--color-ink-100); }
</style>
`;

fs.writeFileSync(OUT, astro);
console.log('OK  title-attr:', JSON.stringify(docTitle.slice(0, 60)));
console.log('OK  banner h1 (primeras palabras):', JSON.stringify(pageTitle.split(' ').slice(0, 4).join(' ')) + '...');
console.log('OK  body bytes:', body.length);
console.log('OK  imagenes descargadas:', imgCount, 'de', imgUrls.length);
console.log('OK  escrito en:', path.relative(ROOT, OUT));

})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
