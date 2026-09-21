# Task Plan

> **The north star.** This file is your working memory on disk.
> A SessionStart hook re-injects it into context after every `/clear`,
> resume, and compaction — so the plan survives context loss.
> Keep it accurate. Update `Next Step` and phase `Status` as you go.

## Goal

Migrar todo lo que hoy vive en WordPress y Read the Docs —el sitio `e-nation.org` (16 páginas en 3 idiomas) y la documentación del Pacto Social— a Astro + Tailwind v4 desplegado en Cloudflare Pages, con réplica visual fiel, multi-idioma mantenido por una memoria de traducción que escribe el agente en sesión, y cutover de dominio sin romper el correo (que vive en el mismo servidor que el sitio).

## Next Step

**Esperar la revisión del usuario** de los cinco ajustes de efectos ya desplegados en `web.unitygenerator.com/presentation/`: el brillo del logotipo de SBM Juegos, la ola recuperada en Venezuela, el palpitar del logotipo de SBM Pagos, el de las monedas de UnityCoin y el del mapamundi de Mutual Welfare. Todo verificado en producción: deriva de centro 0,00 px, 0 solapes y 0 declaraciones descartadas en los dos idiomas.

Cuando confirme, seguir con la Fase 6 (contenido real de la home y las presentaciones, parallax, `org-piramid`). Los tres pendientes que salieron al medir el carrusel están anotados en `findings.md`: el slider `snake` trae 1 diapositiva y el original 2, nuestro banner mide 1166 px frente a los 1120 del original, y el original aplica `text-shadow` a las capas de texto.

## Current Phase

Phase 6: Reconstrucción del sitio — `in_progress` (contenido real de la home y las presentaciones)

## Phases

### Phase 1: Andamiaje
- [x] Mover la skill a `.zcode/skills/` y borrar la copia de usuario
- [x] Adaptar `SKILL.md` al layout real y a los aprendizajes nuevos (memoria de traducción, sliders, medición de parallax, docs externas)
- [x] `findings.md` sembrado con todo el recon
- [ ] `README.md` y `AGENTS.md`
- [x] `.gitignore` + `.gitattributes` + `git init` + primer commit (`97fccfd`, sobre la historia del remoto: 178 commits)
- [x] `brand/tokens.css` con la paleta y tipografías medidas
**Status:** complete

### Phase 2: Docs — verificación y contenido
- [x] Verificar qué idiomas de docs resuelven hoy y la **paridad real EN↔ES** → está en sincronía (130 vs 131 encabezados; la única diferencia es el subrayado roto del `20.2.1.`)
- [x] Determinar qué edición es la fuente → **el `.rst` del repo** (mantenido hasta 2024-05-04); los `.md` locales son el borrador de 2018, con 349–496 palabras menos
- [ ] Averiguar qué contienen `/articles/` y `/es/articulos/` y a qué URLs apuntan (van a otro WordPress de otro dominio; **reproducir fielmente, no arreglar**)
- [x] Convertir los `.rst` a Markdown de Starlight con `tools/rst-to-md.cjs`, arreglando el subrayado roto
**Status:** complete (queda pendiente solo lo de `/articles/`, que es del sitio, no de los docs)

### Phase 3: Docs — Starlight, i18n y deploy (ensayo general)
- [x] `astro-docs/` con Starlight: Astro 7.3.2 + Starlight 0.42.0, ES por defecto en la raíz y EN bajo prefijo, Pagefind, `brand/tokens.css` compartido
- [x] Build verificado: 5 páginas, búsqueda indexada, `_redirects` copiado, marca aplicada, hreflang y canonical correctos
- [x] `tools/i18n.cjs` con memoria de traducción, `status` (exit 1 si hay ausentes), `seed`, `build` y `check`; scripts en el `package.json` raíz
- [x] Alineación ES↔EN medida: 130 secciones y 201 unidades, **coinciden al 100%**, y `check` reproduce el inglés con 0 diferencias de contenido
- [x] **Ensayo completo con la forma docs.***: el subdominio `docs.unitygenerator.com` sirve con canonical propio, el apex redirige 301 conservando la ruta, las 4 URLs de RTD aterrizan con 200, Pagefind en es/en/fr, robots.txt en Disallow. El 301 por hostname quedó verificado en ambas direcciones
- [x] Revisión del usuario registrada (`i18n:review fr`), puerta estricta en verde
- [ ] **Cambio al dominio real** cuando el usuario lo decida (ahora es solo cambiar hostnames: lista abajo)
**Status:** complete (a falta del cambio al dominio real, un paso de 10 minutos)

**Los docs están desplegados y verificados en es/en/fr** sobre `docs.unitygenerator.com`, con búsqueda Pagefind indexada en los tres idiomas, hreflang completo y los 301 desde Read the Docs. El 301 por hostname, que faltaba por probar, quedó verificado al añadir el segundo hostname.

#### Lista de cambio al dominio real (los cuatro puntos van juntos)

1. `astro-docs/site.config.mjs` → `SITE`, `PRIMARY_HOST` e `INDEXABLE` (ponerla en `true`).
2. `astro-docs/functions/[[path]].js` → `PRIMARY` (no puede importar el archivo de config: Cloudflare empaqueta las Functions aparte).
3. **`npm run i18n:strict` tiene que pasar**: no se cambia el dominio con traducciones sin revisar.
4. Cloudflare → añadir `docs.e-nation.org` como dominio propio del proyecto de Pages (lo hace el usuario), y entonces quitar el dominio de Read the Docs (también del usuario).

El 301 desde los hostnames del ensayo al real sale solo del punto 2. El orden es crítico: primero el dominio nuevo en Pages (Cloudflare re-apunta el CNAME que hoy va a readthedocs.io), después la config — invertido, el dominio de ensayo empezaría a redirigir a un host que todavía sirve RTD.

### Phase 4: Captura del sitio WordPress
- [x] Extractor PHP ampliado con WPML subido a `/zero/` → `reference/wp-export.json`
- [x] HTML renderizado + CSS inline + CSS de Elementor/The7/JetElements/RevSlider
- [x] JSON de config de los 4 sliders → `reference/sliders/`
- [x] Espejo de `/zero/wp-content/uploads/` (205 imágenes)
- [ ] **Medir** el parallax por elemento (familias fondo-fijo vs transform) → se hará con el contenido de la home
- [ ] Auditoría de imágenes con texto (visión + OCR) y lista para decisión del usuario → `reference/AUDITORIA-IMAGENES.md`
- [x] Capturas de referencia de las 16 URLs
**Status:** complete (la medición del parallax se hará con el contenido real de la home)

### Phase 5: Stack del sitio
- [x] `astro-site/` con Astro 7 + Tailwind v4 + sitemap + aos, `.nvmrc` en 22
- [x] Manifiesto i18n desde los grupos de traducción de WPML
- [x] **Tema claro/oscuro/auto**: tres estados como Starlight, elección persistida y sin destello al cargar (guion en línea en el `<head>`). **La paleta oscura sigue pendiente de aprobación del usuario**
- [x] `npm run build` verificado como puerta de salida
- [x] Header, footer, las 16 rutas y la página 404 construidas y desplegadas
**Status:** complete (queda la aprobación del usuario sobre la paleta oscura)

### Phase 6: Reconstrucción del sitio
- [x] Header y footer
- [x] **Carrusel de banners** (`banner-publicidad`): 5 diapositivas por idioma, huérfanas descartadas, fuentes auto-hospedadas, geometría del marcado resuelto, ola en las letras y flotación. **0 solapes medidos** en las 6 diapositivas y en los dos idiomas
- [ ] Contenido real de la home y de las presentaciones (textos e imágenes)
- [ ] Parallax de la home: medir por elemento (fondo fijo vs transform) antes de reconstruir
- [ ] `org-piramid.png`: reconstruir la superposición
- [ ] Interiores; páginas legales por script
- [ ] `/verify/` inspeccionado antes de prometer nada
- [ ] Pendientes del carrusel, medidos: el slider `snake` trae 1 diapositiva y el original 2; el ancho del banner es 1166 px frente a 1120 del original; el original aplica `text-shadow` a las capas de texto
**Status:** in_progress

### Phase 7: SEO y verificación visual
- [ ] Titles/meta traducidos por idioma; focus keywords de Rank Math verificadas tras el build
- [ ] JSON-LD, `<h1>` en la home, `og:image` 1200x630, `robots.txt` y sitemap reales
- [ ] Bucle captura-contra-captura + judge subagent antes del deploy
**Status:** pending

### Phase 8: Cutover del dominio principal
- [ ] Proyecto Pages (`astro-site`), `functions/[[path]].js`, `_redirects`
- [ ] **Runbook del correo**: restaurar `mail` y `www` como DNS-only a 157.173.108.34; MX/SPF/DMARC intactos
- [ ] Verificación con `curl`/`nslookup` + **email de prueba real** del usuario
**Status:** pending

## Key Questions

- ¿Cuál es la **paridad real EN↔ES** de los docs? Son dos árboles Sphinx mantenidos a mano y el español puede estar desincronizado.
- ¿Qué contienen exactamente `/articles/` y `/es/articulos/` y a qué URLs apuntan? (Se reproducen fielmente; la otra migración es de otro agente.)
- ¿La hipótesis del **parallax de fondo fijo** se confirma al medir, o hay que separar las dos familias?
- ¿Cuántas imágenes tienen texto de verdad? El recon sugiere que buena parte de los "banners" son encabezados H5 reales.
- ¿Se puede reconstruir Slider Revolution con fidelidad desde su config, o hay que activar la escotilla de escape?
- ¿Qué URL exacta protege `/verify/` por dentro?
- ¿El usuario confirma la excepción del **FR legal enlazando al EN**, o prefiere aportar el texto?

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Skill movida al proyecto y **borrada** de scope de usuario | La de usuario tiene precedencia y shadowea la del proyecto: borrarla es lo único que hace que la copia del proyecto se cargue. |
| **Memoria de traducción** en vez de replicar la estructura de WPML | Determinismo: sin caché el mismo texto se re-traduce distinto en cada pasada, el diff se vuelve ruido y la verificación captura-contra-captura pierde sentido. |
| Se conservan URLs, slugs traducidos y hreflang | Es SEO, no bookkeeping: Google indexa URLs y `/es/presentacion/` ya está indexada. |
| **Español** como idioma de autoría; EN y FR generados | Decisión del usuario. El inglés sigue canónico en la raíz. |
| Traducciones **en sesión**, sin API keys | Decisión del usuario. |
| **Docs primero**, como ensayo general | Subdominio de zona propia: prueba el pipeline completo sin tocar el apex ni el correo. |
| Docs a **Astro Starlight** y URLs en `/docs/` con 301 | Volumen de dos documentos; unifica stack, tokens y búsqueda (Pagefind). |
| Monorepo sobre `ElishaBentzi/E-Nation` | El repo ya describe el conjunto, no solo los docs. |
| Propiedades lógicas de CSS desde el inicio | Cuesta lo mismo y habilita RTL para futuros idiomas. |
| Legales: FR enlaza al EN | No se asume el riesgo de traducir automáticamente un texto legal. **Reversible**: si el usuario aporta el francés, se integra. |
| Docs: la fuente es el **`.rst` del repo**, no los `.md` locales | Los `.md` son el borrador de 2018; el `.rst` está mantenido hasta 2024-05-04 y tiene 349–496 palabras más. Medido con `tools/compare-docs-text.cjs`. |
| Docs: **mismo slug en los tres idiomas** | Starlight construye hreflang y sitemap reutilizando el slug por idioma y Astro no soporta slugs traducidos por configuración. En los docs no hay equity que perder: las URLs indexadas eran las `.html` de RTD, que se redirigen con 301. En el **sitio** es al revés y se usará el manifiesto. |
| Docs: locale por defecto declarado como **`root`** | Starlight calcula `prefixDefaultLocale = isMultilingual && locales.root === undefined || …`: sin una entrada `root` prefija también el idioma por defecto y genera hreflang a `/es/…` inexistentes. Verificado en el HTML construido. |
| Docs: **ensayo en `docs.unitygenerator.com`** antes del dominio real | Decisión del usuario. Es un subdominio de otra zona suya en Cloudflare, sin A en el apex y sin correo en uso (`mail.unitygenerator.com` no resuelve), así que probar ahí no arriesga nada. El ensayo reproduce **el mismo tipo de cambio de DNS** que después se hará con el dominio real, que es justo lo que queríamos ensayar. |
| Docs: dominio centralizado en `astro-docs/site.config.mjs` | Aparece en tres sitios (origen canónico, `robots.txt` y la Function del 301). En un archivo único, el cambio al dominio real es un punto y no una cacería; la Function lo duplica porque Cloudflare la empaqueta aparte, y está comentado. |
| Docs: `robots.txt` bloquea el rastreo mientras sea ensayo | El dominio de ensayo no debe competir en buscadores con los docs reales que hoy sirve RTD. Se ata a la constante `INDEXABLE`, así el cambio al dominio real lo desbloquea en el mismo gesto y no se puede olvidar. |
| Docs: **no se toca la prosa ni la ortografía** | Reescribir el texto de su documento fundacional es decisión editorial del autor. La limpieza de tildes (`nación`/`nacion`) y la reparación del inglés quedan como paso explícito, pendiente de su visto bueno. |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| `curl` a `docs.e-nation.org` → **429** | 1 | No confirmado si es anti-bot. Se resuelve migrando a infraestructura propia. |
| `WebFetch` del árbol completo del repo por API de GitHub no devolvió texto | 1 | Se consultó directorio por directorio en lugar del árbol recursivo. |
| ~~`video-3d-structures` desapareció de `~/.zcode/skills/`~~ | 1 | **FALSO POSITIVO, cerrado.** El usuario la movió a otro proyecto con otro agente. **Lección**: el listado de skills del arranque es una foto fija y otros agentes modifican el disco en paralelo; preguntar antes de declarar una desaparición. |
| Mi analizador de RST exigía subrayados de 3+ caracteres y este documento usa `~~` (dos) | 1 | **Corregido.** Hizo invisibles los 10 encabezados de artículo y me llevó a afirmar que al inglés le faltaban los artículos 1–8. Regex a `{1,}`. |
| Afirmé "el español perdió los acentos" desde una muestra de 2 palabras | 1 | **Corregido.** La medición dice lo contrario: el `.rst` tiene 513 acentos frente a 480 del `.md`. Es inconsistencia puntual en ambas ediciones. |
| La comparación de texto contaba encabezados del `.rst` como prosa | 1 | **Corregido.** Ahora se excluyen encabezados y sus subrayados antes de comparar. |
| `customCss` con `../../brand/tokens.css` → módulo no encontrado | 1 | **Corregido.** Las rutas de `customCss` se resuelven desde la **raíz de la app** (`astro-docs/`), no desde el archivo de config: es `../brand/tokens.css`. |
| Starlight generaba hreflang a `/es/pacto-social/` (inexistente) y `/en/pacto-social/` con el slug del español | 1 | **Corregido.** Dos causas: faltaba la entrada `root` en `locales` (Starlight prefijaba el idioma por defecto) y el slug difería entre idiomas (Starlight lo reutiliza). Verificado en el HTML: canonical, hreflang y `x-default` apuntan ahora a rutas que existen. |
| **Corrompí el Markdown inglés**: un `build` con bug sobre el mismo fichero que `check` leía lo reescribió mal (203 → 496 unidades) | 1 | **Corregido.** Restaurado desde el commit `8bd8af3`. Refactorizado en `render` (no escribe) + `build` (escribe) para que `check` compare en memoria, y añadida salvaguarda que impide generar el idioma fuente. **Lección: una herramienta que escribe y verifica sobre la misma ruta se destruye a sí misma cuando falla.** |
| Dos definiciones de `check` en `tools/i18n.cjs` (la destructiva ganaba por hoisting) | 1 | **Corregido.** Queda una sola, verificada con `grep -c`. |
| La meta `description` del inglés quedó en español en la memoria | 0 (pendiente) | **Sin corregir.** El conversor la fija igual para ambos idiomas; hay que sustituir esa entrada de la memoria. |
| **`git push` → 403 `denied to ElishaBentzi`** | 1 | **Resuelto.** No era del repositorio (usuario, público, no archivado) sino del **token sin scope de escritura**. Remoto pasado a **SSH** con clave ed25519 en `C:\Users\Elisha\.ssh\` y `core.sshCommand` fijado en el repo. Verificado: `77a75fb..89a01a0 master -> master`. |
| El `HOME` de este entorno apunta al **perfil del sistema**, no a `C:\Users\Elisha` | 1 | **Corregido.** Me llevó a crear la clave SSH en el sitio equivocado y a que dos comprobaciones miraran en el contexto equivocado. **Regla: en este entorno no usar `~` para nada del usuario; siempre rutas absolutas `C:\Users\Elisha\…`.** |
| Declaré que faltaban los fotogramas de la ola porque no aparecían en `dist/_astro/*.css` | 1 | **Falso negativo.** Los estilos del componente van **en línea en el HTML**; allí estaban desde el principio. **Lección: buscar en el fichero equivocado no prueba una ausencia; comprobar dónde se mira.** |
| La medición en navegador decía «la ola no se mueve» con los fotogramas correctos | 1 | **Era el entorno.** `document.hidden = true` (pestaña en segundo plano) y **Chrome congela ahí las animaciones**. Se mide moviendo el reloj de la animación (`currentTime`) y leyendo el estilo computado: determinista y sin depender del reloj. |
| Las letras del banner salían separadas («P l a y») | 1 | **Corregido.** El aire entre etiquetas en el código (salto de línea y sangría) **es contenido de texto y se pinta**. Etiqueta, letra y cierre en la misma línea; el espacio entre palabras, fuera de las letras. |
| Cuatro capas apiladas en el mismo punto y el logo de la moneda descentrado y cortado | 1 | **Corregido.** `calc(0 + 72px)` **es CSS inválido** (no se suma el número `0` a una longitud dentro de `calc()`), así que el navegador descartaba el `transform` entero y la capa se quedaba en `left:50%;top:0`. Solo afectaba a los anclajes `left`/`top`. Bases con unidad (`0px`). |
| Titulares que envuelven de línea donde el original no lo hace | 2 | **Corregido, dos causas.** (1) `display:inline-block` por letra pierde el kerning y redondea anchos → letras **en línea** con `position:relative` + `top`. (2) El generador ignoraba `customCSS`, donde 39 de 48 capas declaran `white-space:nowrap`. |
| 57 capas con `font-weight:900` donde el original pinta 400 | 1 | **Corregido.** Peso **vacío** en la capa → el generador caía al preset (900), que el original **no aplica** (medido: 400). El preset deja de ser fuente del peso. |
| Comparar cajas de elementos inventaba solapes que no existen | 1 | **Corregido.** Se comparan **líneas** (`Range.getClientRects()`), y con la ola hay que agrupar los rectángulos por fila porque **cada letra es un elemento**. |
| `tab.screenshot()` se colgó con la pestaña trabada | 1 | **Se abrió una pestaña nueva** (remedio ya documentado) y se siguió midiendo con `evaluate`. |

## Notes
- Re-read this plan before major decisions.
- Update phase Status to `complete` when a phase finishes.
- Log ALL errors above — never repeat a failed approach.
- **Aviso crítico permanente**: el MX del dominio apunta al propio apex → el correo vive en el mismo servidor que el sitio. No tocar MX/SPF/DMARC nunca, y el cutover solo con el runbook delante.
- Los tres archivos de memoria se versionan en git a propósito (el usuario los pidió como memoria del proyecto), aunque la skill sugiera ignorarlos.
