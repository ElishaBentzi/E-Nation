# Findings

> **External memory / knowledge base.** Put discoveries, research, and
> technical decisions here so they survive context resets.
>
> **2-Action Rule:** after every 2 view/browser/search operations, save the
> key findings to this file IMMEDIATELY. Visual content (screenshots, images,
> PDFs, browser captures) does NOT persist in context — capture it as text
> here right away.

## Requirements

| # | Requisito | Estado |
|---|---|---|
| 1 | Usar la skill `wordpress-to-cloudflare` y **mudarla dentro de este proyecto** | Hecho |
| 2 | Migrar el sitio **e-nation.org** (WordPress) a Astro + Cloudflare Pages | Fase 4-8 |
| 3 | Crear `README.md`, `AGENTS.md` y los tres archivos de `planning-with-files` | Hecho |
| 4 | Multi-idioma con **memoria de traducción** en vez de replicar WPML; las imágenes con texto como **texto superpuesto traducible** | Docs hechos (es/en/fr); sitio pendiente |
| 5 | Consolidar los docs de **Read the Docs** en la infraestructura propia | Ensayo verificado; falta el cambio de dominio |
| 6 | Revisar las traducciones antes de publicar | **Francés revisado y aprobado por el usuario el 2026-09-11** |
| 7 | **Tema claro/oscuro/auto en las páginas del sitio**, como el que trae Starlight en los docs (petición del usuario al revisar el francés) | Fase 5 |

### Recursos del original: cómo encontrarlos de verdad (medido)

**El HTML pesa 282 KB y enlaza 36 hojas de estilo**, pero hay un truco que cambia todo el planteamiento: **WP Rocket reescribe las URLs** a
`/zero/wp-content/cache/min/1/zero/wp-content/plugins/...` y a
`/zero/wp-content/cache/background-css/1/e-nation.org/...`.

Es decir: si se descarga lo que enlaza el HTML se obtienen **archivos minificados y combinados**, sin estructura ni comentarios, que son la peor fuente posible para extraer valores de diseño. **La ruta original se recupera quitando el prefijo de caché**, y esos archivos sí son legibles.

| Se enlaza en el HTML | Ruta original a descargar |
|---|---|
| `/cache/min/1/zero/wp-content/plugins/jet-elements/assets/css/addons/jet-banner.css` | `/zero/wp-content/plugins/jet-elements/assets/css/addons/jet-banner.css` |
| `/cache/background-css/1/e-nation.org/zero/wp-content/uploads/elementor/css/post-5738.css` | `/zero/wp-content/uploads/elementor/css/post-5738.css` |

**El CSS de Elementor es POR PÁGINA**, no global: la home EN usa `post-5738.css` (76.725 B) y el HTML de la home referencia además `post-6709.css`, que es de otra página. Cada página tiene el suyo, así que hay que descubrirlo desde el HTML de cada una en vez de suponer un único archivo.

CSS clave confirmados como accesibles (200):
- `/zero/wp-content/uploads/elementor/css/post-5738.css` — 76.725 B, la home EN
- `/zero/wp-content/uploads/elementor/css/post-6028.css` — 76.396 B, la home ES (del recon inicial)
- `/zero/wp-content/uploads/the7-css/custom.css` — **338.142 B**, el tema
- `/zero/wp-content/uploads/the7-css/css-vars.css` — 35.201 B, **las variables de marca**
- `media.css`, `mega-menu.css`, `compatibility/wpml.css` — el resto del tema
- De plugins, los que importan para los efectos: `jet-elements/addons/jet-{banner,animated-box,animated-text,button,slider}.css` y sus `skin/`, `jet-elements.css`, `slider-pro.min.css`, `peel.min.css`, y el `rs6.css` de Slider Revolution
- Fuentes: `/zero/wp-content/uploads/elementor/google-fonts/css/{roboto,robotoslab}.css`, más el CSS de fuentes cacheado por WP Rocket y las fuentes del tema (`icomoon-the7-font`, FontAwesome)

**La home trae 18 bloques de `<style>` inline** (5.302 B en total) que también hay que capturar: ahí viven ajustes de Elementor y de The7 que no están en ningún archivo.

**Implicación para la captura**: hay que descargar ~35 CSS **en su ruta original**, más el CSS de Elementor específico de cada una de las 16 páginas, más los estilos inline de cada página. Guardar lo que enlaza el HTML sería guardar la versión minificada y perder la legibilidad que hace falta para extraer la paleta, los radios, las sombras y los efectos.

### Captura de referencia: hecha, y lo que reveló

**Capturado** (con `tools/capture-reference.cjs`): el HTML renderizado de las **16 páginas**, sus estilos inline, y **47 archivos CSS en su ruta original** (2,27 MB, 0 fallos). Índice en `reference/INDEX.md`, tokens medidos en `reference/TOKENS.md`.

**Hallazgo estructural importante: solo 4 páginas usan Elementor.**

| Página | CSS de Elementor |
|---|---|
| `presentation-en` (576 KB de HTML) | `post-5479.css` — **244.977 B** |
| `presentacion-es` (580 KB) | `post-6100.css` — **248.133 B** |
| `home-en` | `post-5738.css` — 76.725 B |
| `home-es` | `post-6028.css` — 76.396 B |
| (compartido por las 4) | `post-6709.css` — 1.134 B, probablemente el kit |

**Las otras 12 páginas son planas del tema The7**, sin page builder: `articles`, `news`, `verify`, `privacy-policy`, `terms-and-conditions` y sus equivalentes ES, más las dos FR. Eso reduce mucho el trabajo: la fidelidad de reconstrucción al nivel de Elementor solo hace falta en **4 páginas**, y `presentation`/`presentacion` son las grandes (no la home, como yo suponía).

**Corrección de una suposición mía**: dije que la home era "lo más difícil por los 3 RevSliders". Cierto, pero las páginas realmente voluminosas son las presentaciones, con ~245 KB de CSS de Elementor cada una frente a 76 KB las homes.

### La paleta: `#1ebbf0` es AMBIGUO y hay que medirlo, no deducirlo

Esto merece su propio apartado porque **me contradije a mí mismo y la evidencia obliga a corregirlo**.

El recon inicial dio por sentado que `#1ebbf0` (cian) y `#39dfaa` (verde) eran "paleta por defecto de The7, no la marca". **Al medir con conteo de frecuencias, `#1ebbf0` aparece 402 veces en el CSS *propio* del sitio** — más que `#ff7100` (314). Está en `uploads/the7-css/custom.css`, que es CSS **generado por WordPress para este sitio** a partir de las opciones del tema. No es CSS de fábrica.

Y sus selectores incluyen cosas visibles:
```css
.wp-block-categories li a:hover, .wp-block-archives li a:hover { color: #1ebbf0; }
.elementor-button, a.elementor-button:visited { … }   /* botones de Elementor */
.wp-block-quote { border-color: #1ebbf0; }
```

En cambio `post-5738.css` (el CSS que pinta la home) usa **`#ff7100` 94 veces y `#1ebbf0` CERO**.

**Conclusión honesta: no se puede resolver leyendo CSS.** Son hojas distintas apuntando a selectores distintos: puede haber botones cian y textos naranjas en la misma página. Solo el **color computado de los elementos visibles** lo decide. Queda como **candidato sin confirmar** hasta medirlo con `tools/measure-browser.js` en el navegador.

**Lo que sí es falso positivo seguro**: la paleta por defecto de **Elementor**, que aparece como variables globales del kit aunque no se use — `--e-global-color-primary: #6EC1E4` y `--e-global-color-accent: #61CE70`. Y ojo: esa es exactamente la trampa que la skill advierte, encontrada en vivo.

### Tokens medidos (de `reference/TOKENS.md`)

- **Tipografías auto-hospedadas de verdad** (`@font-face`): **Roboto (198 declaraciones)**, Arimo (64), **Roboto Slab (63)**, Open Sans (30), Maven Pro (18), más las de iconos (FontAwesome ×3 variantes). Coincide con el reconocimiento: **Roboto + Roboto Slab son las globales de Elementor**; Arimo, Open Sans y Maven Pro las declara el tema.
- **Top de color en el CSS propio**: `#ffffff` 560, `#1ebbf0` 402, `#ff7100` 314, `#39dfaa` 215, `#052743` 127 (**navy oscuro no detectado antes**), `#333333` 124, `#234965` 54.
- Pendiente de calcular con precisión: radios, sombras y ancho de contenedor (el script los extrae; revisar `TOKENS.md`).

### Trampas de medición encontradas (para no repetirlas)

- **`grep -c` cuenta LÍNEAS, no apariciones.** Los CSS de WordPress y de Elementor son de **una sola línea**, así que `grep -c "#ff7100"` devolvía `1` cuando había 94. Hay que usar `grep -o … | wc -l`, y en código `matchAll` o `split`. Este error me llevó a una conclusión falsa antes de detectarlo.
- **WP Rocket reescribe las URLs del CSS** a `/cache/min/1/…` y `/cache/background-css/1/…`. Descargar lo que enlaza el HTML da archivos **minificados y combinados**; la ruta original se recupera quitando el prefijo de caché, y esos archivos sí son legibles. Hay assets que **solo** existen en la caché (el CSS del formulario de Mailchimp, `/embedcode/classic-10_7.css`): para esos hace falta reserva a la URL cacheada.
- **`&nbsp;` y entidades escapadas**: ya visto en los `.md` del Pacto.

### El export de WordPress: qué trajo y qué resolvió

`reference/wp-export.json` — **2,26 MB**, generado por `tools/wp-extract.php`. Trae 16 páginas, 90 medios, 112 efectos, 544 widgets y los 4 sliders.

#### La paleta: RESUELTA en parte, y con sorpresa

**El kit global de Elementor tiene la paleta de FÁBRICA del plugin**, sin personalizar:
`--e-global-color-primary: #6EC1E4`, `secondary: #54595F`, `text: #7A7A7A`, `accent: #61CE70`. Son exactamente los valores por defecto de Elementor.

Dos consecuencias:
1. **Confirma que el kit no es la marca** — el autor nunca personalizó los colores globales, los puso elemento por elemento. Los valores reales están en el CSS de cada página (`post-5738.css` usa `#ff7100` 94 veces).
2. **Refuerza que `#1ebbf0` importa**: si el kit está sin personalizar, el color de acento del tema (que estiliza `.elementor-button`) **no lo pisa el kit**, así que los botones podrían salir cian. Sigue haciendo falta medir el color computado en el navegador — pero ahora sé que el kit no es la explicación alternativa.

**Tipografía del kit (esta sí es real y se usa)**: `primary: Roboto`, `secondary: **Roboto Slab**`, `text: Roboto`, `accent: Roboto`. Confirma Roboto + Roboto Slab como las tipografías de Elementor.

#### Solo 4 páginas son Elementor, y las demás están casi vacías

| Página | Datos de Elementor |
|---|---|
| `presentation-en` | **285.943 B** |
| `presentacion-es` | **292.830 B** |
| `home-landing-page-en` | 79.242 B |
| `home-es` | 78.836 B |

Las otras **12 son páginas planas** y su `post_content` es minúsculo: `articles` 85 B, `news` 75 B, `verify` 118 B, y las FR 89-91 B. Es decir: **son páginas que prácticamente solo contienen un enlace o un shortcode**, coherente con que los artículos vivan en otro WordPress. La fidelidad de nivel Elementor solo hace falta en **4 páginas**.

#### Inventario de widgets: 544 en total

| Widget | Nº |
|---|---|
| `heading` | **306** |
| `image` | **114** |
| `jet-banner` | 56 |
| `jet-animated-text` | 18 |
| `jet-animated-box` | 14 |
| `shortcode` | 10 |
| `icon-list` | 8 |
| `html` | 6 |
| `jet-button` | 4 |
| `jet-video` | 4 |
| `jet-slider` | 2 |
| `menu-anchor` | 2 |

La reconstrucción es sobre todo **encabezados e imágenes**: el 77 % del total. Nada de formularios ni widgets exóticos.

#### Parallax: CONFIRMADO que es fondo fijo

**112 efectos, todos de tipo `background`. Cero animaciones de entrada (`_animation`) y cero `motion_fx_scrolling`.**

De esos fondos, **54 declaran `background-attachment: fixed`** y 58 no lo declaran. El usuario tenía razón: **la técnica es fondo fijo**, no desplazamiento por transform.

**Y esto explica el dato que me confundió antes**: los 63 elementos con `elementor-motion-effects` que vi en el HTML **no son efectos activos** — Elementor renderiza esos contenedores vacíos siempre. No hay ni un efecto de movimiento por JS. La familia "transform" que yo esperaba encontrar **no existe en este sitio**.

#### Los 4 sliders y dónde vive cada uno

| Slider | Slides | Peso | Dónde se usa |
|---|---|---|---|
| `e-nation` (id 18) | 2 | 219 KB | home EN y ES |
| `vertical-horizontal` (id 19) | 1 | 431 KB | home EN y ES |
| `snake` (id 20) | 1 | 23 KB | **home EN/ES y presentación EN/ES** |
| `banner-publicidad` (id 17) | **21** | **1,95 MB** | presentación EN y ES |

Se inyectan como shortcodes `[rev_slider alias="…"]` dentro de Elementor (los 10 widgets `shortcode` del inventario son exactamente estos). La home lleva 3 y la presentación 2. Extraídos a `reference/sliders/<alias>.json` con sus capas y params completos.

#### SEO: solo 4 focus keywords, y una sorpresa de marca

**12 de 16 páginas no tienen focus keyword.** Las únicas definidas son `Articles`, `News`, `Artículos`, `Noticias`. El valor SEO del original es mucho menor de lo que el plan asumía: no hay una lista de keywords que igualar.

**Y los títulos SEO revelan un nombre de marca que no había visto**: `Articles | Mutual Welfare | For an Altruistic Society` y `Artículos | Bienestar Mutuo | Por una Sociedad Altruista`. Es decir, el sitio se presenta en Google como **"Mutual Welfare / Bienestar Mutuo"**, que además coincide con la lista de Mailchimp (`bienestarmutuo`). Pero el `og:site_name` es `E-Nation` y la descripción de la home es `Real Direct Democracy`.

**DECISIÓN TOMADA (pendiente de confirmar por el usuario, reversible)**: **no se elige una sola marca**, porque elegir sería inventar. En su lugar se conserva lo que ya hay, página por página, y en el JSON-LD se representa correctamente con `name: "E-Nation"` (que es el `og:site_name` y el dominio) más **`alternateName: ["Mutual Welfare", "Bienestar Mutuo"]`**, que es la forma que schema.org define justo para esto: una entidad con varios nombres. Así no se pierde ninguna de las tres identidades ni hay que decidir cuál es "la buena" desde fuera. Si el usuario dice cuál manda, se simplifica.

#### La navegación: fuente de verdad es el HTML, no el export

**Corrección de una hipótesis mía.** El export dice que hay 3 menús (uno por idioma, cosa de WPML) y que **los tres apuntan a URLs en inglés**, lo que sugería que la navegación española llevaba a páginas inglesas. **El HTML renderizado lo desmiente**: el menú del ES apunta a `/es/`, `/es/presentacion/`, `/es/articulos/`, `/es/noticias/`.

**Lección**: `wp_get_nav_menu_items()` devuelve los items sin traducir; **WPML los traduce al renderizar**. Para la navegación, la fuente de verdad es el HTML renderizado. Queda escrito en el `aviso` de `reference/manifest.json`.

**Defecto real encontrado**: el selector de idioma enlaza a **`https://e-nation.org/fr/`, que redirige a la home inglesa**. La opción francesa del original no funciona. **DECISIÓN TOMADA (reversible)**: se **corrige**, no se replica. Un enlace roto no es una decisión de diseño sino un fallo, y es la misma categoría que los otros defectos que ya arreglamos (el `<h1>` ausente, el subrayado RST roto del `20.2.1.`, el `og:image` que falta). En el sitio nuevo `/fr/` existe de verdad, así que corregirlo sale gratis; replicarlo sería enviar a propósito una navegación rota.

**Y una dependencia a gestionar**: el item "Constitución" del menú apunta a **`http://docs.e-nation.org/{en,es}/latest/`** — las URLs de Read the Docs. Hay que actualizarlo al migrar los docs (ya está anotado en `AGENTS.md`).

#### Grupos de traducción: el manifiesto autoritativo

Extraídos a `reference/manifest.json`. Son **7 grupos**, con los slugs reales por idioma:

| trid | idiomas | slugs |
|---|---|---|
| 1585 | en, es, **fr** | `articles` / `articulos` / `articles` |
| 1587 | en, es, **fr** | `news` / `noticias` / `nouvelles` |
| 4487 | en, es | `home-landing-page` / **`home`** |
| 4343 | en, es | `presentation` / `presentacion` |
| 4596 | en, es | `verify` / `verificar` |
| 2677 | en, es | `privacy-policy` / `politica-de-privacidad` |
| 2678 | en, es | `terms-and-conditions` / `terminos-condiciones-del-servicio` |

**Dato que corrige el recon inicial**: el slug del ES de la home **no es vacío ni `/es/home/` duplicado, es `home`** en el grupo de traducción. Coincide con el `/es/home/` que el recon vio como "duplicado".

**Y otro hallazgo**: los grupos de `articles` y `news` **sí incluyen francés**, así que las dos páginas FR son traducciones reales de esas dos páginas, no páginas sueltas.

#### Medios: 90 imágenes, todas de 2018-2020

`png` 63, `jpg` 24, `gif` 3. Por carpeta: `2018/08` (52), `2018/10` (17), `2018/09` (17), `2019/10` (2), `2020/12` (1). Nada posterior a 2020, coherente con el sitio congelado. Es un espejo pequeño.

### Medición en el sitio EN VIVO: la paleta resuelta y el parallax confirmado

Medido con el navegador sobre `https://e-nation.org/` a 1440×900, tras desplazar la página entera para forzar la carga de los fondos diferidos. Snippet en `tools/measure-browser.js`.

#### `#1ebbf0`: RESUELTO — está declarado pero NO se ve

| Qué | Valor medido |
|---|---|
| `background` del botón `.elementor-button` "Project Here" | **`rgb(0, 63, 127)` = `#003f7f`** (el azul de marca) |
| `color` del texto del botón | `#ffffff` |
| `border-color` | `rgb(30, 187, 240)` = **`#1ebbf0`** |
| **`border-width`** | **`0px / 0px`** |

**El cian está declarado como color de borde pero el borde tiene ancho CERO, así que no se ve.** Y en los colores de texto computados de la home **`#1ebbf0` no aparece ni una vez**.

O sea: las 402 apariciones en `custom.css` son reales, pero esas declaraciones o están pisadas o no tienen efecto visible. **La conclusión del recon inicial era correcta, pero por casualidad: yo lo había afirmado sin medirlo, luego lo puse en duda al ver el conteo, y ahora la medición lo confirma.** Lo que faltaba era justo el dato del ancho de borde, que no se ve contando colores.

**Paleta de texto realmente computada en la home** (elementos visibles con texto propio):

| color | elementos | nota |
|---|---|---|
| `#ffffff` | 36 | texto sobre fondos oscuros |
| `#003f7f` | 7 | **azul de marca, el más usado para texto** |
| `#333333` | 6 | gris de texto |
| `#6ec1e4` | 4 | **paleta por defecto de Elementor, sí se ve** |
| `#54595f` | 2 | también por defecto de Elementor |
| `#21759b` | 1 | azul de enlace por defecto de WordPress |
| `#ff7100` | 1 | **el naranja de marca** |
| `#d80700` | 1 | rojo |

**Dato nuevo e inesperado: los colores por defecto de Elementor (`#6ec1e4`, `#54595f`) SÍ se ven**, en 6 elementos. Confirma que el kit nunca se personalizó y que el autor dejó algunos elementos con el color de fábrica del plugin. **No son la marca, pero están en pantalla**, así que al reconstruir hay que decidir si se replican o se alinean con la paleta real.

#### El parallax: fondo fijo, CONFIRMADO con medición

Ejemplo medido en la home:
```
section.elementor-section.elementor-top-section
  background-image: 14-background.jpg
  background-attachment: FIXED
  background-size: cover
  transform: null          ← sin transform: es la técnica de fondo fijo, no JS
  altura: 831 px
```

**Cero elementos con `transform` de parallax, cero `data-prlx`, cero `motion_fx`.** La familia "transform" que yo esperaba **no existe**. El usuario tenía razón desde el principio.

#### Los 54 fondos fijos están en las PRESENTACIONES, no en la home

| Página | Fondos | De ellos, `fixed` |
|---|---|---|
| `home-landing-page` (EN) | 7 | **4** |
| `home` (ES) | 7 | **4** |
| `presentation` (EN) | **49** | **23** |
| `presentacion` (ES) | **49** | **23** |

**El parallax es el efecto dominante de las dos presentaciones**, con 23 secciones de fondo fijo cada una. La home solo tiene 4. Esto reordena las prioridades: donde hay que clavar el parallax es en la presentación, que además es la página más pesada (286-293 KB de datos de Elementor).

#### Dos defectos del original confirmados en vivo

- **La home no tiene ni un `<h1>`** (`h1Count: 0`, medido). No era una impresión del recon.
- Existe una URL de fondo malformada (`https://e-nation.org/i.imgur.com/...`) que **rompe `decodeURIComponent`** en el navegador: un script que recorra los fondos sin protección lanza `URIError` y aborta.

### Capturas de referencia: método validado

**Hecha la home EN a 1440 en 9 tramos de 900 px** (`reference/screenshots/original-home-en-desktop-NN.png`, 14 MB en total). Método que funciona:

1. `setViewportSize` → `goto` → `waitForLoadState(domcontentloaded)` → esperar ~2,5 s.
2. Inyectar el CSS que **congela las animaciones** (`[data-aos]{opacity:1!important;transform:none!important;transition:none!important}` y `animation-duration:0s`): sin eso se captura un estado intermedio.
3. Capturar por tramos con `window.scrollTo({top:N,behavior:'instant'})` y ~400 ms entre tramos (`smooth` impediría el salto exacto).
4. Reintento una vez por tramo: **el primer screenshot del bucle falló con "browser screenshot activity capture failed for guest"** y el reintento lo resolvió. Sin reintento, un fallo transitorio pierde el tramo en silencio.

**`fullPage: true` SÍ funciona aquí** (generó un PNG de 6,87 MB de la home entera), al contrario de lo que advierte la skill. **Pero no sirve para nuestro caso**: con `background-attachment: fixed` el fondo es relativo al viewport, así que en una captura de página completa las secciones de parallax se renderizan mal (el fondo se ancla a la posición del viewport en el momento de capturar, no a la sección). **Los tramos son la opción correcta para las páginas con fondo fijo**, que son precisamente las dos presentaciones. El PNG de prueba se conserva renombrado `AVISO-fullpage-deforma-parallax-home-en.png` para que su limitación sea evidente.

### Auditoría de imágenes con texto: el resultado

**La intuición del usuario era correcta: la gran mayoría no tiene texto.** De 171 ficheros (118 imágenes únicas), solo **54 son de contenido** y de esas **19 tienen letras dentro de los píxeles**. Pero el desglose importa mucho, porque no todas las que tienen texto hay que tocarlas.

#### Clasificación por papel (medida, no supuesta)

| papel | imágenes | ¿lleva texto que traducir? |
|---|---|---|
| **decorativa (fondo de sección)** | **59** | No por diseño: es un fondo |
| **contenido** | **54** | Hay que mirarlas |
| variantes de tamaño de WordPress | 57 | Son la misma imagen a otra escala |

Los fondos no se revisan: su papel lo dice el diseño. Eso descarta 59 imágenes de entrada, sin mirarlas.

#### Lo que encontró la revisión visual de las 54 de contenido

**19 tienen texto. Y de esas, la mayoría NO hay que tocarlas:**

**a) 11 son LOGOTIPOS DE MEDIOS DE PRENSA** — una sección de "aparecemos en" que no había detectado:

`WSJ` (The Wall Street Journal), `Newsweek`, `Forbes`, `Wired`, `The Guardian`, `The Hill`, `Zero Hedge`, `eldiario.es`, `Expansión (en alianza con CNN)`, `Up Worthy`, `YouTube`.

**Estos NO se traducen ni se convierten a texto superpuesto**: son marcas de terceros y nombres propios. Se quedan como imagen. Es la respuesta correcta y además la única legalmente sensata.

**b) 4 tienen texto incidental que forma parte de la fotografía**, no un rótulo añadido:
- `problem-loss-savings.jpg` — el texto del billete de 100 USD, bajo el fuego
- `problem-police-state-1.jpg` — una marca de agua de stock (`DDe`) recortada por el borde
- `6-internet.jpg` — el glifo `₿` grabado en una moneda dorada
- `8-pact-science.jpg` — dos dígitos, `18` y `3`

Traducir eso sería absurdo: es la realidad fotografiada. Se quedan.

**c) Solo 4 son candidatas REALES a conversión**, porque son ilustraciones propias con palabras que un lector francés o inglés leería:

| imagen | texto que lleva | por qué es candidata |
|---|---|---|
| `org-piramid.png` | Responsibility · Power · Wages · Decisions | **Diagrama propio con cuatro conceptos**: es contenido del sitio, no decoración |
| `31-coin.png` | UNION FOR OUR MONETARY FREEDOM · UNITY COIN · … | **Lema de marca sobre una moneda**: el lema se lee |
| `8-pact-economy.jpg` | BANK · ASIA + cifras del gráfico | Ilustración de un gráfico: las dos palabras se leen |
| `2-hand-passport.png` | PASSPORT · E-NATION | Mayormente nombres propios; la palabra «PASSPORT» sí se leería |

#### La lección del método

Mirar las 54 una por una era inevitable, pero **clasificar antes por papel descartó 59 de entrada**, y el reparto por lotes entre tres revisores en paralelo lo hizo viable. Y dos veces el revisor tuvo que **ampliar la imagen** para decidir: `problem-police-state-1.jpg` a tamaño real parecía una mancha y ampliada eran letras. Es la misma lección de siempre: medir, no juzgar por impresión.

Un detalle que confirmó un revisor y vale la pena retener: **cuatro logotipos son texto blanco sobre fondo blanco** y a simple vista parecían imágenes vacías. Solo se ven si se componen sobre gris. Una revisión por impresión los habría dado por buenos.

### Requisito 7 en detalle: el tema oscuro del sitio

El usuario vio el selector claro/oscuro/auto de Starlight en los docs y quiere algo similar en las páginas de e-nation.

**Matiz que condiciona el trabajo**: el sitio original de WordPress **no tiene modo oscuro**. Por lo tanto esto no es fidelidad de migración sino una **funcionalidad nueva**, y la paleta oscura **no se puede extraer del original: hay que diseñarla**. Eso choca de frente con el principio rector de la skill ("nunca inventar diseño"), así que la paleta se **propone a partir de los colores medidos y la decide el usuario**, no se elige por mi cuenta.

Base para proponer, de la paleta ya medida: fondos oscuros desde `#003f7f` y `#234965` (azules medidos del original), texto `#e8e8e8`, acento `#ff7100`, énfasis `#ff3a2d`.

Mecánica ya documentada en la skill para Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *))`, la elección se persiste, y para el estado "auto" se respeta `prefers-color-scheme`. Hace falta un script mínimo en línea que ponga la clase **antes del primer pintado**, o se ve un destello del tema equivocado al cargar.

**Coherencia**: el modo oscuro de los docs ya funciona (Starlight), y sus tokens oscuros están en `astro-docs/src/styles/docs.css` (`--sl-color-accent-low: var(--en-color-blue-dark)`). Los tokens oscuros del sitio deberían ir a `brand/tokens.css` para que las dos apps compartan el mismo criterio y ninguna derive.

## Research Findings

### Sitio original: https://e-nation.org (CONFIRMADO)

- **Stack**: WordPress + tema **The7** (`dt-the7` + child `dt-the7-child`), **Elementor 4.2.4**, **JetElements 2.7.9.1**, **Slider Revolution 6.7.35**, **WPML 4.7.6** (EN/ES/FR), **WP Rocket 3.19.4**, **Rank Math SEO**. nginx + HTTP/3, TLS Let's Encrypt.
- **WordPress vive en el subdirectorio `/zero/`**: todos los assets son `https://e-nation.org/zero/wp-content/...`. `/zero/` en sí da 404. `/wp-content/...` también resuelve (alias). **Implicación**: el extractor PHP va en `/zero/`, los `_redirects` de uploads parten de `/zero/wp-content/uploads/*`, y el original **no** sirve `/wp-content/` en la raíz.
- **16 páginas, 0 posts de blog jamás publicados** (`X-WP-Total: 0`).
  - **EN (por defecto, `lang="en-US"`)**, 7: `/` (home, ID 5738, slug `home-landing-page`), `/presentation/`, `/articles/`, `/news/`, `/verify/`, `/privacy-policy/`, `/terms-and-conditions/`
  - **ES**, 7 con **slugs traducidos**: `/es/`, `/es/presentacion/`, `/es/articulos/`, `/es/noticias/`, `/es/verificar/`, `/es/politica-de-privacidad/`, `/es/terminos-condiciones-del-servicio/`
  - **FR vestigial**, 2: `/fr/articles/`, `/fr/nouvelles/`. No existe `/fr/` (redirige a `/`).
  - Duplicado vivo: `/es/home/` → 200 (mismo tamaño que `/es/`).
- **hreflang del original**: `en-us`, `es-es`, `x-default`. **No emite hreflang para `/fr/`** a pesar de que esas páginas existen.
- **Título/meta**: home EN `Home | E-Nation` / `Real Direct Democracy`. Home ES: **título en inglés** (`Home | E-Nation`) con descripción en español — defecto a corregir.
- **JSON-LD**: `WebSite`, `SearchAction`, `WebPage`, `Person` (`robinsonochoa`), `Article`, `ImageObject`. **Sin `og:image`.**
- **Tokens de marca medidos** (frecuencia sobre `post-5738.css` y el CSS inline real): **`#ff7100` naranja (94 apariciones — acento principal)**, `#ffffff` (40), **`#095287` azul** (10), **`#003f7f` azul oscuro** (8), `#234965` navy (4), `#2e6f9a`, `#e8e8e8`, y **`#ff3a2d` rojo** (8 en inline) + `#ff6900`.
  - **Falso positivo descartado**: el CSS del tema The7 trae su paleta por defecto `#1ebbf0` (337) y `#39dfaa` (188) — **no es la marca**.
- **Tipografías**: globales de Elementor auto-hospedadas **Roboto** y **Roboto Slab**. El tema declara además Arimo, Maven Pro, Open Sans. Iconos: FontAwesome (The7) e `icomoon-the7-font`.
- **Estructura de la home** (orden DOM): header/nav (Home, Presentation, Articles, News, Verify, "Project Here"→unitycoin.net, Privacy, Terms + selector WPML) → **3 Slider Revolution** (`rev_slider_18_1/19_2/20_3`) → animated-boxes de JetElements ("Corruption & Incompetence", "Slavery", "Disintegration of the Family", "Media Brain Washing") → banners ("What will happen to us if we continue in this Society?" con "3rd World War", "Loss of Savings", "Natural Disasters", "Police State", …) → "A New Social Pact" con 6 banners ("To Unite us", "New Educational Model", "New Economic Model", "Centered in the Family", "New Model of Political Participation", "Apply the Scientific Method") → **JetSlider** (slides "Zero Tax", "Spiritual Society", "Authentic Re Evolution", "UNITYCOIN") → "Subscribe to our mailing list" con **formulario Mailchimp** (lista `bienestarmutuo.us13.list-manage.com`) → CTA a `/presentation/` → footer.
- **Implicación importante**: esos "banners" con texto **son encabezados H5 reales, no imágenes**. Buena parte del trabajo de "imagen con texto → overlay" puede no existir. Hay que auditarlo igualmente.
- **Efectos**: 420 referencias de `parallax` + **63 elementos con `elementor-motion-effects`** → probablemente conviven las dos familias (fondo fijo y transform). Pendiente de medir.
- **`/verify/`** (verificación de UnityCoin) tiene un `<h1>Verify</h1>` real; su mecánica interna **no está inspeccionada**. Riesgo abierto.
- **Defectos del original a superar**: home sin `<h1>`, sin `og:image`, `/robots.txt` y todos los sitemaps estándar dan **404** (Rank Math solo expone `/?sitemap=1`), **embed de YouTube con placeholder roto** (`youtube.com/embed/ID`), URL malformada `https://e-nation.org/i.imgur.com/TxzC70f.png`, `/es/home/` duplicada, francés incompleto.
- **Antigüedad**: contenido congelado — RSS `lastBuildDate` mayo 2024, páginas modificadas por última vez 2024-05-04. Infraestructura sí mantenida (versiones actuales, cert renovado 2026-07-21, caché reconstruida 2026-09-10).

### DNS y correo (CONFIRMADO — crítico para el cutover)

- **Nameservers**: `alan.ns.cloudflare.com`, `sharon.ns.cloudflare.com` (la zona ya está en Cloudflare).
- **A del apex**: `e-nation.org` → **157.173.108.34** (TTL 300), **NO proxied** (gris): `Server: nginx`, sin `cf-ray`. Es un VPS propio en **Contabo** (`vmi2138537.contaboserver.net`, AS51167, Lauterbourg, Francia).
- **MX: `5 e-nation.org.`** → **el correo vive en el mismo servidor que el sitio** (157.173.108.34). Es el peor caso para un cutover.
- **SPF**: `v=spf1 ip4:157.173.108.34 ip6:fe80::250:56ff:fe54:f02c -all` (el `ip6:` es un link-local, probablemente inerte).
- **DMARC**: `_dmarc.e-nation.org` → `v=DMARC1; p=reject;` (sin rua/ruf).
- **`mail.e-nation.org` es un CNAME al apex**, y **`www.e-nation.org` también**. **Al cambiar el A del apex, `mail` queda apuntando a Cloudflare, que no reenvía SMTP → el correo se cae.** Hay que restaurarlo como A DNS-only a 157.173.108.34.
- `smtp`, `webmail`, `ftp` **no resuelven**. No hay TXT de DKIM ni de verificación.
- **`docs.e-nation.org`** → 104.16.253.120 / 104.16.254.120 (**Cloudflare**), sirviendo Read the Docs. HTTP **429** a `curl` (posible anti-bot, no confirmado como límite real para humanos).

### Docs externas: Read the Docs (CONFIRMADO)

- **Repo**: `github.com/ElishaBentzi/E-Nation` — público, **Apache-2.0**, rama **`master`**, creado 2018-04-17, **último push 2024-05-07** (mismo mes en que se congeló el sitio), ~3 MB, descripción "Worldwide Physical Distributed Nation".
- **Contenido total** (medido vía API de GitHub): **dos documentos y dos índices** — no hay más.
  ```
  .readthedocs.yaml   (raíz, 1033 B)  ← version:2, ubuntu-22.04, python 3.12,
                                        configuration: docs/en/conf.py,
                                        requirements: docs/requirements.txt,
                                        PDF y EPUB COMENTADOS (o sea: no se usan)
  docs/
    .readthedocs.yaml (duplicado del anterior)
    requirements.in / requirements.txt
    en/  Makefile, Social-Pact-Constitution-English.rst (32.698 B), conf.py (4.865 B),
         index.rst (608 B), images/, _static/, _build/   ← _build COMMITEADO
    es/  Makefile, Pacto-Social-Constitucion-Spanish.rst (35.031 B), conf.py (4.797 B),
         index.rst (656 B), images/, _static/, _build/
  ```
- **Las dos imágenes de los docs son `e-nation200x200.png` y `e-nation300x300.png`, que YA están en la carpeta local del proyecto.** Cero migración de assets.
- **Los docs son dos árboles Sphinx independientes en paralelo** (cada idioma con su `conf.py`), no un sistema de traducción: cada edición hay que hacerla dos veces y nada garantiza sincronía. **Pendiente medir la paridad real EN↔ES.**
- **No hay francés en los docs.**
- `_build/` commiteado = el HTML compilado está en el repo → sirve para **comparar nuestro build contra el de RTD** y verificar fidelidad. Después, a `.gitignore`.
- Los `.rst` del repo (32,7 / 35,0 KB) y los `.md` locales (29,9 / 31,8 KB) **son el mismo contenido**: los locales están **escapados con entidades HTML** (`&quot;`, `&#39;`), firma de una exportación desde HTML. **Atajo**: si coinciden, la conversión a Markdown se reduce a decodificar entidades, no a traducir `.rst` a mano.
- **RE(ADME)**: `docs.e-nation.org/en/latest/` es el patrón URL de RTD (idioma + versión). Al migrar a `/docs/` hacen falta **301 desde `/en/latest/*` y `/es/latest/*`**.
- **Pendiente**: qué hacer con las URLs `*.readthedocs.io` (comprobar si están indexadas antes de borrar el proyecto).

### Las dos EDICIONES del Pacto Social (medido — corrige una hipótesis mía)

**No son el mismo documento con distinto formato: son dos ediciones distintas.** Medido con `tools/compare-docs-text.cjs` y `tools/analyze-docs.cjs`.

| | `.md` local (raíz del proyecto) | `.rst` (repo, publicado en RTD) |
|---|---|---|
| Fecha | **abril 2018** (Sphinx se instaló el 2018-04-20; los `.md` son del 04-24) | **hasta 2024-05-04** |
| Historial git | **ninguno** (nunca commiteados) | **22 commits EN / 25 ES** desde 2018 |
| Párrafos EN | 136 | 176 |
| Palabras EN | 4.534 | **4.935** |
| Palabras ES | 4.650 | **5.201** |
| Párrafos idénticos | solo **53 de 136** | — |
| Prosa EN | concisa e idiomática: *"I wish to be part of this society and I commit myself…"* | más elaborada, otra redacción: *"I, essence of life incarnated in a living homo, who for interaction with third parties respond to the sound ______, express my desire…"* |
| Prosa ES | *"yo deseo formar parte de esta sociedad…"* | *"yo esencia de vida encarnada en un homo vivo…"* |
| Encabezados | 120 | **130** (10 más: el `.rst` **sí** tiene los artículos `0.`–`8.`) |
| Tildes | 480 caracteres acentuados | 513 — **inconsistentes en AMBAS ediciones**, no solo en el `.rst` |

**Conclusión operativa**: el `.rst` es la **fuente de contenido** (es la edición mantenida, la publicada y la que Google indexa, y contiene contenido que el `.md` no tiene: eliminación de impuestos, ciudadanía a no-humanos, detalles del mecanismo de decisión colectiva, ejemplos de artículos). El `.md` **no sirve como atajo**: es un snapshot de 2018 con seis años menos de edición. **Corrige mi hipótesis anterior**, que asumía que los `.md` eran el material fuente de los docs por coincidir los nombres.

**El único defecto estructural, verificado**: subrayado RST roto en EN, línea 437 — `20.2.1.` lleva `'' '' '' '` como subrayado, y en RST los espacios lo invalidan, así que ese apartado **no se renderiza como encabezado**: queda como párrafo sin ancla y fuera del índice. El ES lo escribe bien (`'''''''`). `tools/analyze-docs.cjs` lo detecta y es **el único caso** en los dos ficheros.

**Limpieza orográfica pendiente (editorial — NO se toca sin el usuario)**: la tilde es inconsistente en las dos ediciones para unas pocas palabras: `nación`/`nacion`, `armonía`/`armonia`, `interacción`/`interaccion`. **No es un stripping sistemático**: ambos ficheros tienen cientos de tildes correctas y ambos fallan en las mismas palabras.

**Paridad EN↔ES: en sincronía.** Los dos `.rst` tienen 130 y 131 encabezados con la misma numeración (`0.`, `1.`, … `33.` y sus subapartados). La diferencia de uno es exactamente el `20.2.1.` que en EN no se detecta por el subrayado roto. **No hay contenido desincronizado entre idiomas.**

**Cifras de texto corregidas** (excluyendo encabezados, que antes se colaban como prosa): EN 136 párrafos / 4.534 palabras en el `.md` frente a 150 / 4.883 en el `.rst`; ES 138 / 4.650 frente a 149 / 5.146. El `.rst` tiene 349–496 palabras más. Coinciden en 53 (EN) y 67 (ES) párrafos literales; el resto es redacción distinta.

**Los documentos no contienen enlaces internos** (0 en los cuatro ficheros): solo el `index.rst` de cada idioma tiene enlaces, y apuntan a `http://e-nation.readthedocs.io/en/latest/` y `/es/latest/` — hay que reescribirlos al migrar.

### Verificación pendiente sobre las páginas de artículos (CORREGIDO)

- **Corrección del usuario**: la intención de `/articles/` y `/es/articulos/` era **enlazar a artículos alojados en OTRO WordPress, en OTRO dominio**. Esa es **otra migración**, que hará **otro agente, más adelante**.
- **Por tanto mi hipótesis anterior era ERRÓNEA**: esas páginas **no** contienen el Pacto Social duplicado, y **no hay triple duplicación** del Pacto.
- **Consecuencia buena (simplifica)**: el Pacto Social tiene **una sola casa canónica: los docs**. No hay nada que fusionar entre la página del sitio y los docs.
- **Consecuencia a gestionar**: las páginas de artículos del sitio nuevo llevarán enlaces a un dominio que **todavía no se ha migrado**. Decisión: **reproducirlos fielmente ahora** (no arreglarlos), y anotarlos como dependencia externa a revisar **después** de aquella migración.
- **Pendiente medir** (no asumir): qué contienen realmente hoy esas dos páginas y a qué URLs exactas apuntan.

## Technical Decisions

| Decision | Rationale |
|---|---|
| Skill movida a `.zcode/skills/` del proyecto y **borrada** de scope de usuario | En ZCode, `~/.zcode/skills/` tiene **precedencia sobre** `<repo>/.zcode/skills/` y la shadowea: la copia del proyecto solo se carga si la de usuario no existe. Verificado en la guía de configuración de ZCode. |
| Monorepo reutilizando `ElishaBentzi/E-Nation` | El nombre, la descripción, la licencia Apache-2.0 y el historial ya describen el conjunto (no solo los docs), y la carpeta local también se llama E-Nation. Dos proyectos de Pages sobre un repo: uno para el sitio, uno para los docs. |
| **Docs primero**, como ensayo general | `docs.e-nation.org` es un subdominio de la **zona propia** de Cloudflare: no toca el apex ni el correo. Prueba build → Pages → dominio propio → TLS → 301 de punta a punta **antes** de tocar el registro A donde vive el MX. |
| Docs migradas a **Astro Starlight**, no re-hospedar Sphinx | El volumen es de **dos documentos**: sale más barato unificar stack y tokens que mantener dos generadores, dos sistemas de diseño y el doble mantenimiento EN/ES. Starlight trae **Pagefind** (búsqueda estática, sin terceros) — mejora sobre RTD, no downgrade. |
| URLs de docs a `/docs/` con **301** desde `/en/latest/*` y `/es/latest/*` | El `/latest/` no significa nada en un documento que no se versiona. Se preserva lo indexado con 301. |
| **Memoria de traducción** en vez de replicar WPML | Sin caché, cada regeneración produce redacción distinta para el mismo texto: el diff se vuelve ruido y la verificación captura-contra-captura pierde sentido. Con memoria es **determinista**. Clave estable + `sourceHash` → las traducciones obsoletas se detectan solas. |
| Se conservan URLs, slugs traducidos y hreflang | Eso **no es bookkeeping, es SEO**: Google indexa URLs. `/es/presentacion/` ya está indexada; cambiarla arriesga equity a cambio de nada. |
| Español como idioma de autoría; EN y FR generados | Decisión del usuario. El inglés sigue siendo la versión canónica para Google (vive en la raíz, como hoy). |
| Traducciones **en sesión**, sin API keys | Decisión del usuario. La memoria versionada es el artefacto revisable. |
| Legales: el FR **enlaza a la versión EN** | Decisión propia, reversible, pendiente de confirmación del usuario. No se asume el riesgo de traducir automáticamente un texto legal. Reversión en un paso si el usuario aporta el francés en `content/legal/`. |
| **Propiedades lógicas de CSS** (`ps-`/`pe-`, `text-start`/`text-end`) desde el primer día | Cuesta lo mismo ahora y el día que se añada árabe o hebreo el layout se voltea solo. |
| `_build/` de Sphinx fuera del control de versiones (tras usarlo para comparar) | Es salida compilada. Pero commiteado sirve una vez: comparar nuestro build contra el de RTD. |

## Issues Encountered

| Issue | Resolution |
|---|---|
| `curl` a `docs.e-nation.org` devuelve **429** | No confirmado si es anti-bot o límite real. Se resuelve migrando a infraestructura propia, que es justo lo decidido. |
| `WebFetch` del árbol completo del repo por API de GitHub no devolvió texto | Se resolvió consultando directorio por directorio (`contents/`, `contents/docs`, `contents/docs/en`, …). |
| ~~`video-3d-structures` desapareció de `~/.zcode/skills/`~~ | **FALSO POSITIVO, cerrado por el usuario**: la movió él mismo a otro proyecto con otro agente de programación. No hay pérdida ni cuarentena. Lección: el listado de skills del arranque de sesión es una foto fija y otros agentes modifican el disco a la vez; hay que preguntar antes de declarar una desaparición. |
| **Mi analizador de RST exigía subrayados de 3+ caracteres** y este documento subraya los artículos con `~~` (dos) | **Corregido.** Hizo invisibles los 10 encabezados de artículo (`0.`–`8.`) y me llevó a afirmar por error que "al inglés le faltan los artículos 1–8". Regex a `{1,}`. |
| **Generalicé "el español perdió los acentos" desde una muestra de 2 palabras** | **Corregido.** La medición dice lo contrario: el `.rst` tiene 513 caracteres acentuados frente a 480 del `.md`. Es inconsistencia puntual en ambas ediciones, no stripping. Lección: no afirmar sobre un corpus desde una muestra. |
| **La comparación de texto contaba los encabezados del `.rst` como prosa** (en el `.rst` el título es una línea normal marcada por el subrayado siguiente; en el `.md` empieza por `#` y se descarta solo) | **Corregido.** Inflaba el recuento del `.rst`. Ahora se excluyen los encabezados y sus subrayados antes de comparar. |

## Resources

- Sitio origen: https://e-nation.org · docs actuales: https://docs.e-nation.org/en/latest/
- Repo de docs/sitio: https://github.com/ElishaBentzi/E-Nation (rama `master`)
- Implementación de referencia de este pipeline: `C:\Users\Elisha\Documents\Comercio\Proyectos\pharmacie_puymirol_migration\`
  - `reference/extract-content.php` — extractor de WP (a ampliar con WPML)
  - `astro-site/astro.config.mjs`, `astro-site/functions/[[path]].js`, `astro-site/public/_redirects` — plantillas validadas
  - `tools/build-charte.cjs` — copia adaptada de la plantilla de página legal
- Skill del proyecto: `.zcode/skills/wordpress-to-cloudflare/SKILL.md`
- Plantillas de memoria: `~/.zcode/planning-templates/`

## Visual / Browser Findings

Pendiente. Aún no se ha capturado nada del original. Cuando se haga (Fase 2): capturas full-page de las 16 URLs a 1440 px y 390 px, y el **registro por escrito de lo que se vio** en cada una (el contenido visual no persiste en contexto).

#### Decisión del usuario sobre las imágenes

**Solo se convierte `org-piramid.png`.** Es el diagrama con *Responsibility · Power · Wages · Decisions*, contenido propio del sitio con palabras que un lector leería. Las otras tres candidatas (`31-coin.png`, `8-pact-economy.jpg`, `2-hand-passport.png`) **se quedan como imagen**, y los 11 logotipos de prensa y las 4 con texto incidental de la fotografía también, como estaba previsto.

**Consecuencia práctica: el trabajo de «imagen con texto → texto superpuesto» se reduce a UNA imagen.** Lo que en el plan inicial era un capítulo entero del proyecto queda en una pieza, y además es un diagrama, así que lo más probable es reconstruirlo como SVG o con capas de texto posicionadas en vez de recortar el fondo.

Las coordenadas y el tamaño de los textos de esa imagen hay que medirlos sobre el original cuando se aborde la conversión (Fase 6), no antes.

### Fase 5: el stack del sitio, y las rutas generadas del manifiesto

**16 páginas construidas con las URLs EXACTAS del original.** El manifiesto i18n se **genera** de los grupos de traducción de WPML (`tools/build-site-i18n.cjs` → `astro-site/src/i18n/config.ts`), no se escribe a mano: Astro no soporta slugs traducidos por configuración, y escribir a mano 7 páginas × 3 idiomas es donde se cuelan los errores.

| idioma | rutas |
|---|---|
| **en** (raíz, sin prefijo) | `/` `/articles/` `/news/` `/privacy-policy/` `/terms-and-conditions/` `/presentation/` `/verify/` |
| **es** | `/es/` `/es/articulos/` `/es/noticias/` `/es/politica-de-privacidad/` `/es/terminos-condiciones-del-servicio/` `/es/presentacion/` `/es/verificar/` |
| **fr** | `/fr/articles/` `/fr/nouvelles/` |

7 + 7 + 2 = **16, las mismas que el WordPress original.** Verificado: canonical, hreflang de los tres idiomas más `x-default`, y el sitemap con las 16.

**El inglés es el predeterminado del SITIO** (vive en la raíz, como el original) mientras que en la **documentación** el predeterminado es el **español**, porque allí el español es el idioma de autoría. Son dos decisiones distintas y conviene no confundirlas.

**Añadir un cuarto idioma no toca componentes**: una línea en el manifiesto, contenido, y las cuatro rutas (`index`, `[...slug]`, `[locale]/index`, `[locale]/[...slug]`) lo generan todo. El filtro `slugs[locale] !== undefined` hace que solo se cree lo que existe, sin 404 ni huecos: por eso el francés produce exactamente dos páginas.

#### El tema claro/oscuro/auto: verificado midiendo

| prueba | resultado |
|---|---|
| Estado inicial | Carga en oscuro porque el navegador prefiere oscuro (`auto`) |
| Fondo oscuro | `rgb(11, 26, 43)` — construido desde los azules **medidos** del original |
| Texto oscuro | `rgb(232, 232, 232)` = el `#e8e8e8` medido |
| Tipografía del `h1` | **Roboto Slab**, la del original |
| Pulsar «claro» | `dark: false`, fondo `rgb(255,255,255)`, guardado `light` |
| Pulsar «oscuro» | `dark: true`, fondo `rgb(11,26,43)`, guardado `dark` |
| Pulsar «auto» | Vuelve a seguir al sistema, guardado `auto` |
| Marcado del botón | `aria-pressed="true"` en el activo |
| **Sin destello al recargar** | Con `light` guardado y el navegador prefiriendo **oscuro**, carga en blanco **desde el primer momento** |

Lo último es lo delicado: el guion del tema va **en línea en el `<head>`**, antes del primer pintado. Si se cargara diferido, se vería un destello oscuro antes del claro y el selector parecería roto aunque funcionara.

**El modo oscuro es la única parte del diseño que NO se extrae del original** (el WordPress no tiene modo oscuro) y por eso está construido **solo con colores medidos**: fondos desde `#003f7f`/`#234965`, texto `#e8e8e8`, acentos los mismos. **Ningún color nuevo.** Queda pendiente que el usuario lo vea y lo apruebe o ajuste.

#### Dos fallos silenciosos del build que conviene recordar

1. **El CSS no se aplicaba en absoluto.** El build pasaba —Astro no exige que la hoja se importe— y las páginas salían **sin ningún estilo**. Se detectó midiendo el HTML construido, no el log del build.
2. **Mi propio test dio un falso positivo**: un `grep … | head -1 && echo "presente"` imprimía «presente» aunque el grep no encontrara nada, porque `head` siempre devuelve 0. De ahí saqué la conclusión errónea de que el CSS estaba bien cuando no existía.

Y un tercero, de sintaxis, que el build sí cazó: los ids con guion (`privacy-policy`) **no son claves válidas sin comillas en TypeScript**; el generador ahora las entrecomilla solo cuando hace falta.
