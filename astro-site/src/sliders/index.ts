/*
 * Registro de sliders: que configuracion de banner va en que pagina.
 *
 * Los JSON de `src/sliders/` los genera `tools/revslider-to-config.cjs` desde la
 * configuracion de Slider Revolution del WordPress original. NO se editan a mano:
 * si cambia el original, se vuelve a correr el generador.
 *
 * El reparto sale de medir las paginas del original:
 *   - la HOME lleva tres: el logo animado (e-nation), el de vertical/horizontal y
 *     la serpiente. Son de adorno, sin enlace.
 *   - la PRESENTACION lleva dos: la serpiente otra vez, y `banner-publicidad`, que
 *     es el carrusel de banners a otros proyectos. Ese es el que importa.
 */
import type { PageId, Locale } from '../i18n/config.ts';

import eNation from '../sliders/e-nation.json';
import verticalHorizontal from '../sliders/vertical-horizontal.json';
import snake from '../sliders/snake.json';
import bannerPublicidad from '../sliders/banner-publicidad.json';
import idiomas from '../sliders/idiomas.json';

const POR_ALIAS: Record<string, unknown> = {
  'e-nation': eNation,
  'vertical-horizontal': verticalHorizontal,
  snake,
  'banner-publicidad': bannerPublicidad,
};

/**
 * Idioma de cada diapositiva, por numero (1 = la primera).
 *
 * Viene de `idiomas.json`, que es un ARCHIVO DE DECISION: se genero detectando el
 * idioma del texto de cada diapositiva, pero se puede editar a mano y no se pisa.
 *
 * EL ORIGINAL MEZCLABA LOS TRES IDIOMAS en un mismo carrusel y servia el mismo en
 * las dos presentaciones, asi que quien visitaba el sitio en ingles veia banners en
 * espanol y en frances. Es un DEFECTO del original: aqui cada idioma muestra solo
 * los suyos.
 *
 * Valores: `es` / `en` / `fr` para una diapositiva de ese idioma, y `*` para las
 * NEUTRAS (sin texto traducible), que se muestran en todos.
 */
const IDIOMAS = idiomas as unknown as Record<string, Record<string, string | null>>;

/** Diapositivas de un slider que corresponden a un idioma. */
function diapositivasDe(alias: string, locale: Locale) {
  const config = POR_ALIAS[alias] as { slides?: Record<string, unknown>[] };
  const mapa = IDIOMAS[alias];
  // Sin mapa de idiomas no se filtra: es mejor mostrar todo que dejar el carrusel
  // vacio por un archivo que falte.
  if (!config.slides || !mapa) return config.slides ?? [];
  return config.slides.filter((_, i) => {
    const idioma = mapa[String(i + 1)];
    return idioma === undefined || idioma === null || idioma === '*' || idioma === locale;
  });
}

/** Sliders de cada pagina, en el orden en que aparecen en el original. */
const POR_PAGINA: Partial<Record<PageId, string[]>> = {
  home: ['e-nation', 'vertical-horizontal', 'snake'],
  presentation: ['snake', 'banner-publicidad'],
};

export interface SliderEnPagina {
  alias: string;
  config: Record<string, unknown>;
  /** Etiqueta accesible, ya traducida. */
  etiqueta: string;
  anterior: string;
  siguiente: string;
}

const ETIQUETAS: Record<Locale, { carrusel: string; anterior: string; siguiente: string; decorativo: string }> = {
  en: { carrusel: 'Featured banners', anterior: 'Previous banner', siguiente: 'Next banner', decorativo: 'Illustration' },
  es: { carrusel: 'Banners destacados', anterior: 'Banner anterior', siguiente: 'Banner siguiente', decorativo: 'Ilustración' },
  fr: { carrusel: 'Bandeaux en vedette', anterior: 'Bandeau précédent', siguiente: 'Bandeau suivant', decorativo: 'Illustration' },
};

/**
 * Sliders que hay que pintar en una pagina.
 *
 * Los de adorno (sin ningun enlace en sus slides) se marcan como decorativos: un
 * carrusel de imagenes que no lleva a ningun sitio y se anuncia como "banners
 * destacados" confunde a quien usa lector de pantalla.
 */
export function slidersDe(page: PageId, locale: Locale): SliderEnPagina[] {
  const alias = POR_PAGINA[page];
  if (!alias) return [];
  const t = ETIQUETAS[locale];
  return alias
    .filter((a) => POR_ALIAS[a])
    .map((a) => {
      const slides = diapositivasDe(a, locale);
      const tieneEnlaces = slides.some((s) => (s as { enlace?: unknown }).enlace);
      return {
        alias: a,
        // Se pasa la configuracion YA FILTRADA por idioma: el componente no tiene
        // que saber nada de idiomas.
        config: { ...(POR_ALIAS[a] as Record<string, unknown>), slides },
        etiqueta: tieneEnlaces ? t.carrusel : t.decorativo,
        anterior: t.anterior,
        siguiente: t.siguiente,
      };
    })
    // Un carrusel que se queda sin diapositivas en este idioma no se pinta: mejor
    // ausente que vacio.
    .filter((s) => (s.config.slides as unknown[]).length > 0);
}

/**
 * EL CARRUSEL DE BANNERS PARA EL PIE, en todas las paginas.
 *
 * Es el mismo `banner-publicidad` que lleva la presentacion: enlaza a los proyectos
 * hermanos, asi que tiene sentido en cualquier pagina y no solo en una. Se declara
 * aparte de `POR_PAGINA` porque no pertenece a una pagina concreta: va en el pie, que
 * es comun a todas.
 *
 * Devuelve la configuracion YA FILTRADA por idioma, igual que `slidersDe`, para que el
 * componente no tenga que saber nada de idiomas.
 */
export function carruselDeBanners(locale: Locale): SliderEnPagina | null {
  const alias = 'banner-publicidad';
  if (!POR_ALIAS[alias]) return null;
  const slides = diapositivasDe(alias, locale);
  if (!slides.length) return null;
  const t = ETIQUETAS[locale];
  return {
    alias,
    config: { ...(POR_ALIAS[alias] as Record<string, unknown>), slides },
    etiqueta: t.carrusel,
    anterior: t.anterior,
    siguiente: t.siguiente,
  };
}
