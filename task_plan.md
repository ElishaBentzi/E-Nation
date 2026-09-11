# Task Plan

> **The north star.** This file is your working memory on disk.
> A SessionStart hook re-injects it into context after every `/clear`,
> resume, and compaction — so the plan survives context loss.
> Keep it accurate. Update `Next Step` and phase `Status` as you go.

## Goal

Migrar todo lo que hoy vive en WordPress y Read the Docs —el sitio `e-nation.org` (16 páginas en 3 idiomas) y la documentación del Pacto Social— a Astro + Tailwind v4 desplegado en Cloudflare Pages, con réplica visual fiel, multi-idioma mantenido por una memoria de traducción que escribe el agente en sesión, y cutover de dominio sin romper el correo (que vive en el mismo servidor que el sitio).

## Next Step

Terminar la Fase 1 (andamiaje): falta crear `README.md`, `AGENTS.md`, `.gitignore`, `brand/tokens.css` y hacer el `git init` + primer commit. Después arranca la Fase 2 con la verificación de paridad EN↔ES de los docs.

## Current Phase

Phase 1: Andamiaje — `in_progress`

## Phases

### Phase 1: Andamiaje
- [x] Mover la skill a `.zcode/skills/` y borrar la copia de usuario
- [x] Adaptar `SKILL.md` al layout real y a los aprendizajes nuevos (memoria de traducción, sliders, medición de parallax, docs externas)
- [x] `findings.md` sembrado con todo el recon
- [ ] `README.md` y `AGENTS.md`
- [ ] `.gitignore` + `git init` + primer commit
- [ ] `brand/tokens.css` con la paleta y tipografías medidas
**Status:** in_progress

### Phase 2: Docs — verificación y contenido
- [ ] Verificar qué idiomas de docs resuelven hoy y la **paridad real EN↔ES**
- [ ] Averiguar qué contienen `/articles/` y `/es/articulos/` y a qué URLs apuntan (van a otro WordPress de otro dominio; **reproducir fielmente, no arreglar**)
- [ ] Convertir los `.rst` a Markdown usando los `.md` locales como atajo (decodificar entidades HTML)
**Status:** pending

### Phase 3: Docs — Starlight, i18n y deploy (ensayo general)
- [ ] `astro-docs/` con Starlight (ES por defecto, EN/FR bajo prefijo, Pagefind)
- [ ] `tools/` de i18n: memoria de traducción, `i18n-status.mjs` (exit 1 si hay ausentes u obsoletas), generación de locales
- [ ] FR generado desde la memoria; EN sembrado como entrada `original`
- [ ] Deploy a `.pages.dev` → dominio `docs.e-nation.org` → quitar dominio de RTD → verificar TLS y 301
**Status:** pending

### Phase 4: Captura del sitio WordPress
- [ ] Extractor PHP ampliado con WPML subido a `/zero/` → `reference/wp-export.json`
- [ ] Capturas full-page de las 16 URLs a 1440 y 390 px
- [ ] HTML renderizado + CSS inline + CSS de Elementor/The7/JetElements/RevSlider
- [ ] JSON de config de los 4 sliders → `reference/sliders/`
- [ ] **Medir** el parallax por elemento (familias fondo-fijo vs transform)
- [ ] Espejo de `/zero/wp-content/uploads/`
- [ ] Auditoría de imágenes con texto (visión + OCR) y lista para decisión del usuario
**Status:** pending

### Phase 5: Stack del sitio
- [ ] `astro-site/` con Astro 7 + Tailwind v4 + sitemap + aos, `.nvmrc` en 22
- [ ] Manifiesto i18n desde los grupos de traducción de WPML
- [ ] `npm run build` verificado como puerta de salida
**Status:** pending

### Phase 6: Reconstrucción del sitio
- [ ] Header y footer
- [ ] Home (incluye los 3 Slider Revolution + JetSlider)
- [ ] Interiores; páginas legales por script
- [ ] `/verify/` inspeccionado antes de prometer nada
**Status:** pending

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

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| `curl` a `docs.e-nation.org` → **429** | 1 | No confirmado si es anti-bot. Se resuelve migrando a infraestructura propia. |
| `WebFetch` del árbol completo del repo por API de GitHub no devolvió texto | 1 | Se consultó directorio por directorio en lugar del árbol recursivo. |
| **`video-3d-structures` desapareció de `~/.zcode/skills/`** durante la sesión | 1 (verificado) | **SIN RESOLVER.** Verificado: no está en el perfil, ni en caché de plugins, ni en otros proyectos, ni en la Papelera. Mi `rm -rf` apuntaba a un directorio concreto y no puede borrar un hermano; `rm` de Git Bash no usa la Papelera. Hipótesis principal: **cuarentena de Windows Defender** (contenía `.py` y `start_server.cmd`). Acción para el usuario: revisar Seguridad de Windows → Historial de protección. |

## Notes
- Re-read this plan before major decisions.
- Update phase Status to `complete` when a phase finishes.
- Log ALL errors above — never repeat a failed approach.
- **Aviso crítico permanente**: el MX del dominio apunta al propio apex → el correo vive en el mismo servidor que el sitio. No tocar MX/SPF/DMARC nunca, y el cutover solo con el runbook delante.
- Los tres archivos de memoria se versionan en git a propósito (el usuario los pidió como memoria del proyecto), aunque la skill sugiera ignorarlos.
