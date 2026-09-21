/*
 * MODELOS DE CONTENIDO.
 *
 * Cada pagina y idioma tiene su modelo en `src/contenido/<nombre>.json`, generado
 * por `tools/elementor-a-contenido.cjs` a partir del arbol de Elementor del
 * original. El NOMBRE del fichero es el de la captura del original, y por eso no
 * se puede deducir de la pagina y el idioma: hay que declararlo.
 *
 * La busqueda es por glob y no por plantilla en un `import()`, porque Vite necesita
 * saber de antemano que ficheros existen para incluirlos en el bundle; con una
 * plantilla el import fallaria solo en produccion, que es la peor forma de fallar.
 */
import type { Locale, PageId } from '../i18n/config.ts';

/** pagina -> idioma -> nombre del modelo */
const MODELOS: Partial<Record<PageId, Partial<Record<Locale, string>>>> = {
  home: { en: 'home-landing-page-en', es: 'home-es' },
  presentation: { en: 'presentation-en', es: 'presentacion-es' },
};

const FICHEROS = import.meta.glob('./*.json', { eager: true }) as Record<string, { default: unknown }>;

export interface ModeloContenido {
  pagina: string;
  secciones: any[];
}

export async function leerContenido(page: PageId, locale: Locale): Promise<ModeloContenido | null> {
  const nombre = MODELOS[page]?.[locale];
  if (!nombre) return null;
  const entrada = FICHEROS[`./${nombre}.json`];
  return entrada ? (entrada.default as ModeloContenido) : null;
}

/** Paginas que ya tienen su contenido reconstruido, para el informe del build. */
export const paginasConContenido = Object.keys(MODELOS) as PageId[];
