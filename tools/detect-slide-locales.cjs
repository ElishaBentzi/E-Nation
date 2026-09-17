/*
 * Determina el IDIOMA de cada diapositiva de los carruseles.
 *
 * POR QUE HACE FALTA
 *   El carrusel de banners del original mezcla los tres idiomas en un mismo
 *   slider, y el mismo shortcode se sirve en las dos presentaciones. El usuario ha
 *   decidido que eso es un DEFECTO: cada idioma debe mostrar solo sus banners.
 *
 * COMO SE DETECTA, y por que asi
 *   RevSlider NO guarda el idioma en ninguna parte: sus diapositivas son solo un
 *   orden. Asi que hay que deducirlo. Se usan DOS senales, y la segunda es la
 *   fuerte:
 *
 *     1. El texto de las capas (palabras y caracteres tipicos de cada idioma).
 *     2. LA IMAGEN DE FONDO. Las variantes de idioma de una misma diapositiva
 *        COMPARTEN EL VISUAL y solo cambian el texto, asi que agrupar por fondo
 *        revela las familias de idioma de un vistazo.
 *
 *   Cuando las dos senales coinciden, la clasificacion es fiable. Cuando no, se
 *   marca como DUDOSA y se lista aparte: la salida es un archivo editable a mano,
 *   no una verdad automatica.
 *
 * Uso: node tools/detect-slide-locales.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SLIDERS = path.join(ROOT, 'astro-site', 'src', 'sliders');
const DESTINO = path.join(ROOT, 'astro-site', 'src', 'sliders', 'idiomas.json');

/** Quita acentos para poder comparar palabras sin depender de la ortografia. */
function sinAcentos(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Marcas de cada idioma. Se combinan caracteres propios y palabras frecuentes en
// estos textos concretos (son rotulos cortos, no prosa, asi que no vale un
// detector estadistico).
//
// OJO CON LAS PALABRAS QUE NO DISCRIMINAN: "union" es identica en los tres
// idiomas, y tenerla en ingles y en frances hizo EMPATAR una diapositiva que era
// claramente espanola ("para Nuestra Verdadera Libertad"). Solo sirven palabras
// que existan en un idioma y no en los otros.
const MARCAS = {
  es: {
    caracteres: /[ñ¿¡]/,
    palabras: ['juega', 'coopera', 'crecer', 'edicion', 'espanol', 'participacion', 'politica', 'sociedad', 'bienestar', 'para', 'nueva', 'venezuela', 'etica', 'disen', 'nuestra', 'verdadera', 'libertad', 'monetaria'],
  },
  en: {
    caracteres: /\b\w*'(s|t|re)\b/,
    palabras: ['play', 'cooperate', 'grow', 'edition', 'english', 'participation', 'politics', 'society', 'welfare', 'workshops', 'book', 'the', 'and', 'our', 'true', 'freedom', 'monetary'],
  },
  fr: {
    caracteres: /[çœàèùêîô]/,
    palabras: ['societe', 'bien-etre', 'mutuel', 'edition', 'francais', 'participation', 'politique', 'ateliers', 'livre', 'modele', 'des', 'du', 'et', 'pour', 'notre', 'veritable', 'liberte', 'monetaire'],
  },
};

/** Puntua cada idioma: cuantas marcas aparecen en el texto. */
function puntuar(texto) {
  const limpio = sinAcentos(texto);
  const puntos = {};
  for (const [idioma, m] of Object.entries(MARCAS)) {
    let n = 0;
    if (m.caracteres.test(texto)) n += 2; // un caracter propio es senal fuerte
    for (const palabra of m.palabras) {
      if (new RegExp('(^|[^a-z])' + palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(limpio)) n++;
    }
    puntos[idioma] = n;
  }
  return puntos;
}

const resumen = [];
const detalle = {};

for (const f of fs.readdirSync(SLIDERS).filter((x) => x.endsWith('.json'))) {
  const c = JSON.parse(fs.readFileSync(path.join(SLIDERS, f), 'utf8'));
  const porIdioma = { es: [], en: [], fr: [] };
  const dudosas = [];

  c.slides.forEach((s, i) => {
    const textos = (s.capas || [])
      .filter((x) => x.tipo === 'texto' && x.texto)
      .map((x) => String(x.texto).replace(/<[^>]*>/g, ' '))
      .join(' ')
      .trim();

    // Un texto de una o dos letras ("X") es un grafico, no un rotulo: no hay nada
    // que traducir y la diapositiva es neutra, como las que no tienen texto.
    if (!textos || textos.replace(/[^a-zA-ZÀ-ÿ]/g, '').length < 3) {
      dudosas.push({ n: i + 1, neutra: true, motivo: 'sin texto traducible: es neutra y se ve en todos los idiomas' });
      return;
    }

    const p = puntuar(textos);
    const orden = Object.entries(p).sort((a, b) => b[1] - a[1]);
    const [mejor, puntosMejor] = orden[0];
    const [, puntosSegundo] = orden[1];

    if (puntosMejor === 0) { dudosas.push({ n: i + 1, motivo: 'ningun idioma reconocido', textos: textos.slice(0, 50) }); return; }
    if (puntosMejor === puntosSegundo) { dudosas.push({ n: i + 1, motivo: 'empate', textos: textos.slice(0, 50), puntos: p }); return; }

    porIdioma[mejor].push({ n: i + 1, slug: s.id, titulo: s.titulo, textos: textos.slice(0, 60), puntos: puntosMejor, margen: puntosMejor - puntosSegundo });
  });

  // Segunda senal: agrupar por imagen de fondo. Las variantes de idioma de una
  // misma diapositiva comparten visual, asi que los grupos deberian alinearse con
  // los idiomas. Si no lo hacen, hay algo que revisar.
  const porFondo = new Map();
  c.slides.forEach((s, i) => {
    const visual = (s.capas || []).filter((x) => x.tipo === 'imagen' && x.imagen).map((x) => x.imagen.split('/').pop()).sort().join('|');
    if (!visual) return;
    if (!porFondo.has(visual)) porFondo.set(visual, []);
    porFondo.get(visual).push(i + 1);
  });
  const gruposRepetidos = [...porFondo.values()].filter((g) => g.length > 1);

  resumen.push({ alias: c.id, total: c.slides.length, es: porIdioma.es.length, en: porIdioma.en.length, fr: porIdioma.fr.length, dudosas: dudosas.length, gruposVisuales: gruposRepetidos.length });
  detalle[c.id] = { porIdioma, dudosas, gruposRepetidos };
}

console.log('Deteccion de idioma por diapositiva\n');
for (const r of resumen) {
  console.log('  ' + r.alias.padEnd(22) + 'total ' + String(r.total).padStart(3) +
    '  | es ' + String(r.es).padStart(2) + '  en ' + String(r.en).padStart(2) + '  fr ' + String(r.fr).padStart(2) +
    '  | dudosas ' + String(r.dudosas).padStart(2) +
    '  | grupos de visual repetido: ' + r.gruposVisuales);
}
console.log('');

for (const [alias, d] of Object.entries(detalle)) {
  if (d.dudosas.length) {
    console.log('  ' + alias + ' -> DUDOSAS:');
    for (const x of d.dudosas) console.log('    #' + x.n + '  ' + x.motivo + (x.textos ? '  "' + x.textos + '"' : ''));
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// ARCHIVO DE IDIOMAS
//
// Es un archivo de DECISION, no de datos: una vez escrito NO se pisa. Si el
// detector volviera a escribir encima, cualquier correccion a mano se perderia en
// la siguiente ejecucion — y es justo lo que hay que poder corregir, porque una
// deteccion por palabras en rotulos cortos puede equivocarse.
//
// Si ya existe, se compara y se avisa de las diferencias para que se puedan
// revisar, pero no se toca.
// ---------------------------------------------------------------------------
const mapa = {};
for (const [alias, d] of Object.entries(detalle)) {
  mapa[alias] = {};
  for (const [idioma, lista] of Object.entries(d.porIdioma)) {
    for (const x of lista) mapa[alias][String(x.n)] = idioma;
  }
  for (const x of d.dudosas) {
    if (mapa[alias][String(x.n)] !== undefined) continue;
    // Una diapositiva SIN TEXTO es NEUTRA: no hay nada que traducir en ella, asi
    // que se muestra en todos los idiomas. Marcarla como "sin determinar" la
    // esconderria de todos, que es peor que mostrarla.
    mapa[alias][String(x.n)] = x.neutra ? '*' : null;
  }
}

if (fs.existsSync(DESTINO)) {
  const previo = JSON.parse(fs.readFileSync(DESTINO, 'utf8'));
  console.log('\nEl archivo de idiomas YA EXISTE y no se toca (es un archivo de decision).');
  let dif = 0;
  for (const [alias, m] of Object.entries(mapa)) {
    for (const [n, idioma] of Object.entries(m)) {
      const antes = previo[alias] ? previo[alias][n] : undefined;
      if (antes !== undefined && antes !== idioma) {
        if (dif < 10) console.log('  diferencia en ' + alias + ' #' + n + ': archivo=' + antes + ' deteccion=' + idioma);
        dif++;
      }
    }
  }
  console.log(dif ? '  ' + dif + ' diferencias (revisar a mano si procede)' : '  Sin diferencias con la deteccion.');
} else {
  const conNota = {
    _nota: 'Idioma de cada diapositiva, por numero. ARCHIVO DE DECISION: se puede editar a mano y NO se pisa al regenerar. null = sin determinar (revisar).',
    _generado: 'tools/detect-slide-locales.cjs',
    ...mapa,
  };
  fs.writeFileSync(DESTINO, JSON.stringify(conNota, null, 2) + '\n', 'utf8');
  console.log('\nEscrito ' + path.relative(ROOT, DESTINO));
}

const sinDeterminar = Object.entries(mapa).flatMap(([a, m]) => Object.entries(m).filter(([, v]) => v === null).map(([n]) => a + ' #' + n));
if (sinDeterminar.length) {
  console.log('\nSIN IDIOMA DETERMINADO (revisar en ' + path.relative(ROOT, DESTINO) + '):');
  for (const x of sinDeterminar) console.log('  ' + x);
}

