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

### El enlace a los docs y el selector de idioma (peticiones del usuario)

#### El enlace «Constitución» apuntaba a Read the Docs

El menú apuntaba a `docs.e-nation.org/<idioma>/latest/`, y **ese dominio todavía sirve Read the Docs**, así que el visitante acababa en la herramienta que estamos dejando de usar. Corregido: ahora apunta al **despliegue nuevo** (`docs.unitygenerator.com`), y **con el mapa de rutas correcto de la documentación**, que no es el del sitio:

| idioma | URL de los docs | por qué |
|---|---|---|
| es | `docs.unitygenerator.com/` | en los docs el predeterminado es el **español**, va en la raíz |
| en | `docs.unitygenerator.com/en/` | |
| fr | `docs.unitygenerator.com/fr/` | |

**Ojo con la asimetría, que es deliberada**: en el **sitio** el predeterminado es el **inglés** (raíz) y en la **documentación** es el **español** (raíz). Es correcto en cada caso —el español es el idioma de autoría del Pacto— pero conviene no confundirlos.

El host vive en `astro-site/site.config.mjs` como constante única: el día que los docs muden a su dominio definitivo se cambia esa línea y nada más.

#### Selector de idioma: de tres enlaces a uno colapsado

Con 2 idiomas los tres enlaces cabían, pero **con 3 ya empujaban la navegación y con 4 la rompen**, y el sitio está pensado para crecer. Ahora es un desplegable colapsado que ocupa el ancho de **una etiqueta, independientemente del número de idiomas**.

Decisiones que importan:

- **`<details>`/`<summary>`, sin JavaScript.** Es un desplegable nativo: funciona sin JS, se abre con teclado y lo anuncian bien los lectores de pantalla porque usa la semántica del navegador. Un desplegable hecho a mano obliga a gestionar foco, cierre al pulsar fuera y teclas Escape/flechas, y casi siempre se hace peor. Aquí el interior son enlaces, no hace falta estado: es el caso donde `<details>` es la opción correcta.
- **Sin banderas, y esto es una recomendación de fondo.** Una bandera representa un **país**, no un idioma: el español no es solo España, el inglés no es solo el Reino Unido, el francés no es solo Francia. Poner banderas excluye a la mayoría de los hablantes y obliga a inventarse una bandera para idiomas que no tienen país. Se usa el **nombre del idioma en su propio idioma** (endónimo), que un hablante reconoce de un vistazo.
- **Solo ofrece los idiomas en los que existe esa página.** Desde `/presentation/` no aparece Français (no existe la presentación en francés) en lugar de ofrecer un enlace que llevaría a un 404 o al inicio.
- **Cada enlace lleva a la MISMA página** en el otro idioma, no al inicio. Verificado: `/presentation/` → `/es/presentacion/`, y `/fr/articles/` → `/articles/` y `/es/articulos/`. Es exactamente el defecto que el original tenía con el francés.

### Los sliders son banners entre proyectos: `banner-publicidad`

Medido con `tools/analyze-sliders.cjs`: **los 4 sliders suman 220 capas**, y el que importa es `banner-publicidad` — **21 slides y 157 capas**, que es casi todo el trabajo.

**Sus 63 assets de imagen viven en 9 dominios distintos**, y los destinos de sus enlaces lo confirman: es literalmente un carrusel de banners de los proyectos del usuario.

| destino | qué es |
|---|---|
| `sbmjuegos.com` (raíz, `/es/`, `/fr/`) | otro proyecto |
| `sbmlibre.com` (raíz, `/es/`, `/fr/`) | otro proyecto |
| `unitycoin.net`, `mutualwelfare.org`, `bien-etremutuel.org` | otros proyectos |
| `bienestarmutuo.org`, `bienestarmutuo.org.ve` | otros proyectos |
| `bienestarmutuo.org` | **24 de los 63 assets viven aquí, no en e-nation.org** |

**15 de los 21 slides enlazan** a 11 destinos distintos. Los 6 restantes no tienen enlace: son slides de título o hay mapeo perdido — queda **avisado**, no descartado en silencio.

**Los otros tres sliders (`e-nation`, `snake`, `vertical-horizontal`) NO enlazan a nada**: son las animaciones de adorno de la home (el logo, la serpiente). Así que "0 enlaces" ahí es **correcto**, no un fallo.

#### El componente reutilizable

`shared/banner-slider/` — carrusel autónomo (Astro + script, sin jQuery ni licencia) alimentado por un JSON con formato propio documentado, más `tools/revslider-to-config.cjs` como generador. **Está escrito para copiarse a otros proyectos de conversión**, con su README y su contrato de configuración. Detalles de por qué en la skill.

#### Cuatro trampas que costaron tiempo (todas en la skill)

1. **Los enlaces NO están en las capas sino en `params.seo.link`**, a nivel de slide. Mi primera conversión dio `enlaces: 0` y además **imprimió «sin avisos: todo mapeado»**: un falso «todo bien» sobre justo lo que da sentido a estos banners.
2. **Las dimensiones son `size.width`/`size.height`**, no `gridWidth`/`gridHeight`. Leer las claves equivocadas **no falla**: devuelve `undefined`, el lienzo queda sin alto y **el contenedor colapsa a 0** con las capas apiladas encima del pie. Fallo puramente visual: el build pasa.
3. **`size.maxWidth`** limita el ancho en `banner-publicidad` (1166). Ignorarlo lo estiraba a todo el ancho y cambiaba la escala de todas las capas.
4. **El texto de 6 capas lleva HTML real** (`Spanish Edition <i class="fa-download"></i>`): texto más un icono que el original renderizaba. Escapado, el visitante veía el código.

#### Estado de la reconstrucción de los sliders

Verificado que funciona: **1166 px de ancho (el `maxWidth` respetado), 282 px de alto, 21 slides, 54 imágenes externas cargando y los 15 enlaces con `rel="noopener"`**. Texto real visible («Juega y Coopera para Crecer»).

**Falta calibrar la posición de las 85 capas de imagen.** Están posicionadas en píxeles relativos al lienzo de 1240 px del original, y el banner sale oscuro porque caen fuera del área visible. Es exactamente el trabajo del **bucle de comparación contra las capturas de referencia**, que es la siguiente ola.

### Calibrar los sliders: el diagnóstico y las dos piezas que faltan

La posición de las capas salía mal y la causa era **de datos, no de estilos**.

#### El error que lo causaba

De **220 capas, 162 no declaran anclaje horizontal** y 187 no declaran el vertical: vienen como `{e:true}`, **sin valor**. Esas capas se posicionan por **píxeles** (`position.x`/`position.y`) desde la esquina superior izquierda del lienzo. Solo 58 declaran `center` y 33 `middle`.

Mi generador hacía `horizontal: horiz.valor || 'center'`: **inventaba `center` cuando el valor no estaba**. Un valor ausente NO es un valor por defecto. Eso mandaba 162 capas fuera del área visible y el banner se veía vacío. Corregido: el anclaje se emite como `null` cuando no está declarado, y hay una marca `porPixeles` para que el componente convierta los píxeles a porcentaje del lienzo y el banner escale con el contenedor.

#### La fuente buena: el marcado renderizado

El HTML del original trae el marcado de RevSlider 6 **con los valores por defecto ya aplicados** por el plugin, en formato compacto:

```html
<rs-slide data-link="//sbmjuegos.com" data-target="_blank" data-duration="5000">
  <rs-layer data-type="text"
            data-xy="x:34px;y:202px;"                       posición, con x resuelto
            data-color="#ffffff"
            data-text="w:normal;s:39;l:35;ls:0px;fw:700;"   tipografía
            data-dim="w:665px;"
            data-frame_0="tp:600;"                          animación de entrada
            data-frame_1="tp:600;st:910;sp:1000;sR:910;">
```

Comparado con la base de datos, donde hay que deducir qué significa cada ausencia, **aquí se lee**. Pero tiene un límite encontrado al usarlo: **RevSlider solo renderiza los primeros slides y carga el resto bajo demanda**, así que el HTML trae 5 de los 21 slides de `banner-publicidad`. Sirve para aprender las reglas y los valores por defecto, **no como fuente completa**.

#### Dónde vive la tipografía: en `idle`

Costó encontrarlo. En la base de datos la capa no tiene `fontSize` ni `color` en primer nivel, y `customCSS` solo trae el espaciado entre letras. **La tipografía está anidada en `idle`**, que es el estado base del sistema de estados de Revolución (hay también `hover`): `idle.fontFamily`, `idle.fontSize`, `idle.fontWeight`, `idle.lineHeight`, `idle.letterSpacing`.

**Y aparecieron cuatro tipografías que no tenía en los tokens**: `Actor` (6 capas), `Martel Sans` (3), `Raleway` (6) y `Belleza` (2). Comprobado en el HTML: **Actor y Martel Sans sí se cargan**; Raleway solo se declara en el CSS del plugin y Belleza no aparece, así que esos dos probablemente caen a un sustituto.

#### Las dos piezas que faltan

1. **La tabla `revslider_css` (presets de estilo) no se extrajo.** Las capas **no declaran color**: lo toman de un preset (`idle.style`, p. ej. `"Fashion-BigDisplay"` o `"very_large_text"`). Sin esa tabla hay que adivinar los colores, y adivinar es justo lo que no se hace. **Añadida al extractor PHP**: hay que volver a ejecutarlo para tenerla.
2. **El marcado solo trae los slides ya renderizados**, pero **sí trae los colores resueltos** (`data-color="#ffffff"`). Recorriendo el slider con el navegador se pueden cosechar los 21 slides con sus valores resueltos — es la vía que evita depender del presupuesto.

Ambas cosas están anotadas. **El banner ahora sale oscuro porque las 85 capas de imagen caen fuera del área visible**, y con el anclaje ya corregido el siguiente paso es aplicar la conversión de píxeles a porcentaje y comparar contra las capturas.

#### Calibración resuelta: el banner ya se renderiza

Medido tras los arreglos:

| comprobación | antes | ahora |
|---|---|---|
| Capas dentro del banner | 0 de 5 | **4 de 5** |
| Slides visibles a la vez | **21 de 21** (todos apilados) | **1 de 21** |
| Tamaño de fuente computado | — | **40,43 px** = 43 px escalado de 1240 a 1166 ✓ |
| Ancho del banner | 1425 px | **1166 px** (el `maxWidth` del original) |
| CSS generado | 9.608 B | **15.774 B** |

Y visualmente: se ve el logo **SBM Juegos®**, el texto «Juega y Coopera para Crecer» sobre su barra, las formas amarillas y rosas, el fondo texturizado y las flechas — **solo el contenido de un slide**.

**Cómo se convirtió la posición.** Los píxeles se traducen a **porcentaje del lienzo** y la tipografía a **unidades de contenedor (`cqw`)**, con `container-type: inline-size` en el componente. Así el banner entero escala con la ventana como hacía el plugin, en vez de quedarse clavado. Las capas usan `left`/`top` **físicos** y no lógicos a propósito: esto replica una composición gráfica fija, y en un idioma RTL espejar el banner pondría los logos del revés.

#### El fallo más importante de esta ola: Tailwind no veía el componente compartido

**`.opacity-0` NO existía en el CSS aplicado**, así que los **21 slides se pintaban todos encima a la vez** — se veían textos de proyectos distintos superpuestos e ilegibles.

La causa es de arquitectura: **Tailwind v4 solo detecta las clases usadas dentro del proyecto de la app**, y `shared/banner-slider/` vive **fuera de `astro-site/`**. Sus utilidades no se generaban.

Se arregla declarando la fuente explícitamente en `global.css`: `@source '../../../shared';`.

**Por qué este fallo es peligroso**: es invisible por partida doble. El build **pasa**, y el HTML **contiene las clases escritas** (se ven en el `class`), así que cualquier comprobación que mire el HTML lo da por bueno. Solo se detecta **midiendo el estilo computado** —`getComputedStyle` decía `opacity: 1` en los 21 slides— o mirando la página. Es la enésima confirmación de la regla del proyecto: un HTML con el marcador correcto NO prueba que el estilo se aplique.

**Consecuencia general**: si se añaden más componentes compartidos fuera de la app, hay que declararlos en `@source` o sus clases no existirán.

### Los presets de estilo llegaron, y con ellos una corrección de fondo

El usuario re-ejecutó el extractor con la tabla `revslider_css`: **109 presets**. Y con ellos se resolvió el color de todas las capas de texto.

#### La cascada la tenía INVERTIDA

Resolví primero por el preset (`idle.style` → `Fashion-BigDisplay` → `#000000`) y **el texto del banner salía NEGRO**, cuando en el original se ve claro. El marcado renderizado decía `data-color="#ffffff"` para esa misma capa.

**El error de razonamiento**: traté el preset como la fuente principal y el marcado como último recurso, cuando es al revés. El marcado es **la salida final del plugin**, con el preset y la capa ya combinados y con los valores por defecto aplicados; el preset es solo **la base**. Poner la base por delante del resultado real es invertir la cascada.

**Orden correcto, y por qué cada puesto:**

1. **Lo que declara la capa** (`idle`): es una decisión explícita del autor para esa capa.
2. **Lo que resuelve el marcado renderizado**: es el resultado real, con todo combinado.
3. **El preset**: base para lo que no haya quedado resuelto.

Resultado tras corregirlo: **49 colores de la capa, 25 del marcado, 0 del preset** — porque el marcado cubre los casos que antes resolvía el preset, y el blanco pasa a ser el color dominante, como en el original. **Ninguna capa de texto con contenido se queda sin color**; las 6 sin color son capas **vacías** que el componente filtra y no pintan nada.

#### Otra trampa: los `uid` de RevSlider son POR SLIDER

Al usar el marcado como fuente, indexé los valores resueltos por `uid` de capa. No funcionaba: **los `uid` de RevSlider son por slider, no globales**, así que la capa 3 del slider A y la capa 3 del slider B colisionaban y una se quedaba con el color de la otra. Hay que indexar por `módulo-uid`.

#### Límite conocido del marcado

Solo trae **los slides que el plugin renderiza de entrada**: 5 de los 21 del banner. Para los otros 16 no hay valores resueltos y se cae al preset. Si hiciera falta precisión total en los 21, habría que recorrer el slider con el navegador para cosechar cada slide ya renderizado.

#### Recuento final de los sliders

| | |
|---|---|
| Capas totales | 220 (157 en el banner de publicidad) |
| Capas de texto con contenido | 80 |
| Con color resuelto | **74 (100 % de las que pintan)** |
| Enlaces extraídos | 15, a 11 destinos de otros proyectos |
| Tipografías en uso | Arial, Arimo, **Raleway**, **Actor**, **Martel Sans**, Roboto Slab, Belleza, Maven Pro, Open Sans, Georgia |

### Animaciones del banner: implementadas, y una limitación del navegador de pruebas

Se extrajeron los fotogramas del original y se implementó el escalonado. Los valores medidos en el carrusel de banners: **retardos de 10 a 870 ms** y duraciones de 500 a 1000 ms, de modo que las capas se van componiendo en vez de aparecer de golpe. En `vertical-horizontal` el escalonado llega a **7.800 ms**.

**Dos correcciones por el camino:**

1. **`none translate(...)` no es CSS válido.** La animación componía el anclaje con el desplazamiento de entrada, y cuando el anclaje valía `none` el navegador **descartaba la declaración entera en silencio**: solo se animaba el fundido, sin desplazamiento y sin ningún error. Se resolvió animando la propiedad **`translate`**, que es **independiente de `transform`** y por tanto no puede chocar con el posicionamiento. Es la solución correcta y además más simple.
2. **Faltaba marcar las capas de imagen**: solo se habían marcado las de texto, así que 152 capas tenían las variables pero 66 la marca. Ahora las llevan las 152.

**LA LIMITACIÓN, y explica capturas anteriores que salían en blanco:** en el navegador automatizado **las animaciones CSS no avanzan con el reloj real**. Verificado con un control: una animación trivial creada al vuelo se queda en `currentTime: 0` con `playState: running`.

Consecuencia importante: como la animación usa `fill-mode: both` y el fotograma inicial tiene opacidad 0, **mientras el reloj no avanza las capas se quedan invisibles**. Eso es exactamente lo que hacía que el banner saliera vacío en algunas capturas. **No es un fallo del código** —en un navegador real las animaciones corren— pero conviene saberlo para no confundirlo con un problema del banner.

**Lo que sí quedó verificado**: forzando `currentTime` a mano, la opacidad progresa **0 → 0,66 → 0,92 → 1** respetando el retardo de 910 ms. O sea que los fotogramas y los tiempos son correctos; lo que no se puede observar aquí es el avance en tiempo real.

### El carrusel de banners mezcla TRES idiomas

El índice de diapositivas (`reference/INDICE-DIAPOSITIVAS.md`) lo dejó a la vista: las 21 diapositivas del carrusel vienen **en parejas o tríos de idioma**.

| # | textos | idioma |
|---|---|---|
| 1 | Juega y Coopera para Crecer | español |
| 2 | Mutual Welfare Society · Spanish Edition | inglés |
| 3 | Société du Bien-être Mutuel · Edition Espagnol | **francés** |
| 4 | Model of Participation · POLITICS | inglés |
| 5 | Modèle de Participation · POLITIQUE | **francés** |
| 6 | WORKSHOPS | inglés |
| 7 | ATELIERS | **francés** |

**Y el mismo carrusel se sirve en las dos presentaciones**, porque el shortcode es idéntico en ambas. Así que **quien visita el sitio en inglés ve banners en español y en francés**, y al revés.

Es un defecto del original, o una decisión deliberada de mostrar todos los idiomas. En cualquier caso **hay que decidirlo**: lo coherente en un sitio multi-idioma es que cada idioma muestre sus banners. Es una decisión del usuario, no mía.

### Herramienta nueva: índice de diapositivas

`tools/slide-index.cjs` → `reference/INDICE-DIAPOSITIVAS.md`. Da a cada diapositiva **un número estable**, su título, su destino y los textos que aparecen dentro, que es por donde se reconoce de un vistazo. Permite decir «la 7, la de SBM Juegos» y hablar de la misma sin ambigüedad. Se regenera solo, así que no se desincroniza.

### Defecto corregido: cada idioma muestra solo sus banners

Decisión del usuario: ver varios idiomas a la vez **es un defecto**. Corregido.

#### Cómo se detectó el idioma de cada diapositiva

RevSlider **no guarda el idioma en ninguna parte**: sus diapositivas son solo un orden. Hubo que deducirlo, y se usaron **dos señales**:

1. **El texto de las capas** — caracteres propios (ñ, ¿, ç, à) y palabras que existan en un idioma y no en los otros.
2. **La imagen de fondo**, y esta es la fuerte: las variantes de idioma de una misma diapositiva **comparten el visual y solo cambian el texto**, así que agrupar por fondo revela las familias. Se encontraron **8 grupos de visual repetido**, que confirma la hipótesis.

**Trampa que costó un falso empate**: puse `union` entre las palabras del inglés y del francés, y como es **idéntica en los tres idiomas**, hizo empatar una diapositiva claramente española (`"para Nuestra Verdadera Libertad"`). **Solo sirven palabras que discriminen.**

**Reparto resultante del carrusel de banners** (21 diapositivas):

| idioma | diapositivas |
|---|---|
| **en** | 2, 4, 6, 8, 10, 14, 17, 20 → **8** |
| **fr** | 3, 5, 7, 11, 12, 15, 18, 21 → **8** |
| **es** | 1, 9, 13, 16, 19 → **5** |
| **neutras** | las sin texto traducible (una letra suelta o solo imágenes) → se ven en **todos** |

Y se ve la estructura: **#9 / #10 / #11 son el mismo mensaje en tres idiomas** («SOCIEDAD DEL BIENESTAR MUTUO · ¡UNA VENEZUELA 100% NUEVA!» / «MUTUAL WELFARE SOCIETY · A 100% NEW VENEZUELA!» / «Société du Bien-être Mutuel · Une nouvelle venezuela à 100%!»).

#### Resultado verificado

| página | diapositivas | textos |
|---|---|---|
| `/presentation/` (inglés) | 9 (8 en + 1 neutra) | Mutual Welfare Society · Model of Participation · POLITICS |
| `/es/presentacion/` (español) | 6 (5 es + 1 neutra) | Juega y Coopera para Crecer · SOCIEDAD DEL BIENESTAR MUTUO |

Cada idioma ve **solo sus banners**. El original servía los 21 en las dos presentaciones.

#### Decisión de diseño: el archivo de idiomas es de DECISIÓN, no de datos

`astro-site/src/sliders/idiomas.json` se genera detectando, **pero no se pisa al regenerar**. Si el detector volviera a escribir encima, cualquier corrección a mano se perdería — y es justo lo que hay que poder corregir, porque clasificar rótulos cortos por palabras puede fallar. Al existir, el generador solo **informa de las diferencias**.

Una diapositiva sin texto traducible se marca `*` (**neutra**, se ve en todos los idiomas) en vez de dejarla sin determinar: esconderla de todos sería peor que mostrarla.

El filtrado se aplica en `slidersDe(page, locale)`, que entrega al componente la configuración **ya filtrada**: el componente no sabe nada de idiomas, y sigue siendo reutilizable en otro proyecto.

### El sitio queda listo para desplegar en el dominio de prueba

Preparado para Cloudflare Pages en **`web.unitygenerator.com`**, un subdominio nuevo. **No se usa el apex a propósito**: en `unitygenerator.com` el apex ya redirige a la documentación, y usarlo para el sitio rompería esa redirección. Un subdominio no toca nada de lo que ya funciona.

**Configuración, en un solo archivo** (`astro-site/site.config.mjs`): `SITE`, `PRIMARY_HOST` e `INDEXABLE`, con la lista de cambio al dominio definitivo escrita dentro. El `robots.txt` y el `site` de Astro salen de ahí, así que no pueden desincronizarse.

| pieza | estado |
|---|---|
| 16 rutas construidas (7 en · 7 es · 2 fr) | verificado, todas 200 |
| `robots.txt` | `Disallow: /` (es revisión; el WordPress de e-nation.org sigue siendo el que debe posicionar) |
| `_redirects` | 301 desde el WordPress, **con las rutas de assets partiendo de `/zero/`** |
| `functions/[[path]].js` | 301 por host, deja pasar `*.pages.dev` para poder verificar antes de tocar el DNS |
| canonical, hreflang y sitemap | las 16 URLs apuntan a `web.unitygenerator.com` |
| imágenes | **171 locales** en `/images/AAAA/MM/`, más las de otros proyectos que se quedan externas |

#### Un fallo real que salió al servir el sitio

Al verificar el artefacto servido, **`/images/2018/10/e-nation-logo-L.png` devolvía 404**. Causa: **34 imágenes que solo se referencian desde los sliders no estaban en el inventario de medios**, porque ese inventario salió del export de WordPress y hay assets que viven únicamente en la configuración del plugin (la carpeta `2017/12/`, entre otras). Descargadas las 34. Ahora **cero referencias locales sin fichero**.

**Lección**: verificar el artefacto *servido*, no solo construido. Un `dist/` correcto puede tener referencias a ficheros que no existen, y el build no lo detecta.

#### Qué va a mostrar el despliegue de prueba

El contenido de las páginas es todavía un esqueleto, porque la reconstrucción es la fase siguiente. **Lo que sí se puede revisar ya son los sliders**, que es lo que el usuario quiere ver: el carrusel de banners con sus enlaces, sus colores resueltos, sus tipografías y el escalonado de entrada, y **solo las diapositivas del idioma de cada página**.

### El sitio está desplegado y verificado en `e-nation-site.pages.dev`

**Proyecto `e-nation-site`** (root `astro-site`). Verificado en producción:

| comprobación | resultado |
|---|---|
| Las **16 rutas** | todas **200** |
| `robots.txt` | `Disallow: /` (es revisión) |
| Imágenes locales (`/images/AAAA/MM/`) | **200** |
| canonical | `https://web.unitygenerator.com/presentation/` |
| hreflang | `en`, `es`, `x-default` |
| **Carrusel en `/presentation/`** | **9 diapositivas, 62 capas animadas, 60 con retardo escalonado** |
| **Carrusel en `/es/presentacion/`** | **6 diapositivas, 30 capas animadas, 28 con retardo** |
| Enlaces a otros proyectos | 5 destinos, todos con `rel="noopener"` |

**Y el filtro por idioma se ve funcionando en producción.** En la página inglesa los textos son «A 100% NEW VENEZUELA!», «English Edition», «Designed for the Benefit of WHOLE SOCIETY»; en la española, «BIENESTAR MUTUO», «Juega y Coopera para Crecer», «Economía Etica Social 2.0». **Sin mezcla.**

#### El dominio de prueba da 522, y el motivo está identificado

`web.unitygenerator.com` resuelve a las IPs de Cloudflare pero responde **522** (el borde no alcanza el origen). Y **ya no lo sirve el proyecto de docs**: antes redirigía a `docs.unitygenerator.com` y ahora da 522 también en `/pacto-social/`.

O sea: **se quitó del proyecto de docs (paso 1 hecho) pero todavía no se ha añadido al proyecto del sitio (paso 3)**. Con el registro apuntando a ningún proyecto, Cloudflare devuelve 522.

**El orden sigue importando**: el dominio propio se añade **desde dentro del proyecto** (`e-nation-site` → Custom domains), y es eso lo que hace que Cloudflare reapunte el registro. Añadirlo como registro suelto no basta.

**Lo importante: el sitio ya se puede revisar en `https://e-nation-site.pages.dev/`**, que funciona. El dominio propio es un paso aparte y no bloquea la revisión del carrusel.

#### Nota sobre la verificación visual del carrusel

**No la puedo hacer yo**: las animaciones de entrada usan `fill-mode: both` con opacidad inicial 0, y en el navegador automatizado **las animaciones CSS no avanzan con el reloj real** (verificado con un control). Así que en mis capturas las capas se quedan invisibles y el banner parecería vacío. **Es una limitación del entorno de pruebas, no del banner**: en un navegador real las animaciones corren. La revisión visual tiene que hacerla el usuario.

### El carrusel tenía 3 elementos de más, y la causa era estructural

El usuario revisó el carrusel desplegado y vio **8 elementos donde el original tiene 5**. Señaló tres para borrar. **Antes de borrar nada se buscó la causa**, y resultó ser una estructura que yo no había leído.

#### RevSlider organiza las diapositivas en PADRE E HIJOS

| campo | qué dice |
|---|---|
| `child.language` | **el idioma de la diapositiva**, declarado por el plugin |
| `child.parentId` | el padre del que es variante |

Los **padres** son 5 y están en español (Juegos, Venezuela, Pagos, Unity, SBM org); sus **hijos** son las versiones en inglés y francés.

**Cuando se borra un padre, sus hijos quedan huérfanos**: siguen en la base de datos y **el plugin ya no los renderiza**, pero una extracción ingenua se los lleva todos. Eran **6 de 21** (tres versiones viejas × dos idiomas), y esa era exactamente la diferencia entre 8 y 5.

Los tres que el usuario identificó a ojo eran esos huérfanos:

| `parentId` | texto |
|---|---|
| 4 | «Mutual Welfare Society … Spanish Edition English Edition French Edition» |
| 5 | «Model of Participation · POLITICS» |
| 6 | «WORKSHOPS» |

#### El criterio aplicado es estructural, no por contenido

Una diapositiva es huérfana **si declara un `parentId` que no existe entre las de su mismo slider**. Se descartan **los dos idiomas** que corresponde, no solo los tres que se ven en la página inglesa: borrar por contenido habría dejado las parejas en francés, y el defecto habría vuelto a aparecer al revisar el sitio en francés.

**Resultado: 15 diapositivas en tripletes limpios, 5 proyectos × 3 idiomas.** Y las 5 de cada idioma coinciden con los 5 elementos del original. Las capas bajan de 157 a 93.

| proyecto | es | en | fr |
|---|---|---|---|
| SBM Juegos | #1 | #2 | #6 |
| Venezuela / Bienestar Mutuo | #3 | #4 | #5 |
| SBM Libre | #7 | #8 | #9 |
| UnityCoin | #10 | #11 | #12 |
| Mutual Welfare | #13 | #14 | #15 |

#### Y de paso se corrigió un enfoque mío equivocado

**El idioma de cada diapositiva lo DECLARA el plugin** en `child.language`, y yo había construido un detector heurístico que puntuaba palabras y caracteres del texto. Funcionaba —acertó los 21 salvo dos empates—, pero **resolvía un problema que el dato ya resolvía**, y me obligó a mantener una lista de marcas por idioma que es frágil.

Ahora **el valor declarado manda** y la heurística queda solo como último recurso para diapositivas que no lo declaren, **avisando si las dos señales discrepan**. Sustituye `detect-slide-locales.cjs` por `slide-locales.cjs`.

**La lección, que se repite en este proyecto**: antes de construir una deducción, comprobar si el dato ya lo dice. El campo estaba ahí desde el principio y no lo miré.

### Los solapamientos: la causa era que FALTABAN LAS FUENTES

El usuario reportó solapamientos de texto en tres diapositivas. La causa no estaba ni en las posiciones ni en los tamaños: **el sitio no cargaba NINGUNA tipografía**.

RevSlider emite un bloque **`<style class="sr7-inline-css">`** con las declaraciones `@font-face` de las fuentes que usan sus capas, y pone la familia de cada capa en un `style` en línea (`font-family:'Martel Sans'`). **Ese bloque no lo estaba leyendo**, así que las capas pedían «Martel Sans», «Actor» o «Arimo» y el navegador **sustituía por otra fuente con métricas distintas**: el texto ocupaba más ancho y más alto y acababa solapando con las capas vecinas.

**El síntoma es invisible en el HTML**: las clases están bien, la familia está bien escrita, no hay ningún error. Solo se ve al pintar, comparando la distribución del texto.

Extraídas y auto-hospedadas: **6 familias, 20 ficheros, 415 KB** — Roboto, Martel Sans, Actor, Arimo, Maven Pro y Open Sans. Nada de depender de Google Fonts en tiempo de ejecución: el original ya las auto-hospeda.

#### Tres trampas por el camino

1. **Las URLs del marcado son relativas al protocolo** (`//e-nation.org/...`) y `fetch` no las parsea: hay que anteponer `https:`.
2. **El `format()` debe corresponder al tipo de fichero.** Declaraba `format('woff2')` para ficheros `.ttf`, y así algunos navegadores descartan la fuente sin avisar.
3. **CSS exige que los `@import` estén al principio del archivo.** Puse el de las fuentes después de otras reglas y **se ignoró en silencio**: los `.woff2` se copiaban al despliegue, no había ningún error, y las fuentes simplemente no cargaban. Se detectó contando las reglas `@font-face` en el CSS construido: **cero**. Movido arriba: **20**.

### La geometría y las animaciones ahora salen del marcado RESUELTO

Se añadió `tools/markup-geometry.cjs`, que lee del marcado renderizado lo que el plugin **ya resolvió**, y que la base de datos no dice igual:

| qué | base de datos | marcado (resuelto) |
|---|---|---|
| **anclaje** | `horizontal: "center"` **+** `x: "-527px"` | `x:c` → **centrado, sin desplazamiento** |
| **desplazamiento sobre anclaje** | no existe | `y:c;yo:5px` → centrado **y 5 px más abajo** |
| **orden de las capas** | distinto del marcado | el orden real de pintado |
| **animación de bucle** | **no está** | `loop_0="sX:0.8;sY:0.8"` |

Leer el anclaje de la base de datos colocaba esa capa **527 px a la izquierda** de donde va, y el `yo` no se leía, dejando el logo de la moneda descentrado. Es el patrón que se repite en este proyecto: **la base de datos guarda la intención, el marcado el resultado**.

**Se empareja por ID de capa, no por posición en la lista**, porque el orden difiere. La clave incluye los tres datos: `<módulo>-<diapositiva>-<uid>`. Los `uid` de capa son **por diapositiva**, no por slider: indexando solo por módulo y uid, el latido de las monedas de UnityCoin aparecía en Mutual Welfare.

### Animación continua (bucle): lo que el original tiene y lo que no

| diapositiva | bucle en el original |
|---|---|
| **Venezuela** (#3 es, #4 en) | **el corazón, escala 0.8** — el latido |
| **UnityCoin** (#10 es, #11 en) | dos monedas, escala 0.95 |
| SBM Juegos, SBM Libre, Mutual Welfare | **ninguno** |

Implementado en el componente con `@keyframes`, animando la **mitad** del recorrido (el 50 %) para que vuelva al estado original, con `ease-in-out` para que acelere y frene como un latido, e infinito mientras el slide esté activo. Se animan las propiedades individuales `scale` y `rotate`, no `transform`, por el mismo motivo que la entrada: las capas ancladas ya ocupan `transform` para posicionarse.

**Pendiente de decisión**: el usuario pidió animación continua también para **SBM Juegos**, donde el original **no tiene ninguna**. Eso es un añadido, no fidelidad, así que se propone en vez de inventarlo.

### Las diapositivas francesas NO se muestran en ninguna parte

El «problema del francés» que había anotado **no existe en la práctica**, y se resolvió midiendo en vez de trabajando.

Medido con la API del propio plugin en el original (`revapi17.revmaxslide()`): **el carrusel del original tiene 5 diapositivas, solo las de su idioma.** WPML filtra las demás.

Y **el original no tiene presentación en francés**:

| ruta | qué hace el original |
|---|---|
| `/fr/presentacion/` | **301** → `/es/presentacion/` |
| `/fr/presentation/` | **301** → `/presentation/` |
| `/fr/` | **301** → `/` |

O sea: las 5 diapositivas francesas se prepararon para una presentación francesa **que nunca se publicó**, y **no se muestran en ninguna página del original**. En mi sitio tampoco: el francés solo tiene `/fr/articles/` y `/fr/nouvelles/`, así que no hay `/fr/presentacion/` donde aparezcan.

**Consecuencia**: no hay nada que arreglar en su geometría. Es dato muerto, igual que en el original. Queda pendiente decidir si se conservan para cuando exista una presentación en francés, o se retiran.

### Fallo serio corregido: las rutas inexistentes devolvían 200

Al construirse el sitio **sin `404.html`**, **Cloudflare Pages servía la portada con un 200 en cualquier ruta inexistente**. Comprobado: `/foo/`, `/es/no-existe/` y `/fr/inventada/` devolvían 200 con el título de la portada, **mientras que en local daban 404 correctamente**.

Son *soft 404s*: el buscador ve una página válida en infinitas URLs y las indexa como contenido duplicado. En el cutover eso habría sido un problema de SEO difícil de diagnosticar, porque el sitio «funciona».

**Dónde estaba el fallo**: ni en el build ni en local, que estaban bien. Es el comportamiento de Cloudflare Pages ante la falta de `404.html`, y solo se ve **pidiendo una ruta que no existe**. Verificado tras el arreglo: las 4 rutas inventadas dan **404** y las 8 válidas siguen en **200**.

La página nueva resuelve el idioma leyendo el prefijo de la ruta con un guion en línea, porque el fichero es **uno solo para todo el sitio**: generarlo por idioma obligaría a duplicar la página tres veces. Lleva `noindex`.

**Y un recordatorio que casi se cuela otra vez**: la 404 **no usa el layout**, así que tiene que importar la hoja de estilos ella misma. Sin ese import saldría **sin estilos y sin ningún error de build** — exactamente el fallo que ya apareció antes.

### La ola y la flotación: cinco defectos, los tres últimos de fondo

El usuario pidió animaciones continuas para SBM Juegos, SBM Libre y Mutual Welfare: **una ola en las letras** y **flotación suave** en la imagen. Se implementaron, y al medirlas aparecieron cinco defectos encadenados. **Ninguno se veía en el HTML ni rompía el build.**

#### Falso negativo mío: los fotogramas sí estaban

Se buscó `@keyframes bs-ola` en `dist/_astro/*.css`, no aparecía, y se dio por hecho que faltaban. **Los estilos del componente van en línea en el propio HTML** (Astro los inserta ahí porque son pocos), no en la hoja emitida. En `dist/presentation/index.html` estaban desde el principio.

Ya está escrito que un marcador en el HTML no prueba nada; falta la otra mitad: **buscar en el fichero equivocado tampoco prueba nada**. Antes de declarar que algo falta, comprobar en qué fichero se está mirando.

#### Defecto 1: un espacio entre etiquetas se PINTA

Las letras se emitían con el formato de JSX, cada una en su línea:

```
<span class="banner-slider__letra">  P </span><span ...>  l </span>
```

Ese aire alrededor de cada letra (salto de línea y sangría del código) es **contenido de texto** y se pinta: el banner mostraba «P l a y a n d C o o p e r a t e». El texto se volvía mucho más ancho, envolvía de línea y se pisaba con la capa de abajo.

En JSX hay que escribir la etiqueta, la letra y el cierre **en la misma línea**. Y el espacio entre palabras va **fuera** de las letras, como texto normal: dentro de un elemento en línea no hay punto de corte y la frase no podría envolver.

#### Defecto 2: `inline-block` cambia la maquetación del texto

Para animar `translate` hacía falta `display:inline-block`, porque **`translate` no se aplica a las cajas en línea**. Y `inline-block` deja de maquetar como texto: **se pierde el kerning y cada caja redondea su ancho a un píxel entero**. En una frase de 30 letras son varios píxeles de más, la línea deja de caber y **envuelve**.

La solución evita el problema en vez de compensarlo: las letras se quedan **en línea** y la onda se hace con **`position:relative` + `top`**, que sí se aplica a las cajas en línea. La frase se maqueta **idéntica** al texto plano (mismo kerning, mismos cortes) y cada letra sube y baja sin que la línea se entere. Verificado moviendo el reloj de la animación: `top` va de `-0,01px` a `-7,99px` a mitad de ciclo. El coste es que `top` no se compone en la GPU; con ~30 letras en una sola diapositiva es irrelevante.

#### Defecto 3 (el gordo): `calc(0 + 72px)` es CSS INVÁLIDO

En las capas ancladas, el generador emitía:

```
transform: translate(-50%, calc(0 + 72px))
```

**Eso no es CSS válido.** Dentro de `calc()` no se puede sumar el número `0` a una longitud; `0` sin unidad solo vale como longitud en una declaración normal, no dentro de `calc()`. `calc(-50% + 72px)` sí es válido, y ahí estaba la trampa: **solo fallaban los anclajes `left`/`top`**, que son los que llevan base `0`.

El navegador **descarta la declaración entera sin decir nada**, así que esas capas se quedaban en `left:50%; top:0`: cuatro textos apilados en el mismo punto del banner, y el logotipo de la moneda descentrado y cortado. Arreglado con bases con unidad (`0px`) y un normalizador que añade `px` a los números sueltos.

**Cómo se caza esto para siempre**: se añadió al verificador un guardián que recorre cada atributo `style` del documento, separa lo ESCRITO y le pregunta al navegador por cada propiedad (`el.style.getPropertyValue`). Si responde vacío, la descartó. Hoy da **0**.

#### Defecto 4: `customCSS` no era «solo el espaciado»

El generador leía la tipografía de `idle`, y de `customCSS` únicamente el `letter-spacing`. **De las 48 capas de texto, 39 declaran ahí `white-space:nowrap`.** Sin ese `nowrap` el texto envuelve donde el original lo mantiene entero, la capa dobla su alto y pisa la de abajo — el solape que el usuario veía como «el texto de abajo».

Medido en el original para no deducirlo: su titular de Mutual Welfare ocupa **una línea de 727 px dentro de una caja de 761**.

#### Defecto 5: el preset daba un `font-weight` que el original NO aplica

57 de las 93 capas tienen el peso **vacío** (`{"d":{"e":true}}`, o sea «no lo declares»). El respaldo natural era el preset (`Fashion-BigDisplay`, que declara `font-weight:900`)… y **medido en el original esa misma capa se pinta con 400**: el plugin no aplica el peso del preset.

El daño no era cosmético: con 900 el titular **no cabía en su caja**, envolvía a dos líneas y se pisaba con la capa siguiente. El preset deja de ser fuente del peso: sin valor no se emite `font-weight` y el navegador usa el suyo (400), que es lo que hace el original. Las 36 capas que sí declaran 700 lo conservan.

#### Resultado medido

**0 solapes** en las 6 diapositivas y en los dos idiomas, **0 declaraciones descartadas**, y la ola y la flotación confirmadas en movimiento. La flotación se midió con su `translate` cambiando entre dos instantes; la ola, moviendo el reloj de la animación, porque **Chrome congela las animaciones de una pestaña en segundo plano** y `document.hidden` estaba en `true`: medirla así daba «no se mueve» con los fotogramas perfectos.

#### Dos trampas de medición más

1. **La caja del elemento no es lo que se ve.** Una capa puede tener una caja más alta que su texto; comparar cajas inventa solapes que no existen. Lo que el ojo ve son las **líneas**, y se obtienen con `Range.getClientRects()`.
2. **Pero con la ola cada letra es un elemento**, así que `Range` devuelve **un rectángulo por letra**, no por línea. Hay que agruparlos por fila (misma banda vertical) y tomar de cada fila el ancho completo: eso sí es la línea.

#### Pendiente, encontrado de paso (no toca al carrusel de banners)

- El slider **`snake`** tiene 1 diapositiva en nuestra config y **2 en el original**.
- Nuestro banner mide **1166 px** de ancho y el del original **1120** (misma proporción): diferencia de ancho del contenedor de la página.
- El original aplica **`text-shadow: 0 2px 5px rgba(0,0,0,.5)`** a las capas de texto (está en su `customCSS`) y nosotros no.
- Las cajas de varias capas son 3–17 px más bajas que su contenido. Ya no produce solapes, pero conviene revisarlo al comparar con el original.

#### Herramientas nuevas

- `tools/verify-sliders.js` — animaciones y geometría de la diapositiva **activa**.
- `tools/verify-carrusel-geometria.js` — las **seis** diapositivas a la vez: desbordes, solapes por líneas reales (en reposo y con la ola arriba), encuadre de imágenes y el guardián de declaraciones descartadas.
- `tools/sonda-grosor.cjs`, `tools/sonda-idle.cjs`, `tools/sonda-customcss.cjs` — rastrean de qué fuente sale cada valor de estilo.

#### La comprobación del despliegue también puede mentir

Tras desplegar se sondeó producción buscando `banner-slider__letra" … data-astro-cid-jpthgoh5>P</span>` y durante **cinco minutos** dijo que la versión nueva no había llegado. Sí había llegado: **Astro deriva el identificador de ámbito del contenido del bloque de estilos**, así que al tocar los estilos cambió de `jpthgoh5` a `vukvhwsg` y el marcador dejó de existir. Un marcador que incluya un identificador generado por el build **no sirve para comprobar un despliegue**. La comprobación buena es sobre los datos del cambio (`white-space:nowrap`, `calc(0px + …)`, `font-weight:900` a 0) o, mejor, midiendo el estilo computado en el navegador.

**Verificado en producción** (`web.unitygenerator.com`): letras pegadas, 13 capas con `nowrap`, 0 apariciones de `calc(0 + …)` y de `font-weight:900`, **0 solapes** en las 5 diapositivas y en los dos idiomas, y la ola moviendo `top` de 0 a `-7,99px` a mitad de ciclo.

### El vocabulario de efectos de imagen, y la regla que lo decide todo

El usuario pidió ajustar los efectos pieza por pieza, y la petición dejó una regla clara:

> **Si una pieza tiene que verse CENTRADA, no puede desplazarse ni encogerse.**

De ahí salen tres efectos de imagen, con la elección motivada y no estética:

| efecto | qué hace | cuándo |
|---|---|---|
| `flotar` | sube y baja 10 px, 4 s | piezas que pueden moverse |
| `palpitar` | crece a 1,06 y vuelve, 3 s — **nunca por debajo de 1** | logotipos y monedas: al no encoger, conservan tamaño y centro |
| `brillo` | un halo cálido que respira, 3,2 s — **no mueve nada** | piezas centradas donde no se quiere ni un píxel de movimiento |

Medido con el reloj de la animación en los dos extremos del ciclo: el `palpitar` crece **+13,5 px** de ancho y la **deriva del centro es 0,00 px**; el `brillo` mantiene el centro y el ancho idénticos.

**Por qué el latido del original hacía ver las monedas descentradas**: el marcado trae `loop_0="sX:0.8;sY:0.8"`, o sea que las **encogía un 20 %**. Una pieza que cambia de tamaño un 20 % se lee como «movida», aunque su centro no se mueva. Se sustituyó por el `palpitar`, que solo crece. La decisión se expresa con `anulaBucle` en el archivo de efectos: **el efecto declarado sustituye al bucle del original en vez de sumarse** — dos animaciones sobre el mismo elemento nunca es lo que se quiere.

#### Dos fallos de fondo que aparecieron al hacerlo

1. **La imagen del efecto se elegía adivinando por el nombre del fichero.** El generador aplicaba el efecto solo si la ruta contenía «logo»/«logotipo». Por eso el mapamundi (`org-banner-mundo.png`) y las monedas (`unity-banner-A/B.png`) **no recibían nada**, y eran justo las piezas que el usuario quería animar. Ahora el archivo de decisión **nombra los archivos exactos**.
2. **La diapositiva de Venezuela estaba sin ola por una clave mal escrita.** `efectos.json` decía `bienestarmutuo.org` y el destino real es `bienestarmutuo.org.ve`; con emparejamiento por **host exacto** —que se puso precisamente para que `.org.ve` no se confundiera con `.org`— la clave no coincidía y la diapositiva se quedó fuera. Se añadió la clave correcta, y ahora las cuatro diapositivas del carrusel ondulan (24, 38, 78 y 77 letras) mientras UnityCoin, como se pidió, no ondula.

**Verificado**: ola con `top` de `-0,02px` a `-7,98px` en las cuatro diapositivas, los tres tipos de efecto aplicados a la pieza correcta, **0 solapes** y **0 declaraciones descartadas** en las dos páginas de idioma, y la ola no crea ningún solape nuevo (comprobado midiendo con la onda en su punto más alto).

### Dos fallos de geometría que solo se ven al cambiar el ancho de la ventana

El usuario reportó que en UnityCoin las monedas estaban mal de sitio y que «UNT» aparecía descolocado. La causa no era el gusto: eran **dos fallos de la extracción de geometría**, y el segundo explica por qué el usuario lo veía y yo no.

#### Fallo 1: los desplazamientos de las capas ancladas eran medidas absolutas

Una capa anclada se coloca con `left:50%` y luego se corre un desplazamiento que en la configuración viene **en píxeles del lienzo de diseño** (por ejemplo `-527px`). Yo lo emitía tal cual:

```
transform: translate(calc(-50% + -527px), calc(0px + 186px))
```

Ese `-527px` **no se entera del tamaño del banner**, mientras que todo lo que lo rodea —el `left:50%`, los anchos en `%`, las fuentes en `cqw`— sí escala. A 1166 px de ancho el desajuste es del 6 % y pasa desapercibido; al estrecharse la ventana crece.

**Medido con el banner a 620 px**: el texto «UNT» se colocaba a **−35 % del ancho** (fuera del banner por la izquierda) y los titulares al **133 % de la altura** (por debajo). Cualquiera que mire el sitio en una ventana más estrecha que yo ve esto, y yo no lo veía porque medía siempre a 1440.

Arreglado emitiendo los desplazamientos en **`cqw`** (el 1 % del ancho del contenedor, que es lo que hace que escalen como el resto).

**Trampa dentro del arreglo, cazada por la medición**: `cqw` es una unidad de **ancho**, así que el desplazamiento **vertical** también se divide por el ancho del lienzo, no por el alto. Dividirlo por el alto lo multiplicaba por ~2,7 y mandaba los titulares al **271 % de la altura**. El lienzo conserva su proporción, así que los dos ejes escalan con el ancho.

#### Fallo 2: el anclaje vertical tiene DOS nombres y solo entendía uno

El centrado vertical se declara `vertical: "center"` —la misma palabra que en horizontal— pero mi mapa solo conocía `middle`, que es como lo nombra la otra convención. **Cualquier valor fuera del mapa caía a `'0'` sin avisar**, así que esas capas se quedaban pegadas arriba.

**9 capas de los cuatro sliders** perdían el centrado vertical. Era exactamente lo que le pasaba a las dos monedas de UnityCoin, que aparecían 10,4 % de la altura más arriba de donde van.

Arreglado con una **tabla única** que asocia cada nombre de anclaje con su base y su corrimiento (`center` y `middle`; `left`/`start`, `right`/`end`, `top`, `bottom`). Antes el corrimiento se calculaba con una cadena de comparaciones aparte de la tabla de bases, y las dos listas podían desincronizarse — que es justo lo que había pasado.

**Resultado medido**: las monedas pasan de 41,06 % a **51,66 %** de la altura, contra el **51,50 %** del original. Todas las piezas de esa diapositiva coinciden ahora con el original dentro del **0,8 %**, y las posiciones son **idénticas a 1166 y a 620 px** en las 29 capas de las 5 diapositivas.

#### Cómo se detecta esto (y por qué no se detectaba)

Midiendo **siempre a un solo ancho** el fallo es invisible: a 1440 el error del 6 % se lee como «casi bien». La comprobación que lo caza es **medir la posición relativa de cada capa a dos anchos distintos y comparar los porcentajes**: si una capa no guarda su proporción, ahí está el fallo. Queda como comprobación obligatoria del carrusel.

### `ajustes.json`: las desviaciones del original, declaradas

La petición del usuario («las monedas un poco más a la derecha y el texto UNT alineado con el centro de la primera moneda») es una **desviación deliberada**, así que no se aplica editando la geometría extraída —eso la haría indistinguible de un dato del original— sino en un tercer archivo de decisión, `astro-site/src/sliders/ajustes.json`, con dos operaciones:

- **`desplazamientos`**: suma píxeles del lienzo a una capa, sin cambiar su sistema de anclaje.
- **`alinearCentroXCon`**: centra una capa sobre el centro horizontal de otra. La cuenta se hace en píxeles del lienzo, así que funciona aunque las dos capas usen sistemas distintos (una por píxeles y otra anclada).

Se nombran las capas **por el archivo de su imagen o por su texto**, igual que en `efectos.json`.

**Y una distinción que conviene no perder**: de las tres cosas que pidió el usuario, «un poco más abajo» **no** fue a `ajustes.json`, porque no era un gusto sino el fallo 2 — estaba mal y se corrigió en la extracción. Cuando algo se puede arreglar en la extracción, se arregla ahí; `ajustes.json` es solo para lo que de verdad se aparta del original.

Verificado renderizado: el centro de «UNT» coincide con el de la primera moneda **con diferencia 0,00**, las monedas quedan en 22,82 % y 80,64 % (18 px a la derecha del original), y siguen **0 solapes** y **0 declaraciones descartadas**.





### El contenido de las páginas: qué faltaba de verdad (y qué no)

Con el carrusel cerrado se auditó el contenido de las 14 páginas comparando **texto visible, imágenes y encabezados** contra el HTML capturado del original. La comparación por **tamaño de fichero no sirve**: el HTML del original arrastra ~21 KB de CSS en línea de Elementor/The7 más el JavaScript del page builder, así que medir bytes mide el andamiaje, no lo que se ve. Herramienta: `tools/compare-paginas.cjs`.

**El punto de partida era peor de lo que parecía**: las páginas llevaban entre el **3 % y el 16 % del texto** del original, con 1 encabezado frente a 34. Eran esqueleto, cabecera y pie: el `ContenidoPagina.astro` estaba declarado como esqueleto a propósito, esperando esta fase.

#### La mitad de las rutas casi no tienen contenido, y eso NO es un fallo nuestro

Las páginas de **noticias, artículos y verificar** del original están prácticamente **vacías**: lo que hay es el título, el buscador y el **formulario de suscripción de Mailchimp**. Sus 3,2 k caracteres de texto son la barra de navegación y el desplegable de países del formulario. Se ve al extraer el texto en orden. O sea: no había contenido que reconstruir, y perseguirlo habría sido trabajo inventado.

Las que sí tienen contenido son **la home** (5,4 k caracteres, 23 imágenes, 34 encabezados) y **las presentaciones** (21 k y 22 k caracteres, 57 imágenes, 63 encabezados). Y no usan la misma tecnología que las demás: la home y las presentaciones son **Elementor con widgets de JetElements**; noticias, artículos, verificar y las legales son **Gutenberg**.

#### El camino: un modelo de contenido, no el HTML copiado

`tools/elementor-a-contenido.cjs` convierte el árbol de Elementor en un modelo en JSON (`astro-site/src/contenido/`): secciones en orden, el fondo de cada una y los bloques con sus datos. Copiar el HTML del original habría arrastrado sus clases y sus estilos en línea, dejando dos sistemas de estilo peleándose por el mismo elemento.

**Cobertura medida tras renderizar desde el modelo**

| página | texto antes | texto ahora | encabezados | imágenes |
|---|---|---|---|---|
| home EN/ES | 8 % | **93 %** | 34/34 | faltan 9, del encabezado y el pie |
| presentación EN | 4 % | **99 %** | 60/63 | faltan 15 |
| presentación ES | 4 % | **99 %** | 60/61 | faltan 15 |

Lo que resta en esas dos son casi todas piezas del **encabezado y el pie** (los iconos de idioma `en/fr/es.png` —que se sustituyeron por el selector a petición del usuario—, el logo pequeño, un `dummy.png`) más la miniatura de un vídeo.

#### Cuatro trampas por el camino, todas silenciosas

1. **`jet-slider` no guarda sus elementos en `slides` sino en `item_list`.** Leer `slides` devolvía una lista vacía sin ningún error: las cuatro imágenes del carrusel y sus títulos desaparecían de la página.
2. **`jet-animated-box` tiene CUATRO textos**, no dos: título y descripción por cada cara. Leía `front_side_title` y `back_side_description`, así que se perdían el título del dorso y la descripción del frontal.
3. **37 de los 141 encabezados de la presentación traen etiquetas dentro** (`<br>`), porque el autor partía las frases a propósito. El texto plano para comparar tiene que perderlas —si no, el mismo encabezado parece distinto— y el salto de línea tiene que conservarse, porque pintado como texto las etiquetas **se verían literalmente**.
4. **El nivel del encabezado no es libre**: el original pinta los títulos de los banners y los elementos del JetSlider como **`h5`**. Al pintarlos como `h3` la comparación decía «faltan 18 encabezados» cuando lo que faltaba era la etiqueta, no el texto. Cambiarlo altera la jerarquía que leen buscadores y lectores de pantalla.

**Las páginas legales no se tocan aquí**: su texto se migra mecánicamente por script y **nunca pasa por el chat** ni por estos extractores, porque dispara falsos positivos de filtros de seguridad (error [1301] real). Están pendientes de ese script, no de este camino.

### Los fondos de la home: por qué no se veía ningún efecto

El usuario reportó que los fondos de parallax se veían fijos y que la mayoría de secciones estaban desalineadas. Investigado con `tools/sonda-fondos.js` (compara la posición del elemento y la del fondo a varios desplazamientos, que es la única forma de distinguir un fondo fijo de uno normal o de uno movido por `transform`) y con capturas a la misma altura en los dos sitios.

#### Lo que NO era

- **No era que faltara la técnica.** El original usa `background-attachment: fixed` en 5 secciones de la home y mi versión en 4. Medido, y comprobado además que **ningún antecesor rompe el `fixed`**: un `transform`, `filter` o `will-change` en un contenedor lo degrada a fondo normal, y aquí no había ninguno.
- **No era un parallax por `transform` sin reproducir.** El original sí tiene capas `jet-parallax-section__image` con velocidad al 50 %, pero **medidas no desplazan nada**: se mueven exactamente con la página (`desplazamiento: 1500` sobre 1500 px de scroll) y su `transform` acaba en la matriz identidad. Lo que parecía parallax en una primera lectura era contenido reacomodándose al cargar imágenes.

#### Lo que SÍ era: un velo opaco tapando la imagen

Cada sección lleva en Elementor un **velo** sobre la imagen de fondo. Elementor guarda el color y su **opacidad por separado** (y con la rareza de venir con `unit: "px"` y el valor como fracción, 0,58). Yo leía solo el color y lo pintaba **a plena opacidad**: el fondo con imagen quedaba convertido en un rectángulo de color plano.

**No se veía ninguna imagen de fondo, así que no había nada que ver moverse.** Esa era la causa real de «se ven fijos»: el efecto estaba, pero tapado. Arreglado emitiendo `rgba()` con la opacidad declarada (0,4 a 0,96 según la sección).

#### Y las alturas: cuatro fallos de extracción en el mismo sitio

Las secciones estaban desproporcionadas y eso desalineaba todo lo demás. La sección de `26-bg.jpg` medía 1049 px en el original y **4875** en la mía; la página entera, 8627 contra **17406**.

1. **Las columnas anidadas se aplanaban mal.** Elementor envuelve las columnas reales dentro de una columna exterior cuando la sección tiene una sola. Mi recorrido empujaba cada columna interior como HERMANA de la exterior, así que salían secciones con seis o siete columnas donde las primeras estaban vacías y la última se llevaba todos los widgets. Una rejilla de tarjetas se pintaba como una pila.
2. **El ancho de columna no está en `width`.** Está en `_column_size` (100 entera, 50 media, 33 un tercio) y en `_inline_size` cuando el autor lo afina. Leer `width` devolvía `undefined` siempre, así que todas las columnas quedaban al 100 %.
3. **`gap` no vale para repartir columnas.** Con `flex: 0 0 33%` más un `gap` de 24 px, tres columnas suman 99 % + 48 px y la tercera ya no cabe: seis tarjetas salían de dos en dos. Se usa la técnica de Elementor —rejilla de 100 columnas con el hueco como RELLENO INTERIOR— que es la que hace que los anchos cuadren.
4. **`_margin` y `_padding` de cada widget** siguen sin aplicarse, así que las alturas quedan cerca pero no exactas.

**Resultado medido**: la página pasa de 17406 a **9032 px** (el original 8627), y las secciones a 628/576/374/1622/818/1266/781/950/619/671 frente a 600/519/374/863/…/1049/842/918/748. Lo que más se desvía es la sección del JetSlider, que al pintarse como rejilla ocupa el doble que el carrusel original.

#### Otra cosa que la comparación de capturas dejó clara

Las tarjetas de problemáticas **no se parecen a las mías**. En el original la **imagen es la tarjeta**, el título va **encima** de la imagen y la descripción solo aparece al pasar el ratón sobre el velo azul (`#095287` al 90 %). Yo pintaba una caja de color con la imagen encima y todo el texto siempre visible. Reconstruido desde los ajustes del original: título blanco a 2,2 em con grosor 500 y texto a 1,2 em.

#### Imágenes que faltaban

La auditoría de rutas encontró **9 imágenes referenciadas sin fichero**, incluida una que era el fondo entero de una sección (`26-background.jpg`). Descargadas del original. Ya no falta ninguna de las 119 que referencian las páginas.

#### Un marcador de diagnóstico que se veía

El widget `menu-anchor` de Elementor es solo una marca para la navegación interna y no pinta nada, pero no tenía caso propio: caía en el cajón de «sin mapear», y ese cajón **se pinta a propósito** como una caja de borde discontinuo con el nombre del widget, para que nada desaparezca en silencio. Resultado: una caja con el texto «menu-anchor» en medio de la página de presentación.

Se vio en una captura, no en el build. La marca cumple su función —hacer visible lo que falta— pero conviene recordar que **todo lo que se pinta se ve**, incluidos los diagnósticos. Corregido con su caso propio.

### El JetSlider: un carrusel que se pintaba como rejilla

La sección del JetSlider medía **1622 px** donde el original tiene **863**, y era la que más desviaba las alturas de la home. La causa: se pintaba como rejilla de tarjetas para no dejar el contenido fuera (decisión razonable mientras no hubiera componente), y un carrusel de una fila se convertía en dos filas de tarjetas.

Reutilizar el carrusel de banners no valía: su modelo son **capas con coordenadas**, y el JetSlider es una **imagen con un texto centrado**. Es otro tipo de pieza, así que tiene componente propio (`shared/jet-slider/JetSlider.astro`).

**Todo lo que pinta está medido en el original, nada elegido:**

| qué | valor medido |
|---|---|
| tamaño de la diapositiva | 1026 × 400 px |
| alto por corte | 400 px, 300 en tableta, 280 en móvil (`slider_height`) |
| título | `h5` a **75 px**, peso 600, blanco, centrado |
| descripción | **22,5 px**, blanco, centrada, al 70 % de ancho |
| colocación | contenido centrado en los dos ejes (flex) |
| flechas | **53 × 53**, a 20 px del borde, `#003f7f` y `#ff7100` al pasar el ratón |
| avance | **no avanza solo**: su pista no se mueve al esperar |

La tipografía va en `cqw` para que escale con el carrusel: 75 px sobre 1026 es **el mismo 7,31 %** que 89,5 px sobre 1224, así que el título se ve igual de grande en las dos versiones aunque el contenedor no mida lo mismo.

#### Un velo declarado que el original no pinta

El JetSlider **declara** `overlay_background_color: #6ec1e4` con `overlay_opacity: 0.1`, y mi primera versión lo pintaba. Medido en el original: **no hay ninguna capa de velo** —ni un elemento con fondo, ni un pseudoelemento, ni un filtro sobre la imagen—: el plugin no lo aplica.

Se retiró. La regla que se aplica es la del proyecto: **un ajuste declarado no es una prueba de que se vea**; si la medición dice que no se pinta, no se pinta. Es el mismo criterio que con el `font-weight: 900` del preset, que también estaba declarado y el original no aplicaba.

**Resultado medido**: la sección del JetSlider pasa de **1622 a 837 px** (el original: 863). La página entera queda en **9041** frente a 8627.

### `_margin` y `_padding` de los widgets

Se extraen y se aplican en los bloques simples (encabezado, texto, html, imagen y lista). Son las claves con guion bajo de Elementor y son las que **separan** unas piezas de otras: sin ellas faltaba el aire que el autor puso alrededor de cada encabezado.

Rendimiento limitado: en la home **solo 8 de 41 bloques declaran margen o relleno**, y los que lo declaran suelen ser horizontales (`0% 4% 0% 4%`), así que la altura apenas cambia. Las diferencias que quedan (1188 frente a 1049 en la sección de problemáticas, 1150 frente a 918) vienen del tamaño de las tarjetas, no del espaciado.
