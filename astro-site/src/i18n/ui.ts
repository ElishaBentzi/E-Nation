/*
 * Cadenas de interfaz del sitio, por idioma.
 *
 * DE DONDE SALEN
 *   Las etiquetas de navegacion NO son inventadas: salen de los menus del
 *   WordPress original, leidos del HTML renderizado (no del export, que no
 *   traduce). En ingles eran "Home, Presentation, Constitution, Articles, News" y
 *   en espanol "Inicio, Presentacion, Constitucion, Articulos, Noticias".
 *
 *   El frances es el unico idioma que se redacta, porque el original no tiene
 *   interfaz francesa: su menu estaba en ingles y su selector llevaba a la home
 *   inglesa (un defecto ya anotado). Se traduce con el mismo criterio que el
 *   resto del sitio.
 *
 * POR QUE ESTE ARCHIVO NO SE GENERA
 *   Al contrario que `config.ts` (que se genera de los grupos de traduccion de
 *   WPML porque contiene datos), esto son decisiones de redaccion. Se escriben a
 *   mano, como el contenido.
 */

import type { Locale } from './config.ts';

export interface CadenasUI {
  /** Etiqueta de cada pagina en el menu, por id de pagina. */
  nav: Record<string, string>;
  /** Titulo del menu para lectores de pantalla. */
  navLabel: string;
  /** Selector de idioma. */
  idiomaLabel: string;
  /** Selector de tema. Los tres estados, como en Starlight. */
  temaLabel: string;
  temaClaro: string;
  temaOscuro: string;
  temaAuto: string;
  /** Enlace a la documentacion del Pacto. */
  enlaceConstitucion: string;
}

export const UI: Record<Locale, CadenasUI> = {
  en: {
    nav: {
      home: 'Home',
      presentation: 'Presentation',
      articles: 'Articles',
      news: 'News',
      'privacy-policy': 'Privacy Policy',
      'terms-and-conditions': 'Terms and Conditions',
    },
    navLabel: 'Main menu',
    idiomaLabel: 'Language',
    temaLabel: 'Theme',
    temaClaro: 'Light',
    temaOscuro: 'Dark',
    temaAuto: 'Auto',
    enlaceConstitucion: 'Constitution',
  },
  es: {
    nav: {
      home: 'Inicio',
      presentation: 'Presentación',
      articles: 'Artículos',
      news: 'Noticias',
      'privacy-policy': 'Política de Privacidad',
      'terms-and-conditions': 'Términos y Condiciones',
    },
    navLabel: 'Menú principal',
    idiomaLabel: 'Idioma',
    temaLabel: 'Tema',
    temaClaro: 'Claro',
    temaOscuro: 'Oscuro',
    temaAuto: 'Auto',
    enlaceConstitucion: 'Constitución',
  },
  fr: {
    nav: {
      home: 'Accueil',
      presentation: 'Présentation',
      articles: 'Articles',
      news: 'Nouvelles',
      'privacy-policy': 'Politique de Confidentialité',
      'terms-and-conditions': 'Termes et Conditions',
    },
    navLabel: 'Menu principal',
    idiomaLabel: 'Langue',
    temaLabel: 'Thème',
    temaClaro: 'Clair',
    temaOscuro: 'Sombre',
    temaAuto: 'Auto',
    enlaceConstitucion: 'Constitution',
  },
};

/** Orden del menu principal, del original: Inicio, Presentacion, Constitucion, Articulos, Noticias. */
export const ORDEN_NAV = ['home', 'presentation', 'articles', 'news'] as const;
