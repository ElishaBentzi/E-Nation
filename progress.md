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

Pendiente: herramienta de i18n con memoria de traducción, generar el francés, y el deploy del ensayo.

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
| Skill del proyecto presente | `find .zcode/skills -type f` | 2 archivos | `SKILL.md` (28.140 B) + `scripts/build-legal-page.cjs` (6.092 B) | OK |
| Existencia de `video-3d-structures` | `find ~/.zcode` y todo el perfil | Encontrada | **No existe en ninguna parte** | **FALLO** |
| Estructura de los docs EN↔ES | `tools/analyze-docs.cjs` | Paridad | 130 vs 131 encabezados; la diferencia es el subrayado roto del `20.2.1.` | OK |
| Subrayados RST rotos | `tools/analyze-docs.cjs` | 0 | 1 caso: EN línea 437. ES limpio | Aviso |
| ¿Los `.md` sirven de fuente? | `tools/compare-docs-text.cjs` | Mismo contenido | 136/150 párrafos y 4.534/4.883 palabras: **son ediciones distintas** | **Fallo de hipótesis** |
| Conversión RST→Markdown | `tools/rst-to-md.cjs` | 0 subrayados sueltos | 0 en los 4 ficheros; 130 encabezados | OK |
| Build de Starlight | `npm run build` en `astro-docs` | 5 páginas | 5 páginas, Pagefind indexa, `_redirects` en `dist` | OK |
| Marca aplicada al CSS | `grep ff7100 dist/_astro/*.css` | Presente | Presente | OK |
| Encabezados renderizados (ES) | `grep -c '<h[2-6]'` | 130 + ToC | 130 de contenido + 1 "En esta página" de Starlight | OK |
| `20.2.1.` como encabezado en EN | `grep '<h5.*20\.2\.1\.'` | Presente | `<h5 id="2021">20.2.1.` | OK |
| hreflang y canonical | HTML construido | Rutas existentes | `/pacto-social/` y `/en/pacto-social/`, las dos existen | OK tras corregir |
| Sitemap | `dist/sitemap-0.xml` | 4 URLs válidas | Las 4 existen como rutas construidas | OK |

## Error Log
<!-- More detailed than task_plan.md's error table. Timestamped. -->
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-09-11 ~15:52 | `curl` a `https://docs.e-nation.org/en/latest/` → HTTP 429 | 1 | No se insiste. No confirmado si es anti-bot de RTD o límite real; se resuelve con la migración a infraestructura propia, que ya está decidida. |
| 2026-09-11 ~15:55 | `WebFetch` del árbol recursivo del repo por API de GitHub no devolvió texto | 1 | Se cambió de estrategia: consultas directorio por directorio (`contents/`, `contents/docs`, `contents/docs/en`) y `raw.githubusercontent.com` para archivos sueltos. Funcionó. |
| 2026-09-11 15:57 | **`video-3d-structures` desapareció de `~/.zcode/skills/`** | 1 | **SIN RESOLVER.** Estaba presente a las ~15:50 (recon de esta misma sesión) y ya no estaba a las 15:57, tras ejecutar `rm -rf "C:\Users\Elisha\.zcode\skills\wordpress-to-cloudflare"`. Verificado que mi comando apuntaba a un único directorio y no puede borrar un hermano, y que `rm` de Git Bash no usa la Papelera. Búsqueda infructuosa en todo el perfil, caché de plugins, otros proyectos y la Papelera; sus archivos distintivos (`pieces.example.json`, `compare_renders.py`, `vision_analysis.py`) no existen. Hipótesis principal: **cuarentena de Windows Defender** (la skill tenía scripts `.py` y `start_server.cmd`/`stop_server.cmd`). **Acción del usuario**: revisar Seguridad de Windows → Historial de protección y restaurarla; si vino de un marketplace, reinstalar. |
| 2026-09-11 ~16:05 | Mi analizador de RST usaba `\1{2,}` (3+ caracteres) y este documento subraya los artículos con `~~` | 1 | **Corregido** a `{1,}`. Hizo invisibles 10 encabezados y me llevó a afirmar por error que al inglés le faltaban los artículos 1–8. |
| 2026-09-11 ~16:06 | Afirmé "el español perdió los acentos en toda la edición del `.rst`" desde una muestra de dos palabras | 1 | **Corregido.** La medición dice lo contrario: el `.rst` tiene 513 caracteres acentuados frente a 480 del `.md`. Lección: no afirmar sobre un corpus desde una muestra. |
| 2026-09-11 ~16:07 | La comparación de texto contaba los encabezados del `.rst` como prosa (en el `.rst` el título es una línea normal marcada por el subrayado siguiente) | 1 | **Corregido**: se excluyen encabezados y subrayados antes de comparar. Inflaba el recuento del `.rst`. |
| 2026-09-11 16:11 | `astro build` → `Could not resolve '../../brand/tokens.css'` | 1 | **Corregido.** `customCss` resuelve desde la raíz de la app (`astro-docs/`), no desde el fichero de config: es `../brand/tokens.css`. |
| 2026-09-11 16:12 | Starlight generaba `hreflang` a `/es/pacto-social/` (no existe) y a `/en/pacto-social/` usando el slug del español | 1 | **Corregido.** Dos causas independientes: (1) falta la entrada `root` en `locales` — Starlight calcula `prefixDefaultLocale = isMultilingual && locales.root === undefined \|\| …` y prefija también el idioma por defecto; (2) el slug difería por idioma y Starlight lo reutiliza para los alternos. Verificado en el HTML construido. |

## 5-Question Reboot Check
<!-- Answer these after any /clear or compaction to re-orient quickly. -->
| Question | Answer |
|----------|--------|
| Where am I? | Fase 3 (docs: Starlight, i18n y deploy) en progreso. Fases 1 y 2 completas. Los docs ya se construyen con contenido real ES+EN y SEO correcto; falta la memoria de traducción, el francés y el deploy. |
| Where am I going? | Herramienta de i18n + FR → deploy del ensayo a `docs.e-nation.org` y quitar el dominio de RTD → después fases 4-7 (sitio) → 8 (cutover del apex con runbook de correo). |
| What's the goal? | Mover el sitio `e-nation.org` (16 páginas, 3 idiomas) y los docs del Pacto Social a Astro + Cloudflare Pages, con réplica fiel, memoria de traducción con el español como idioma fuente, y cutover sin romper el correo. |
| What have I learned? | En `findings.md`: el WP vive en `/zero/`; el MX apunta al propio apex (el correo vive en el servidor del sitio); los docs son **dos documentos** y **dos ediciones distintas** del mismo Pacto — manda el `.rst` mantenido, no el `.md` de 2018; EN y ES están en sincronía; el único defecto estructural es el subrayado roto del `20.2.1.`; la paleta real es `#ff7100` + `#095287`/`#003f7f` y `#1ebbf0`/`#39dfaa` son un falso positivo del tema. |
| What have I done? | En este archivo, arriba: recon completo; skill movida y borrada de usuario; cuatro archivos de memoria; commit `97fccfd` sobre la historia del remoto; comparación de las dos ediciones del Pacto; `tools/rst-to-md.cjs`; `astro-docs` con Starlight construyendo 5 páginas con Pagefind y hreflang correcto. Un incidente de pérdida de archivos registrado sin resolver. |
