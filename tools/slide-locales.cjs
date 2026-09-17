/*
 * Genera el mapa de IDIOMA de cada diapositiva.
 *
 * CORRECCION DE ENFOQUE
 *   La primera version de esta herramienta DEDUCIA el idioma puntuando palabras y
 *   caracteres del texto. Funcionaba, pero era resolver un problema que el dato ya
 *   resolvia: RevSlider declara el idioma de cada diapositiva en su campo
 *   `child.language`, y ademas organiza las diapositivas en PADRE E HIJOS.
 *
 *   Ahora el idioma DECLARADO manda, y la deteccion por texto queda solo como
 *   ultimo recurso para diapositivas que no lo declaren. Si las dos discrepan, se
 *   avisa: significa que una diapositiva declara un idioma y su texto esta en otro.
 *
 * Uso: node tools/slide-locales.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SLIDERS = path.join(ROOT, 'astro-site', 'src', 'sliders');
const ORIGEN = path.join(ROOT, 'reference', 'sliders');
const DESTINO = path.join(SLIDERS, 'idiomas.json');

/** Quita acentos para comparar sin depender de la ortografia. */
function sinAcentos(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Ultimo recurso: marcas de cada idioma. Solo palabras que discriminen — las que
// son iguales en varios idiomas hacen empatar y no sirven.
const MARCAS = {
  es: { caracteres: /[ñ¿¡]/, palabras: ['juega', 'coopera', 'crecer', 'edicion', 'espanol', 'participacion', 'politica', 'sociedad', 'bienestar', 'para', 'nueva', 'venezuela', 'etica', 'disen', 'nuestra', 'verdadera', 'libertad', 'monetaria'] },
  en: { caracteres: /\b\w*'(s|t|re)\b/, palabras: ['play', 'cooperate', 'grow', 'edition', 'english', 'participation', 'politics', 'society', 'welfare', 'workshops', 'book', 'the', 'and', 'our', 'true', 'freedom', 'monetary'] },
  fr: { caracteres: /[çœàèùêîô]/, palabras: ['societe', 'bien-etre', 'mutuel', 'edition', 'francais', 'participation', 'politique', 'ateliers', 'livre', 'modele', 'des', 'du', 'et', 'pour', 'notre', 'veritable', 'liberte', 'monetaire'] },
};

function deducirPorTexto(texto) {
  const limpio = sinAcentos(texto);
  const puntos = {};
  for (const [idioma, m] of Object.entries(MARCAS)) {
    let n = 0;
    if (m.caracteres.test(texto)) n += 2;
    for (const palabra of m.palabras) {
      if (new RegExp('(^|[^a-z])' + palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(limpio)) n++;
    }
    puntos[idioma] = n;
  }
  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
  if (orden[0][1] === 0 || orden[0][1] === orden[1][1]) return null;
  return orden[0][0];
}

const mapa = {};
const discrepancias = [];
const sinDeclarar = [];

for (const f of fs.readdirSync(SLIDERS).filter((x) => x.endsWith('.json') && x !== 'idiomas.json')) {
  const config = JSON.parse(fs.readFileSync(path.join(SLIDERS, f), 'utf8'));
  const crudo = fs.existsSync(path.join(ORIGEN, f)) ? JSON.parse(fs.readFileSync(path.join(ORIGEN, f), 'utf8')) : null;
  // El idioma declarado vive en el volcado crudo, emparejado por id de diapositiva.
  const declarado = new Map((crudo ? crudo.slides : []).map((s) => [String(s.id), s.idioma || null]));

  mapa[config.id] = {};
  config.slides.forEach((s, i) => {
    const n = String(i + 1);
    const deClarado = declarado.get(String(s.id));

    const textos = (s.capas || [])
      .filter((c) => c.tipo === 'texto' && c.texto)
      .map((c) => String(c.texto).replace(/<[^>]*>/g, ' '))
      .join(' ');

    // Sin nada que traducir (solo imagenes, o una letra suelta) la diapositiva es
    // NEUTRA: se ve en todos los idiomas.
    const traducible = textos.replace(/[^a-zA-ZÀ-ÿ]/g, '').length >= 3;

    if (deClarado) {
      mapa[config.id][n] = deClarado;
      const deducido = traducible ? deducirPorTexto(textos) : null;
      if (deducido && deducido !== deClarado) {
        discrepancias.push(`${config.id} #${n}: declara "${deClarado}" pero el texto parece "${deducido}"`);
      }
    } else if (!traducible) {
      mapa[config.id][n] = '*';
    } else {
      const deducido = deducirPorTexto(textos);
      mapa[config.id][n] = deducido;
      if (!deducido) sinDeclarar.push(`${config.id} #${n}`);
    }
  });
}

console.log('Idioma por diapositiva\n');
for (const [alias, m] of Object.entries(mapa)) {
  const cuenta = {};
  for (const v of Object.values(m)) cuenta[v === null ? 'sin determinar' : v] = (cuenta[v === null ? 'sin determinar' : v] || 0) + 1;
  console.log('  ' + alias.padEnd(22) + JSON.stringify(cuenta));
}
console.log('');

if (discrepancias.length) {
  console.log('DISCREPANCIAS (el idioma declarado y el texto no coinciden, revisar):');
  for (const d of discrepancias) console.log('  ' + d);
  console.log('');
}
if (sinDeclarar.length) {
  console.log('SIN IDIOMA (ni declarado ni deducible, revisar a mano):');
  for (const d of sinDeclarar) console.log('  ' + d);
  console.log('');
}

// El archivo es de DECISION: si ya existe no se pisa, para que una correccion a
// mano no se pierda. Se informa de las diferencias.
if (fs.existsSync(DESTINO)) {
  const previo = JSON.parse(fs.readFileSync(DESTINO, 'utf8'));
  let dif = 0;
  for (const [alias, m] of Object.entries(mapa)) {
    for (const [n, idioma] of Object.entries(m)) {
      const antes = previo[alias] ? previo[alias][n] : undefined;
      if (antes !== undefined && antes !== idioma) { if (dif < 10) console.log('  diferencia ' + alias + ' #' + n + ': archivo=' + antes + ' ahora=' + idioma); dif++; }
    }
  }
  console.log('El archivo de idiomas ya existe y NO se pisa (es de decision).' + (dif ? ' ' + dif + ' diferencias con lo calculado.' : ' Sin diferencias.'));
} else {
  fs.writeFileSync(DESTINO, JSON.stringify({
    _nota: 'Idioma de cada diapositiva, por numero. ARCHIVO DE DECISION: editable a mano, NO se pisa al regenerar. "*" = neutra (se ve en todos los idiomas). null = sin determinar.',
    _generado: 'tools/slide-locales.cjs — usa el idioma DECLARADO por RevSlider (child.language)',
    ...mapa,
  }, null, 2) + '\n', 'utf8');
  console.log('Escrito ' + path.relative(ROOT, DESTINO));
}
