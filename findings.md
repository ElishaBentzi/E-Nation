# Findings

> **External memory / knowledge base.** Put discoveries, research, and
> technical decisions here so they survive context resets.
>
> **2-Action Rule:** after every 2 view/browser/search operations, save the
> key findings to this file IMMEDIATELY. Visual content (screenshots, images,
> PDFs, browser captures) does NOT persist in context — capture it as text
> here right away.

## Requirements

Lo que pidió el usuario, en orden de llegada:

1. Usar la skill `wordpress-to-cloudflare` y **mudarla dentro de este proyecto** (no dejarla en scope de usuario).
2. Migrar el sitio **e-nation.org** (WordPress) a Astro + Cloudflare Pages.
3. Crear en la raíz `README.md`, `AGENTS.md` y los tres archivos de `planning-with-files` (memoria del proyecto).
4. Multi-idioma: **no replicar la estructura de WPML** (la página por idioma como unidad). En su lugar, **caché/memoria de traducción** de lo ya traducido, o traducir a los tres idiomas en cada publicación. **Las imágenes con texto deben ser texto superpuesto traducible.**
5. Consolidar los docs de **Read the Docs** dentro de la infraestructura propia.
6. Confirmado por el usuario: el **español es el idioma de autoría**; las traducciones **las hace el agente en sesión** (sin API keys); las imágenes con texto se **auditan y se deciden caso por caso**.
7. Confirmado: **docs primero** como ensayo general; **Starlight**; URLs en `/docs/` con 301.

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
