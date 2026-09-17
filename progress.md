# Progress

> **Chronological session log.** Append as you work: what you did, what files
> you touched, test results, errors. This is your "what have I done?" memory.

## Session: 2026-09-11

### Phase 1: Andamiaje
**Status:** in_progress
**Started:** 2026-09-11
Actions taken:
- Recon completo del sitio `e-nation.org`, de su DNS/correo y de los docs en Read the Docs (3 agentes Explore en paralelo, más consultas a la API de GitHub). Todo volcado en `findings.md`.
- Identificada la implementación de referencia de este mismo pipeline al lado del proyecto (`pharmacie_puymirol_migration/`), con las plantillas validadas de `astro.config.mjs`, `functions/[[path]].js`, `_redirects` y el extractor PHP.
- Creada la skill dentro del proyecto: `.zcode/skills/wordpress-to-cloudflare/` con `SKILL.md` (adaptada y ampliada) y `scripts/build-legal-page.cjs` (copiado con **hash SHA-256 idéntico** al original: `e010e50b…`).
- **Borrada** la copia de usuario `~/.zcode/skills/wordpress-to-cloudflare/` tras verificar que la del proyecto estaba completa.
- `findings.md` y `task_plan.md` escritos y sembrados con el recon y las decisiones.
- Corregida una hipótesis propia errónea: `/articles/` y `/es/articulos/` **no** contienen el Pacto Social duplicado, sino que enlazan a otro WordPress en otro dominio (otra migración, otro agente, más adelante). El Pacto tiene una sola casa canónica: los docs.
- La `SKILL.md` adaptada resuelve el conflicto de memoria que arrastraba la skill (mandaba los planes a `.zcode/plans/`, donde el hook nunca los reencontraba) y añade cuatro bloques nuevos: memoria de traducción multi-idioma, reconstrucción de sliders de plugins con licencia, medición del parallax en vez de deducirlo, y consolidación de docs externas con su runbook de dominio.

Files created/modified:
- `.zcode/skills/wordpress-to-cloudflare/SKILL.md` (creado, adaptado — 28 KB)
- `.zcode/skills/wordpress-to-cloudflare/scripts/build-legal-page.cjs` (creado, copia idéntica)
- `findings.md`, `task_plan.md`, `progress.md` (creados)
- `~/.zcode/skills/wordpress-to-cloudflare/` (**eliminado**)

Pendiente de esta fase: `README.md`, `AGENTS.md`, `.gitignore`, `git init` + primer commit, `brand/tokens.css`.

### Phase 2: Docs — verificación y contenido
**Status:** complete
**Started:** 2026-09-11
Actions taken:
- Comparados los `.rst` del repo (ya en local tras el fetch) contra los `.md` de la raíz con `tools/analyze-docs.cjs` y `tools/compare-docs-text.cjs`.
- **Resuelto cuál edición manda**: los `.rst` son la mantenida (22 commits EN / 25 ES hasta 2024-05-04, con contenido que el `.md` no tiene: eliminación de impuestos, ciudadanía a no-humanos, decisión colectiva). Los `.md` son el borrador de abril de 2018, con 349–496 palabras menos. **El atajo de usar los `.md` no procede.**
- **Paridad EN↔ES: en sincronía** (130 vs 131 encabezados). La única diferencia es el subrayado RST roto del `20.2.1.` en inglés, que hacía que ese apartado no se renderizara como encabezado. Único caso en los dos ficheros.
- Escrito `tools/rst-to-md.cjs` con el mapeo de niveles RST→h2…h6 documentado, el subrayado roto normalizado y las entidades decodificadas. Genera las 4 páginas (documento + índice por idioma).
- Verificado que el `20.2.1.` es encabezado en el HTML construido del inglés.
- **Decidido no tocar la prosa ni la ortografía**: son decisión editorial del autor, no de la migración.

Files created/modified:
- `tools/analyze-docs.cjs`, `tools/compare-docs-text.cjs`, `tools/rst-to-md.cjs` (creados)
- `astro-docs/src/content/docs/{pacto-social.md,index.md}` y `en/{pacto-social.md,index.md}` (generados)

### Phase 3: Docs — Starlight, i18n y deploy (ensayo general)
**Status:** in_progress
**Started:** 2026-09-11
Actions taken:
- `astro-docs/` montado con **Astro 7.3.2 + Starlight 0.42.0 + @astrojs/sitemap 3.7.4** (versiones resueltas por npm, no fijadas a ojo). `output: 'static'`, sin adapter.
- `brand/tokens.css` compartido con el sitio vía `customCss`, y `src/styles/docs.css` mapeando la paleta medida a las variables de Starlight.
- **Build verificado**: 5 páginas, Pagefind indexando, `_redirects` copiado a `dist`, naranja `#ff7100` presente en el CSS, 130 encabezados de contenido en el Pacto ES (el 131 es el "En esta página" de Starlight).
- **Arreglado un bug de hreflang que habría roto el SEO**: Starlight generaba alternos a `/es/pacto-social/` (inexistente) por faltar la entrada `root` en `locales`, y reutilizaba el slug del español para el inglés. Verificado en el HTML: canonical, hreflang y `x-default` apuntan ya a rutas que existen.

Files created/modified:
- `astro-docs/{package.json,astro.config.mjs,.nvmrc,src/content.config.ts,src/styles/docs.css,public/_redirects,public/e-nation300x300.png}`

Segunda parte de la fase — herramienta de i18n:
- Medido con `tools/i18n-align-check.cjs` que **ES y EN alinean al 100%**: 130 secciones, 201 unidades de cuerpo, y las 130 secciones con el mismo número de unidades. Eso hace viable emparejar por posición y que el inglés viva en la memoria como traducción `original`.
- Escrito `tools/i18n.cjs` con cuatro comandos: `status` (matriz página×idioma, exit 1 si falta algo), `seed` (empareja ES↔EN y siembra la memoria), `build <locale>` (genera el Markdown del idioma desde la memoria) y `check` (compara el contenido generado contra el fichero existente **sin escribir**).
- Claves **content-addressed**: `sha1(sección + tipo + texto fuente)`. Hace estructuralmente imposible que haya traducciones viejas silenciosas: si el español cambia, la clave cambia y la unidad aparece como ausente. No hace falta un estado "obsoleta" aparte — simplificación sobre lo que decía el plan, misma garantía.
- Los encabezados que son solo numeración (`2.1.`, `6.5.1.2.1.`) no se traducen: son iguales en todos los idiomas.
- **Verificado**: `check` reporta 203 unidades en disco, 203 generadas y **0 con texto distinto** → el pipeline reproduce el inglés unidad por unidad. `status` da EN 203/203 OK y FR 203 ausentes, con exit 1.
- Scripts atados en el `package.json` raíz (`i18n:status`, `i18n:seed`, `i18n:build`, `i18n:check`, `docs:*`).

Tercera parte de la fase — el francés y los tres idiomas:
- Traducido el Pacto Social al francés: **203 unidades del documento + 5 del landing**, escritas como prosa y no como entradas de JSONL. `i18n:import` las alineó **a la primera**: 130 secciones, 197 unidades y 41 items coincidiendo exactamente con el español.
- El francés es el único idioma generado: el español es la fuente y el inglés entró en la memoria como traducción `original` del autor, que no se regenera.
- Declarado `fr` en la config. **7 páginas construidas** y desplegadas: las 6 rutas en es/en/fr con su `lang`, hreflang de los tres más `x-default`, y Pagefind indexando los tres idiomas.
- `i18n:strict` añadido para la puerta de revisión: el modo normal solo falla si falta texto (publicar en el dominio de ensayo para revisar en contexto es legítimo); el estricto falla además si queda algo sin revisar, y es el que debe pasar antes del cambio al dominio real.

**Tres fallos que aparecieron al añadir el landing, los tres arreglados:**
1. Los enlaces RST del landing salían **sin convertir** (`English <http://...>`_`) porque `landing()` no pasaba el texto por `inline()`. Se veían como texto literal con backticks en la web ya desplegada.
2. Los dos idiomas compartían la meta `description`, así que el inglés tenía la descripción en español — justo lo que Google muestra en los resultados.
3. La **clave de las unidades no incluía la página**, así que el landing y el Pacto colisionaban en las mismas secciones; y además `importar` **reemplazaba** la memoria entera, de modo que importar el landing habría borrado las 203 entradas del Pacto. Ahora la clave lleva el slug y la importación **mezcla**.

También se quitó del landing la lista de idiomas que apuntaba a readthedocs: es navegación y no contenido, Starlight ya trae su selector (que además lleva a la misma página en el otro idioma, no solo al inicio), y mantenerla obligaba a incrustar URLs dentro de texto traducible.

Cuarta parte de la fase — el ensayo con la forma docs.*:
- El usuario añadió `docs.unitygenerator.com` como dominio propio **adrede** (no typo): quiere ensayar la forma `docs.*` que tendrá el destino final.
- El principal del ensayo pasó del apex al subdominio. **El patrón completo quedó verificado en producción**:
  - `docs.unitygenerator.com` sirve con canonical sobre sí mismo;
  - el apex `unitygenerator.com` redirige 301 conservando la ruta (ejerciendo la rama de redirección por host de la Function);
  - las 4 URLs reales de Read the Docs aterrizan con 200 en las páginas correctas;
  - Pagefind indexa es/en/fr; `robots.txt` sigue en Disallow; TLS lo cubre el wildcard de la zona.
- Con esto, el cambio al dominio real queda reducido a **cambiar las cadenas del hostname**: mismo mecanismo ya probado en las dos direcciones.

**El ensayo está cerrado.** Lo único pendiente del lado de los docs es ejecutar el cambio a `docs.e-nation.org` cuando el usuario lo decida, y luego quitar el dominio de Read the Docs.

### Phase 4: Captura del sitio WordPress
**Status:** in_progress
**Started:** 2026-09-11
Actions taken:
- Escrito `tools/wp-extract.php` (563 líneas) para que **el usuario lo suba** a `/zero/`. Exporta contenido de todos los idiomas, datos de Elementor, SEO de Rank Math, menús, medios, grupos de traducción de WPML, el kit global y la config de Slider Revolution. **No imprime el contenido**: en pantalla solo métricas, y el JSON se descarga con `?download=1`, para que el texto legal nunca pase por el chat ni por un registro.
- Añadido `tools/validate-php.mjs` con `php-parser`, porque escribimos PHP que corre en el servidor pero la máquina local no tiene PHP: **sintaxis validada, 563 líneas OK**. Sin esto, un error se descubre subiendo el archivo y viendo un 500.
- Escrito `tools/capture-reference.cjs` y capturado: **16 HTML renderizados**, sus estilos inline (14-18 bloques cada uno) y **47 CSS en su ruta original** (2,27 MB, 0 fallos). Índice en `reference/INDEX.md`.
- Escrito `tools/extract-tokens.cjs` y medidos los tokens: `reference/TOKENS.md`.
- Escrito `tools/measure-browser.js`: el snippet que se inyecta en el navegador para resolver **a la vez** el color computado y la técnica real del parallax, que son las dos preguntas que el CSS no puede responder.

**Hallazgos de la captura** (detalle en `findings.md`):
- **Solo 4 páginas usan Elementor**; las otras 12 son planas del tema. Y las grandes son las **presentaciones** (~245 KB de CSS de Elementor cada una), no la home (76 KB).
- **`#1ebbf0` es ambiguo, no un falso positivo**: aparece 402 veces en el CSS *propio* del sitio (el que WordPress genera desde las opciones del tema) y estiliza `.elementor-button`, mientras el CSS que pinta la home usa `#ff7100` 94 veces y no lo menciona. **Se corrige mi afirmación anterior** y queda pendiente de medir en el navegador.
- Confirmado como falso positivo seguro: la paleta por defecto de Elementor (`#6EC1E4`, `#61CE70`), que aparece en las variables del kit.
- Top de color del CSS propio: `#ffffff` 560, `#1ebbf0` 402, `#ff7100` 314, `#39dfaa` 215, **`#052743` 127** (navy no detectado antes), `#234965` 54.

Files created/modified:
- `tools/wp-extract.php`, `tools/validate-php.mjs`, `tools/capture-reference.cjs`, `tools/extract-tokens.cjs`, `tools/measure-browser.js`, `tools/package.json` (con `php-parser`)
- `reference/rendered/*.html` y `*.inline.css` (16 de cada), `reference/css/**` (47 archivos), `reference/INDEX.md`, `reference/TOKENS.md` — todo ignorado por git
- `.gitignore` (se ignora `reference/` entero, no solo `uploads/`)

**El export llegó y se procesó.** El usuario subió `wp-extract.php` a `/zero/` y dejó `wp-export.json` (2,26 MB) en el proyecto.

- **Urgente y resuelto**: el archivo estaba en la **raíz** del proyecto y git **no lo ignoraba** — con la política de privacidad dentro y el repositorio público, habría acabado en GitHub. Movido a `reference/wp-export.json` (que sí está ignorado) y añadida al analizador una comprobación que avisa si vuelve a aparecer en la raíz.
- Escritos `tools/analyze-export.cjs` (informa **estructura y métricas**, nunca el cuerpo de las páginas), `tools/extract-assets.cjs` (separa sliders, datos de Elementor por página y el manifiesto i18n) y `tools/compare-nav.cjs`.
- Extraídos `reference/sliders/*.json` (los 4 sliders con sus capas y params: `banner-publicidad` 21 slides/1,95 MB, `e-nation`, `vertical-horizontal`, `snake`), `reference/elementor/*.json` (4 páginas + el kit) y `reference/manifest.json` (los 7 grupos de traducción).

**Resultados que cambian el plan** (detalle en `findings.md`):
- **La paleta del kit de Elementor es la de FÁBRICA** (`#6EC1E4`, `#54595F`, `#7A7A7A`, `#61CE70`): el autor nunca personalizó los colores globales. Confirma que el kit no es la marca y que los colores reales están en el CSS de cada página.
- **Solo 4 páginas usan Elementor**; las otras 12 están prácticamente vacías (`articles` 85 B, `news` 75 B, `verify` 118 B): son páginas de enlace.
- **El parallax es fondo fijo, confirmado**: 112 efectos, todos de tipo fondo; **54 declaran `background-attachment: fixed`**; cero animaciones de entrada y **cero `motion_fx_scrolling`**. Los 63 `elementor-motion-effects` del HTML eran contenedores vacíos, no efectos activos: la familia "transform" que yo esperaba **no existe**.
- **Inventario de widgets: 544**, dominado por `heading` (306) e `image` (114) = 77 %.
- **SEO pobre**: solo 4 focus keywords de 16 páginas. Y los títulos SEO revelan una **marca alternativa**: "Mutual Welfare / Bienestar Mutuo · Por una Sociedad Altruista", que convive con `E-Nation` y con `Real Direct Democracy`. Hay que preguntar cuál manda.
- **Corregida otra hipótesis mía**: el export decía que los 3 menús apuntaban a URLs inglesas, pero el HTML renderizado muestra que el menú ES sí apunta a `/es/…`. `wp_get_nav_menu_items()` no traduce; **WPML traduce al renderizar**, así que la fuente de verdad para la navegación es el HTML.
- **Defecto encontrado**: el selector de idioma enlaza a `/fr/`, que redirige a la home inglesa. La opción francesa del original no funciona.

Pendiente de la fase: el barrido del navegador sobre el sitio vivo (capturas 1440/390 + color computado + confirmación del parallax) y la auditoría de imágenes con texto.

### Phase 5: Stack del sitio
**Status:** pending
**Started:**
Actions taken:
-

Files created/modified:
-

### Phase 6: Reconstrucción del sitio
**Status:** pending
**Started:**
Actions taken:
-

Files created/modified:
-

### Phase 7: SEO y verificación visual
**Status:** pending
**Started:**
Actions taken:
-

Files created/modified:
-

### Phase 8: Cutover del dominio principal
**Status:** pending
**Started:**
Actions taken:
-

Files created/modified:
-

## Test Results
<!-- Update especially during Phase 4. Be honest — failures included. -->
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Integridad de la copia de la skill | `sha256sum` de ambos `build-legal-page.cjs` | Hashes iguales | `e010e50b9519321ebf16b74d690332fd34b2cac2fd1320afba8bceb87094808a` en ambos | OK |
| Skill de usuario eliminada | `ls ~/.zcode/skills` | Solo `planning-with-files` | Solo `planning-with-files` | OK |
| Skill del proyecto presente | `find .zcode/skills -type f` | 2 archivos | `SKILL.md` + `scripts/build-legal-page.cjs` | OK |
| Existencia de `video-3d-structures` | `find` por todo el perfil | Encontrada | No existe: la movió el usuario con otro agente | Falso positivo, cerrado |
| Estructura de los docs EN↔ES | `tools/analyze-docs.cjs` | Paridad | 130 vs 131 encabezados; la diferencia es el subrayado roto del `20.2.1.` | OK |
| Subrayados RST rotos | `tools/analyze-docs.cjs` | 0 | 1 caso en EN (arreglado); ES limpio | Aviso |
| ¿Los `.md` sirven de fuente? | `tools/compare-docs-text.cjs` | Mismo contenido | 136/150 párrafos y 4.534/4.883 palabras: **son ediciones distintas** | Fallo de hipótesis |
| Conversión RST→Markdown | `tools/rst-to-md.cjs` | 0 subrayados sueltos | 0; 130 encabezados; el `20.2.1.` ya es encabezado | OK |
| Alineación ES↔EN de unidades | `tools/i18n-align-check.cjs` | Coinciden | 130 secciones, 201 unidades, **las 130 secciones con el mismo número** | OK |
| `check`: el pipeline reproduce el EN | `i18n:check` | 0 diferencias | 203 y 5 unidades, 0 con texto distinto | OK |
| Red de seguridad del importador | quitar un párrafo y `i18n:import` | Aborta | `seccion 2: 7 unidades en la fuente contra 6` + exit 1 | OK |
| Refactor de `import` sin cambio de comportamiento | re-sembrar EN | Memoria idéntica | **Byte a byte idéntica** | OK |
| **Francés: alineación** | `i18n:import fr` | Alinea | 130 secciones, 197 unidades, 41 items **idénticos al español**, a la primera | OK |
| Francés generado | `i18n:build fr` | Ambos ficheros | 203/203 y 5/5 unidades; 130 encabezados; 122 de numeración preservados | OK |
| Build limpio como lo hace Cloudflare | `npm ci && npm run build` | 7 páginas | 7 páginas, `dist/` completo | OK |
| **Desplegado en los tres idiomas** | `curl` a las 6 rutas | 200 con `lang` correcto | `/`,`/pacto-social/` es · `/en/…` en · `/fr/…` fr | OK |
| Pagefind con tres idiomas | `pagefind-entry.json` | es, en, fr | es 2, en 2, fr 2 páginas | OK (tras descartar caché) |
| hreflang completo | HTML del francés | 4 alternos | es, en, fr, x-default | OK |
| Selector de idioma | markup del francés | 3 opciones | Espanol / English / Francais con la página correspondiente | OK |
| Los 301 de Read the Docs | 4 URLs antiguas | 301 correcto | Correctos | OK |
| TLS del dominio de ensayo | `openssl s_client` | Válido | `CN=unitygenerator.com`, Google Trust Services, hasta 2026-12-10 | OK |
| `robots.txt` de ensayo | `curl` | Disallow | Disallow, intacto tras los despliegues | OK |
| **301 por hostname de la Function** | `curl` a `docs.unitygenerator.com` (segundo hostname apuntando al proyecto) | 301 a `unitygenerator.com` conservando la ruta | `/` y `/pacto-social/` → 301 a las rutas equivalentes del apex | **OK — verificado por fin** |
| **Ensayo con principal en docs.***: el subdominio sirve y el apex redirige | `curl` a las 4 rutas de cada host | Subdominio 200 con canonical propio; apex 301 conservando ruta | Exacto en las 4 rutas probadas (`/`, `/pacto-social/`, `/en/pacto-social/`, `/fr/pacto-social/`) | OK |
| Las 4 URLs reales de RTD sobre el nuevo principal | `curl -L` (siguiendo el 301) | 200 en el destino | Las 4 con destino final 200 | OK |
| TLS del subdominio añadido | `openssl s_client` a `docs.unitygenerator.com` | Certificado válido | `CN=unitygenerator.com` con SAN `DNS:*.unitygenerator.com` (el wildcard de la zona cubre el subdominio) | OK |

## Error Log
<!-- More detailed than task_plan.md's error table. Timestamped. -->
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-09-11 ~15:52 | `curl` a `https://docs.e-nation.org/en/latest/` → HTTP 429 | 1 | No se insiste. No confirmado si es anti-bot de RTD o límite real; se resuelve con la migración a infraestructura propia, que ya está decidida. |
| 2026-09-11 ~15:55 | `WebFetch` del árbol recursivo del repo por API de GitHub no devolvió texto | 1 | Se cambió de estrategia: consultas directorio por directorio (`contents/`, `contents/docs`, `contents/docs/en`) y `raw.githubusercontent.com` para archivos sueltos. Funcionó. |
| 2026-09-11 15:57 | ~~`video-3d-structures` desapareció de `~/.zcode/skills/`~~ | 1 | **FALSO POSITIVO — cerrado.** El usuario confirma que la movió él mismo a otro proyecto usando otro agente de programación. No hubo pérdida ni cuarentena de Defender. **Lección**: el listado de skills del arranque de sesión es una foto fija y otros agentes modifican el disco a la vez; di por perdido un archivo sin considerar esa posibilidad, y encima apunté a Defender como causa. Antes de declarar una desaparición, preguntar si alguien más está tocando el árbol. |
| 2026-09-11 ~16:05 | Mi analizador de RST usaba `\1{2,}` (3+ caracteres) y este documento subraya los artículos con `~~` | 1 | **Corregido** a `{1,}`. Hizo invisibles 10 encabezados y me llevó a afirmar por error que al inglés le faltaban los artículos 1–8. |
| 2026-09-11 ~16:06 | Afirmé "el español perdió los acentos en toda la edición del `.rst`" desde una muestra de dos palabras | 1 | **Corregido.** La medición dice lo contrario: el `.rst` tiene 513 caracteres acentuados frente a 480 del `.md`. Lección: no afirmar sobre un corpus desde una muestra. |
| 2026-09-11 ~16:07 | La comparación de texto contaba los encabezados del `.rst` como prosa (en el `.rst` el título es una línea normal marcada por el subrayado siguiente) | 1 | **Corregido**: se excluyen encabezados y subrayados antes de comparar. Inflaba el recuento del `.rst`. |
| 2026-09-11 16:11 | `astro build` → `Could not resolve '../../brand/tokens.css'` | 1 | **Corregido.** `customCss` resuelve desde la raíz de la app (`astro-docs/`), no desde el fichero de config: es `../brand/tokens.css`. |
| 2026-09-11 16:12 | Starlight generaba `hreflang` a `/es/pacto-social/` (no existe) y a `/en/pacto-social/` usando el slug del español | 1 | **Corregido.** Dos causas independientes: (1) falta la entrada `root` en `locales` — Starlight calcula `prefixDefaultLocale = isMultilingual && locales.root === undefined \|\| …` y prefija también el idioma por defecto; (2) el slug difería por idioma y Starlight lo reutiliza para los alternos. Verificado en el HTML construido. |
| 2026-09-11 16:14 | **Corrompí `astro-docs/src/content/docs/en/pacto-social.md`**: un `build` con un bug (partía los encabezados en dos líneas) escribió sobre el mismo fichero que `check` leía. El fichero pasó de 203 a 496 unidades | 1 | **Corregido.** Restaurado con `git checkout HEAD -- <fichero>` (estaba en el commit `8bd8af3`). Arreglado el `parse` para que el prefijo del encabezado (`## `) y su texto sean **un solo bloque**, y refactorizado `build` en `render` (devuelve la cadena, no escribe) + `build` (escribe): así `check` compara en memoria sin tocar el fichero. Añadida una salvaguarda que impide generar el idioma fuente. **Lección**: una herramienta que escribe y verifica sobre la misma ruta se destruye a sí misma cuando falla. |
| 2026-09-11 16:15 | Dos definiciones de `check` en `tools/i18n.cjs` (la vieja destructiva quedaba última y ganaba por hoisting) | 1 | **Corregido.** Verificado que queda 1 sola definición con `grep -c "^function check"`. |
| 2026-09-11 16:15 | La meta `description` del inglés quedó en español (el conversor la fija igual para los dos idiomas) y así entró en la memoria | 0 (pendiente) | **Sin corregir.** Hay que sustituir esa entrada de la memoria; anotado en `task_plan.md` y en el `code-comment` del conversor. |
| 2026-09-11 16:46 | **`git push` → 403 `Permission to ElishaBentzi/E-Nation.git denied to ElishaBentzi`** | 1 | **Resuelto.** No era un problema del repositorio: `ElishaBentzi` es una cuenta de usuario (no organización), el repo es público y no está archivado ni deshabilitado. El 403 venía del **token con el que se autenticó**, sin scope de escritura (típico de un fine-grained que no incluye el repo, o un clásico sin `repo`). Se resolvió pasando el remoto a **SSH**: clave ed25519 generada en `C:\Users\Elisha\.ssh\`, registrada como Authentication Key en GitHub, remoto a `git@github.com:…` y `core.sshCommand` fijado en el repo. Verificado: autentica como `ElishaBentzi` y `77a75fb..89a01a0 master -> master`. |
| 2026-09-11 18:17 | El landing generaba los enlaces RST **sin convertir** y se veían como texto literal en la web desplegada | 1 | **Corregido.** `landing()` no pasaba el cuerpo por `inline()`. Ahora sí, y además se quita la lista de idiomas (ver abajo). |
| 2026-09-11 18:17 | Los dos idiomas compartían la meta `description`: el inglés tenía la descripción en español | 1 | **Corregido.** La descripción pasa a ser un campo por idioma en el conversor. Es lo que Google muestra en los resultados, así que no es cosmético. |
| 2026-09-11 18:17 | **La clave de las unidades no incluía la página** y `importar` reemplazaba la memoria entera | 1 | **Corregido.** Sin el slug en la clave, el landing y el Pacto colisionaban en las mismas secciones; y como `importar` reemplazaba, importar el landing habría **borrado las 203 entradas del Pacto sin avisar**. Ahora la clave lleva el slug y la importación mezcla sobre lo existente. Las memorias se regeneraron (las claves cambiaron) y se re-sembró y re-importó todo. |
| 2026-09-11 18:19 | Pagefind parecía no haber indexado el francés (`en` y `es` solamente) | 1 | **Falso positivo: era caché.** El `pagefind-entry.json` desplegado con cache-busting sí trae `es, en, fr`, y `wasm.fr.pagefind` responde 200. El nombre del fichero es fijo, así que me sirvió una copia vieja. Medido antes de "arreglarlo", que es exactamente la lección de la skill. |
| 2026-09-11 ~16:50 | Probé una URL de RTD inválida (`/es/latest/Social-Pact-Constitution-English.html`, documento inglés bajo prefijo es) y su 301 cayó en la regla comodín a una ruta inexistente | 1 | **Era mi URL de test, no un fallo del despliegue.** Al probar las 4 URLs reales de RTD con `curl -L`, todas aterrizan con 200. Lección de nuevo: verificar con datos reales del original antes de declarar un bug. |
| 2026-09-11 ~18:40 | `capture-reference.cjs` creaba rutas inexistentes: `nombreArchivo()` dejaba las barras del path en el nombre del archivo | 1 | **Corregido.** Ahora se **replica la estructura de directorios original** bajo `reference/css/`, que además es más navegable y evita colisiones entre archivos homónimos de carpetas distintas. |
| 2026-09-11 ~18:40 | El CSS de Mailchimp (`/embedcode/classic-10_7.css`) da **404 en su ruta original**: solo existe dentro de la caché de WP Rocket | 1 | **Corregido.** Se guarda también la URL absoluta que enlaza el HTML y, si la ruta original falla, se reintenta contra la cacheada. 1 de los 47 CSS se obtuvo así. |
| 2026-09-11 ~18:45 | **`grep -c` cuenta LÍNEAS, no apariciones**, y los CSS son de una sola línea: reportaba `1` aparición de `#ff7100` cuando había 94 | 1 | **Corregido.** Uso `grep -o … \| wc -l` en shell y `matchAll` en código. **Este error me llevó a una conclusión falsa sobre la paleta antes de detectarlo**, y es la razón por la que casi descarto `#1ebbf0` sin medirlo. |
| 2026-09-11 ~18:50 | **Carácter cirílico en mi propio script**: escribí `'fabricа'` con `а` cirílica, creando una familia fantasma que se tragaba el CSS de `wp-includes` y desaparecía de los totales | 1 | **Corregido.** Familia renombrada a `core` y lista de familias centralizada en la constante `FAMILIAS`, para que no pueda volver a desincronizarse. Detectado con `cat -A`, que revela los bytes altos. |
| 2026-09-11 ~18:35 | Afirmé que `#1ebbf0` y `#39dfaa` eran "paleta por defecto de The7, no la marca" | 1 | **Corregido en `findings.md` y en `TOKENS.md`.** La medición dice que `#1ebbf0` aparece 402 veces en el CSS **propio** del sitio y estiliza `.elementor-button`. No se puede resolver leyendo CSS: queda como **candidato sin confirmar** hasta medir el color computado en el navegador. |
| 2026-09-11 16:46 | **El `HOME` de este entorno apunta al perfil del sistema** (`/c/WINDOWS/system32/config/systemprofile`), no a `C:\Users\Elisha` | 1 | **Corregido.** Me llevó a crear la clave SSH en el sitio equivocado y a que dos comprobaciones previas (`ls ~/.ssh` y `cmdkey /list`) miraran en el contexto equivocado. Clave regenerada en `C:\Users\Elisha\.ssh\` y la mal ubicada eliminada. **Regla para el futuro en este entorno: no usar `~` para nada del usuario, siempre rutas absolutas `C:\Users\Elisha\…`.** |
| 2026-09-11 15:37 | 404 en `e-nation.pages.dev` y en el dominio de ensayo; **leí un 200 en `/robots.txt` como prueba de que había despliegue** | 1 | **Corregido.** Ese `robots.txt` era el de Cloudflare por defecto (su política de señales de contenido para crawlers de IA), no el nuestro. `/index.html` y `/404.html` daban 404: **no había despliegue**. La causa real: el `Root directory` del proyecto de Pages se quedó vacío, así que el build corría en la raíz del monorepo, donde el `package.json` no tiene script `build`. El usuario lo corrigió a `astro-docs` y desplegó. **Lección: un 200 aislado en `/robots.txt` no prueba que tu sitio esté arriba; comprobar siempre una ruta real.** |

## 5-Question Reboot Check
<!-- Answer these after any /clear or compaction to re-orient quickly. -->
| Question | Answer |
|----------|--------|
| Where am I? | Fase 3 (docs: Starlight, i18n y deploy) en progreso. Fases 1 y 2 completas. Los docs ya se construyen con contenido real ES+EN y SEO correcto; falta la memoria de traducción, el francés y el deploy. |
| Where am I going? | Herramienta de i18n + FR → deploy del ensayo a `docs.e-nation.org` y quitar el dominio de RTD → después fases 4-7 (sitio) → 8 (cutover del apex con runbook de correo). |
| What's the goal? | Mover el sitio `e-nation.org` (16 páginas, 3 idiomas) y los docs del Pacto Social a Astro + Cloudflare Pages, con réplica fiel, memoria de traducción con el español como idioma fuente, y cutover sin romper el correo. |
| What have I learned? | En `findings.md`: el WP vive en `/zero/`; el MX apunta al propio apex (el correo vive en el servidor del sitio); los docs son **dos documentos** y **dos ediciones distintas** del mismo Pacto — manda el `.rst` mantenido, no el `.md` de 2018; EN y ES están en sincronía; el único defecto estructural es el subrayado roto del `20.2.1.`; la paleta real es `#ff7100` + `#095287`/`#003f7f` y `#1ebbf0`/`#39dfaa` son un falso positivo del tema. |
| What have I done? | En este archivo, arriba: recon completo; skill movida y borrada de usuario; cuatro archivos de memoria; commit `97fccfd` sobre la historia del remoto; comparación de las dos ediciones del Pacto; `tools/rst-to-md.cjs`; `astro-docs` con Starlight construyendo 5 páginas con Pagefind y hreflang correcto; y `tools/i18n.cjs` con el pipeline de traducción verificado. Sin incidentes abiertos: el de `video-3d-structures` era un falso positivo. |

### Medición en el navegador (cierre de la Fase 4, primera parte)
**Status:** in_progress

- Medido el sitio EN VIVO con el navegador: la paleta queda **resuelta** y el parallax **confirmado**.
- **`#1ebbf0` NO se ve**: el botón de Elementor tiene `background: #003f7f` (azul de marca) y `border-color: #1ebbf0` pero **`border-width: 0px`**. Y no aparece en ningún texto computado. Las 402 apariciones en el CSS son reales pero sin efecto visible. **La conclusión del recon inicial era correcta: lo afirmé sin medirlo, lo puse en duda al ver el conteo, y la medición lo confirma.**
- **Paleta de texto real**: `#ffffff` (36), **`#003f7f` (7, el más usado)**, `#333333` (6), y **`#6ec1e4`/`#54595f` (6 elementos con la paleta por defecto de Elementor, que SÍ se ve)**. `#ff7100` solo en 1.
- **Parallax confirmado como fondo fijo**: `background-attachment: fixed`, `background-size: cover`, **`transform: null`**. Cero `data-prlx` y cero `motion_fx`. La familia transform no existe.
- **Los 54 fondos fijos están en las presentaciones** (49 cada una, 23 fijos), no en la home (7, 4 fijos). Reordena las prioridades.
- **La home no tiene `<h1>`**: confirmado en vivo, `h1Count: 0`.
- Capturada la home EN a 1440 en **9 tramos**. Método validado, incluido el reintento por tramo: sin él, un fallo transitorio de screenshot pierde el tramo en silencio.
- **`fullPage` funciona aquí pero no sirve**: con fondo fijo, la captura de página completa deforma el parallax. Los tramos son obligatorios en las presentaciones.

Pendiente: las capturas restantes (15 páginas × 2 viewports) y la auditoría de imágenes con texto.

### Capturas de referencia: COMPLETAS
**Status:** complete

**16 páginas × 2 viewports = 297 PNG, 146 MB, sin huecos.** Viewports fijos: 1440×900 (escritorio) y 390×844 (móvil), para que la comparación con la reconstrucción sea justa.

| página | desktop | mobile |
|---|---|---|
| home-en | 11 | 13 |
| presentation-en | **42** | **41** |
| home-es | 11 | 13 |
| presentacion-es | **42** | **42** |
| privacy-policy-en / privacidad-es | 6 / 6 | 10 / 11 |
| terms-en / terminos-es | 3 / 3 | 5 / 6 |
| articles-en, news-en, verify-en | 2 cada una | 2 cada una |
| articulos-es, noticias-es, verificar-es | 2 cada una | 2 cada una |
| articles-fr, nouvelles-fr | 2 cada una | 2 cada una |

Las presentaciones necesitan 42 tramos cada una porque miden **37.005 px** de alto.

**Cuatro trampas del proceso, todas registradas:**
1. **Todas las páginas tienen al menos un fondo fijo** (el banner del tema), así que `fullPage` **no vale en ninguna**: deformaría el parallax. Lo comprobé página por página ANTES de capturar, en vez de asumirlo, y eso corrigió mi plan (iba a usar `fullPage` en las "planas").
2. **Si los screenshots fallan de forma persistente, el *guest* de la vista se ha trabado.** Pasó con `articles-fr` y con `noticias-es`: ambos fallaban los 3 intentos de todos sus tramos. **Abrir pestaña nueva lo resuelve**, y es lo único que funcionó (reintentar en la misma no sirve).
3. **La captura es reanudable**: salta los tramos que ya están en disco, así que un corte por tiempo no pierde nada y basta con volver a llamar. Sin esto habría perdido trabajo en cada timeout.
4. **Los lotes grandes agotan el presupuesto**: 16 tramos por llamada funcionan en páginas ligeras pero no en las de 37.000 px, donde hay que bajar a 10.
5. **Llamar a `setViewportSize` cuando el viewport ya coincide agota sus 30 s.** Hay que comprobar antes si difiere.
6. Las **primeras capturas de la home eran inválidas** (las hice antes de añadir el recorrido que fuerza la carga diferida de fondos): las rehice. Ese recorrido es obligatorio o los tramos bajos salen sin sus fondos.

**Hallazgo adicional de la inspección**: **8 de 16 páginas no tienen ni un `<h1>`** — la home EN y ES, `articles`, `news`, las dos de artículos/noticias en español y las dos francesas. Solo `verify`, `privacy-policy`, `terms` y sus equivalentes ES lo tienen. Es un defecto SEO más amplio de lo que decía el recon.

### Medios descargados
**Status:** complete

**112 ficheros únicos, 5,1 MB, 0 fallos**, en `reference/uploads/` replicando la estructura del original.

**Un defecto del marcado del original que salió al hacerlo**: de las 90 referencias del export, **31 no eran URLs sino `srcset` completos** (`a.png 226w, https://.../b.png 66w, …`), porque la expresión del extractor PHP no cortaba en las comas. **Un srcset no es basura: son las variantes responsivas que generó WordPress**, así que se parsean en vez de descartarlas. Al expandirlas aparecieron **53 ficheros más** que con las URLs simples: 59 → **112**.

Reparto: `2018/08` 69, `2018/09` 21, `2018/10` 17, `2019/10` 3, `2020/12` 1, `elementor/thumbs` 1. Por extensión: png 84, jpg 25, gif 3.

Pendiente de la fase: la **auditoría de imágenes con texto** (visión + OCR) sobre estos 112 ficheros, con la lista para que el usuario decida caso por caso.

### Auditoría de imágenes: COMPLETA — y cierra la Fase 4
**Status:** complete

- Escrito `tools/audit-images.cjs`, que reduce los 171 ficheros a las **118 imágenes únicas**, lee sus dimensiones reales **sin dependencias** (cabeceras PNG/JPEG/GIF a mano) y determina el **papel** de cada una: **59 son fondos de sección** (decorativas por diseño, descartadas sin mirarlas) y **54 de contenido**.
- Las 54 de contenido revisadas por **tres revisores en paralelo**: **19 tienen texto**, pero solo **4 son candidatas reales a conversión**. 11 son logotipos de medios de prensa (no se tocan: marcas de terceros) y 4 tienen texto incidental de la propia fotografía. Detalle en `reference/REVISION-VISUAL.md`.
- **La intuición del usuario era correcta**: la gran mayoría de imágenes no tiene texto.

**Un defecto propio que salió aquí, y era grave**: los **59 fondos de parallax NO estaban descargados**. La causa es fina: **Elementor guarda las URLs en su JSON con las barras escapadas** (`https:\/\/…`), así que cualquier expresión que busque `https://` en los datos crudos no las ve. Mi extractor PHP tenía ese fallo, y los fondos —justo el efecto principal del sitio— nunca entraron en el inventario de medios. Se corrigió añadiendo el **CSS generado** como fuente, que sí tiene las URLs normales: **112 → 171 ficheros, 9,2 MB**.

### Fase 5: Stack del sitio — COMPLETA
**Status:** complete

- `astro-site/` con **Astro 7.3.3 + Tailwind 4.3.3 + @astrojs/sitemap + aos**, `.nvmrc` en 22. `output: 'static'`, **sin adapter de Cloudflare**. Sin `tailwind.config.mjs`: la config vive en `src/styles/global.css` con `@theme`, y todo lo base va dentro de `@layer base`.
- **Manifiesto i18n generado** de los grupos de traducción de WPML con `tools/build-site-i18n.cjs` → `astro-site/src/i18n/config.ts`. No se escribe a mano.
- **16 páginas con las URLs exactas del original**: 7 en la raíz, 7 bajo `/es/` con slugs traducidos, 2 francesas. El inglés es el predeterminado del SITIO; en la documentación es el español, porque son decisiones distintas.
- **Tema claro/oscuro/auto verificado midiendo**: los tres estados cambian el fondo, persisten, marcan el botón, y **al recargar no hay destello** porque el guion va en línea en el `<head>` antes del primer pintado.
- Cuatro rutas que escalan a cualquier número de idiomas: `index`, `[...slug]`, `[locale]/index`, `[locale]/[...slug]`.

**Tres fallos por el camino, dos silenciosos:**
1. **El CSS no se aplicaba en absoluto** y el build pasaba igual (Astro no exige importar la hoja). Las páginas salían sin estilos. Detectado midiendo el HTML construido, no el log.
2. **Un test mío dio falso positivo**: `grep … | head -1 && echo "presente"` imprimía «presente» aunque el grep no encontrara nada, porque `head` siempre devuelve 0. De ahí concluí que el CSS estaba bien cuando no existía.
3. Los ids con guion (`privacy-policy`) no son claves válidas sin comillas en TypeScript; el build lo cazó y el generador ahora las entrecomilla.
