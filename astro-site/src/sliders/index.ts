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

const POR_ALIAS: Record<string, unknown> = {
  'e-nation': eNation,
  'vertical-horizontal': verticalHorizontal,
  snake,
  'banner-publicidad': bannerPublicidad,
};

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
      const config = POR_ALIAS[a] as { slides?: { enlace?: unknown }[] };
      const tieneEnlaces = (config.slides ?? []).some((s) => s.enlace);
      return {
        alias: a,
        config: config as Record<string, unknown>,
        etiqueta: tieneEnlaces ? t.carrusel : t.decorativo,
        anterior: t.anterior,
        siguiente: t.siguiente,
      };
    });
}
