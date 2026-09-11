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

Pendiente: la **revisión del usuario** de las 208 cadenas del francés, y el cambio al dominio real (lista de cuatro puntos en `task_plan.md`).

### Phase 4: Captura del sitio WordPress
**Status:** pending
**Started:**
Actions taken:
-

Files created/modified:
-

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
| **301 por hostname de la Function** | — | — | **NO VERIFICABLE AÚN**: hace falta un segundo hostname apuntando al proyecto | Pendiente |

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
