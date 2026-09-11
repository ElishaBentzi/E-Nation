---
name: wordpress-to-cloudflare
description: Metodología validada end-to-end para migrar un sitio WordPress (con o sin Elementor/page builders) a Astro + Tailwind v4 desplegado en Cloudflare Pages, con réplica visual fiel al original, multi-idioma con memoria de traducción y cutover de dominio sin romper el correo. Incluye consolidar documentación externa (Read the Docs) en el mismo pipeline y usarla como ensayo del cutover. Usar siempre que el usuario mencione migrar/convertir/rehacer un sitio WordPress, clonar un diseño web existente, pasar un site a estático, apuntar un dominio a Cloudflare Pages, replicar efectos/animaciones de un sitio, o unificar sitio y docs — aunque no lo pida explícitamente.
---

# WordPress → Cloudflare Pages: migración fiel con verificación visual

Flujo probado en producción (Pharmacie Puymirol, WordPress+Elementor → Astro 7 + Tailwind v4 en Cloudflare Pages, con cutover de dominio y correo preservado; y E-Nation, WordPress+The7+Elementor con 3 idiomas y docs en Read the Docs). Principio rector: **nunca inventar diseño ni efectos** — paleta, tipografías y animaciones se extraen del CSS/HTML renderizado real, y cada página se verifica con captura contra captura.

## Fase 0 — Diagnóstico y material local

1. Identifica el sitio original REAL (no el de una iteración anterior). Confirma con el usuario qué dominio es la fuente de verdad.
2. Inventario de lo que ya tienes: JSON de extracción previo, carpeta `uploads/`, capturas, repo Astro existente, docs en otro hosting. Reutiliza el pipeline GitHub→Cloudflare, redirects y SEO ya hechos.
3. **La memoria del proyecto vive en la RAÍZ del proyecto**: `task_plan.md`, `findings.md` y `progress.md` (skill `planning-with-files`). El hook `SessionStart` solo re-inyecta `task_plan.md`, y solo si está en la raíz. NO uses `.zcode/plans/` para esto: la skill lo pedía antes y producía planes que el hook nunca volvía a inyectar. Si quieres un archivo de sesión histórico, `.zcode/plans/` vale como copia, nunca como fuente.
4. **Antes de tocar DNS**, audita: nameservers (`nslookup -type=NS`), registros A, **MX y SPF** (`nslookup -type=MX`, `-type=TXT`), DMARC (`_dmarc`), y qué subdominios usan el sitio y el correo (`mail.*`, `smtp.*`, `webmail.*`, `docs.*`). Este inventario es lo que evita romper el email en el cutover. Comprobar también si el apex está proxied (naranja) o DNS-only (gris): un MX que apunta al apex significa que **el correo vive en el mismo servidor que el sitio**, el peor caso para un cutover.
5. Detecta si WordPress vive en un **subdirectorio** (`/zero/`, `/wp/`, `/blog/`). Si es así, todos los assets salen de `<subdir>/wp-content/...` y el extractor PHP debe subirse a ese subdirectorio; los `_redirects` de uploads parten de esa ruta, no de `/wp-content/`.
6. Identifica **docs externas** del proyecto (Read the Docs, GitBook, wiki) y si su contenido solapa con páginas del sitio. Solapar significa que hoy mantienes el mismo texto en varios sitios.

## Fase 1 — Captura de referencia (la base de todo)

1. Con browser-use, captura **full-page** de cada página del original en desktop 1440px y móvil 390px → `screenshots/reference/original-<slug>-{desktop,mobile}.png`.
2. Descarga el **HTML renderizado** de cada página (DOM post-JS, no el fuente) → `reference/rendered/<slug>.html`. De ahí salen: menús, footer, textos, hrefs, iframes, `<title>`/meta description y los datos SEO de Rank Math/Yoast si el JSON de extracción los tiene (`seo.focus_keyword`, `seo.title`, `seo.description`).
3. Descarga los **CSS de página** de Elementor (`wp-content/uploads/elementor/css/post-*.css`) y extrae los `<style>` inline del HTML renderizado.
4. **Descarga también los CSS de los plugins de efectos** si el original usa page-builder addons (jet-elements, etc.): ahí viven las definiciones de animaciones hover con nombre (p. ej. `jet-effect-sarah` en `jet-banner.css`). Sin ellos no se pueden replicar los efectos con fidelidad.
5. Espeja `wp-content/uploads/` completo si tienes acceso; si no, descarga por demanda.
6. **Extrae la configuración de los sliders de plugins** (Slider Revolution, JetSlider, Elementor slides). Los page builders con licencia guardan su definición de capas como **JSON inline en el HTML renderizado**: posiciones, duraciones, easings, offsets y orden de entrada/salida. Guardarlo en `reference/sliders/` es la materia prima para reconstruir sin el plugin.

### Tokens desde el CSS real (nunca inventar la paleta)

Cuenta frecuencias de colores hex/rgba. El kit global de Elementor define `--e-global-color-*` y `--e-global-typography-*`: esos son los tokens de marca. Anota además: radios (0 = diseño cuadrado), sombras (flat = none), contenedor (`max-width`, típico 1140px), fuentes del `<link>` (Google/Bunny Fonts).

**Cuidado con los falsos positivos**: el CSS de un tema comercial trae su propia paleta por defecto con muchísimas apariciones que NO se usa (en The7, `#1ebbf0` y `#39dfaa` aparecían 337 y 188 veces y no eran la marca). Contrasta la frecuencia contra lo que se ve en las capturas antes de declarar un color como token.

**Extrae los tokens ANTES de construir la primera app** y guárdalos en un archivo compartido (`brand/tokens.css`) que importen todas las apps del proyecto. Si el proyecto tiene sitio + docs, ambos consumen el mismo archivo y ninguno deriva.

### Efectos y animaciones: extraer, no improvisar

Para cada efecto especial del original (parallax, hovers, reveals):

1. Localiza el marcado en el HTML renderizado y la clase del efecto (`jet-effect-<nombre>`, `elementor-animation-*`).
2. Extrae su CSS completo del plugin y replica los valores exactos: duración, easing, desplazamientos, `overflow` (los efectos de línea deslizante **necesitan `overflow:hidden` en el elemento padre**, p. ej. el título).
3. **Parallax: mide, no deduzcas.** Un sitio real suele tener **dos familias conviviendo** (The7/Elementor con fondos parallax + `elementor-motion-effects` con transform). Distinguirlas por el CSS a ojo falla. Lo fiable es un script evaluado en el sitio vivo que reporte **por elemento** los valores computados:
   ```js
   // recorrer el DOM y reportar técnica real por elemento con fondo
   [...document.querySelectorAll('*')].forEach(el => {
     const s = getComputedStyle(el);
     if (s.backgroundImage === 'none') return;
     const t = s.transform;
     record({ sel: el.className, attachment: s.backgroundAttachment,
              size: s.backgroundSize, bg: s.backgroundImage.slice(0, 80),
              transform: t === 'none' ? null : t });
   });
   ```
   Familia **fondo fijo** (`background-attachment: fixed`) → Tailwind `lg:bg-fixed`: la imagen queda clavada al viewport y la sección actúa de ventana. Familia **transform** (desplazamiento por JS a velocidad reducida) **no se percibe como parallax** aunque se mida que "funciona" — el ojo lo lee como estático. Si dudas, observa qué espera el usuario: "el fondo se mueve más lento" (transform) ≠ "el fondo se queda fijo y revela partes distintas" (fixed). En iOS el `fixed` se degrada a estático, igual que en el original: eso es fidelidad, no un bug.
4. Los efectos que dependen del hover necesitan un fallback móvil: en pantallas táctiles muestra el contenido estáticamente (texto visible, línea visible) en vez de oculto.

## Fase 2 — Stack moderno antes del diseño

Actualiza el stack ANTES de tocar diseño y verifica build: Astro 5→7, Tailwind 3→4 vía `@tailwindcss/vite` (el paquete `@astrojs/tailwind` está deprecado), `@astrojs/sitemap` actualizado. En Tailwind v4:

- La config vive en `src/styles/global.css` con `@theme { --color-*, --font-* }`; **borra `tailwind.config.mjs`**.
- `@custom-variant dark (&:where(.dark, .dark *))` para dark-mode por clase.
- Utilidades propias con `@utility` (ej. `container-site`, botón de marca).
- Los estilos base de elementos (`body`, `a`, `h1`) van **dentro de `@layer base`** — sin capa, pisan TODAS las utilidades de Tailwind y verás colores incorrectos sin errores de build. Este bug es invisible hasta que inspeccionas el color computado.
- Si una utilidad negativa no compila (p. ej. `-translate-x-full`), usa el valor arbitrario (`translate-x-[-100%]`) y **verifica la clase en el CSS de `dist/`**, no solo en el HTML.
- **Usa propiedades lógicas desde el primer día** (`ps-`/`pe-`, `ms-`/`me-`, `text-start`/`text-end`) en vez de izquierda/derecha: cuesta lo mismo y el día que se añada árabe o hebreo el layout se voltea solo. Los idiomas no latinos necesitan además su propia tipografía: eso no se hereda.

**Node**: fija la versión. Cloudflare Pages usa Node 22; si tu máquina tiene otra, pon `.nvmrc` con `22` dentro del directorio raíz del proyecto de Pages.

## Fase 3 — Multi-idioma sin replicar la estructura de WPML

WPML modela cada idioma como un post independiente con su grupo de traducción (`trid`). Eso existía porque traducir era caro y había que llevar la cuenta en un panel. **Hoy ya no aplica** — pero hay que separar dos cosas:

**Lo que NO se replica**: la página por idioma como unidad de almacenamiento, el grupo de traducción como principio organizador, y el plugin.

**Lo que SÍ se conserva, porque es SEO y no bookkeeping**:
- **Una URL real y rastreable por idioma.** Google indexa URLs, no contenido. Si el idioma vive solo en datos que se renderizan al vuelo, se pierde el posicionamiento existente.
- **Los slugs traducidos que ya están indexados** (`/es/presentacion/`). Cambiarlos obliga a redirects y arriesga equity a cambio de nada. Lo que gana el modelo nuevo es que no se mantengan a mano.
- **hreflang, `x-default` y el selector de idioma**, generados del manifiesto.

### Arquitectura: fuente + memoria de traducción

Astro **no** soporta slugs traducidos por configuración (no existe `i18n.routing.pathnames`; la receta oficial es un mapa manual). El mapa se **genera desde los grupos de traducción de WPML**, no se escribe a mano: con admin, `icl_get_languages()` + `apply_filters('wpml_object_id', $id, 'page', false, $lang)` dan la relación autoritativa entre páginas de distintos idiomas.

```
<app>/src/content/.../source.*     ← contenido escrito a mano, en el idioma de autoría
src/i18n/tm/<locale>.jsonl         ← memoria de traducción, versionada en git
src/i18n/glossary.json             ← términos fijos y términos que no se traducen
src/i18n/config.ts                 ← locales + mapa de slugs por página
```

**Por qué una memoria y no traducción al vuelo.** Sin caché, cada regeneración produce una redacción **distinta** para el mismo texto: el diff se vuelve ruido, no se puede revisar qué cambió, y la disciplina de verificación captura-contra-captura deja de tener sentido porque el contenido se mueve solo. Con memoria, el mismo texto fuente da siempre la misma traducción: **determinista**, revisable, y solo se paga o se espera por lo nuevo.

**Diseño de la memoria** — cada cadena tiene:
- **Clave estable** = página + ruta dentro de la página (no el texto), para que sobreviva a ediciones.
- **`sourceHash`** del texto fuente: si el fuente no cambió, se reutiliza la traducción idéntica; **si cambió, la entrada queda obsoleta y se detecta sola** — no hay traducciones viejas silenciosas.
- **Procedencia** `original` (venía del sitio, la escribió su autor) / `ia` / `humana`, más `reviewed`. Nada generado se disimula de original y se audita con un `grep`.

**Semilla obligatoria: las traducciones que ya existen** entran como entradas buenas y definitivas (`original`). Una página traducida por el autor del sitio **no se regenera**. Solo se genera lo que falte de verdad.

**Los archivos por idioma se generan en el build** desde la memoria; no se editan a mano, porque la siguiente regeneración los pisaría. Las correcciones se hacen en la memoria (o como override marcado), que es el artefacto que se revisa.

**`tools/i18n-status.mjs`** imprime la matriz página×idioma con el estado de cada cadena (`ausente` / `obsoleta` / `ok` / `sin revisar`) y **devuelve exit 1 si hay ausentes u obsoletas**: así el build no puede publicar una página con texto viejo en otro idioma. Esa matriz es la lista de trabajo y la respuesta a "cómo añadimos un idioma": una línea de config → la matriz marca todo ausente → traducir → listo. Cero componentes, rutas, hreflang o sitemap nuevos.

**Legales y multi-idioma**: una traducción automática de un documento legal es un riesgo que no se asume sin decisión explícita del usuario. Por defecto, los idiomas que no tengan texto legal **enlazan a la versión autoritativa** en lugar de generar una traducción. Si el usuario quiere el idioma completo, la vía limpia es que **él aporte el texto** en un archivo (`content/legal/`) y se integre mecánicamente sin que el texto pase por el chat.

## Fase 4 — Reconstrucción fiel, página a página

1. Orden: header y footer primero, luego home, luego interiores, al final las páginas problemáticas (Fase 6).
2. Extrae el contenido por script (Node): headings/p/li/img en orden DOM, hrefs completos, iframes, `<title>`/meta description. **Valida cada URL extraída**: los extractores truncan URLs largas (IDs de Google Forms son un caso típico) — compara longitudes y prueba que respondan (200) antes de darlas por buenas.
3. Componentes base: `BasePage`, `store.ts` con datos reales del HTML (teléfonos, **fax**, horarios, redes, email). Nunca copies datos de un intento anterior: verifícalos contra el HTML renderizado.
4. Piezas interactivas con detalles que importan:
   - **Carrusel circular**: cambia de slide al clic, contador 1→N→1 y flechas en bucle. Para el wrap infinito usa clones + `transform` y normaliza con **`setTimeout` ajustado a la duración de la transición**, no con `transitionend` (no dispara de forma fiable en pestañas en segundo plano y el flag de animación se queda trabado). Autoplay opcional con pausa en hover/focus y respeto a `prefers-reduced-motion`.
   - **Elementos duplicados desktop/móvil** (iconos, CTA): empareja SIEMPRE los breakpoints simétricamente (`lg:hidden` con `lg:flex`). Un `sm:flex` con `lg:hidden` produce **dos iconos visibles entre 640-1023px**.
5. Los iframes externos (catálogos, vídeos, mapas) se conservan con `loading="lazy"`.
6. Mapea animaciones Elementor → AOS (`data-aos`) como capa aditiva; verifica que los `data-aos-delay` escalonados no ralenticen la percepción.
7. Widgets de terceros con privacidad (Facebook, mapas): carga en **dos clics** (botón "Cargar…" → iframe), y si el navegador bloquea terceros (Brave Shields y similares) el iframe no emite `load`: añade un **fallback temporizado** (5s sin load → panel explicativo + enlace directo).

### Sliders de plugins con licencia (Slider Revolution y similares)

Es la pieza más cara de una migración de este tipo. **No empieces por aquí y no improvises el diseño**: reconstruye a partir de la configuración extraída (Fase 1.6), que trae los valores exactos de cada capa.

- Reconstruye en JS propio alimentado por esos valores: sin licencia, sin jQuery y con bundle ligero.
- Alternativas si la fidelidad no se alcanza: **auto-hospedar el plugin** (arrastra jQuery y assets pesados a un sitio estático, y la licencia hay que renovarla para actualizaciones) o **sustituir por un slider propio** aceptando que las animaciones no serán las mismas.
- **Escotilla de escape honesta**: si parte de las animaciones no son replicables (RevSlider tiene efectos con máscaras y filtros que no se reconstruyen solo con CSS), dilo **con la captura comparativa delante** y presenta las alternativas. Nunca lo degrades por tu cuenta y lo presentes como terminado.

### Imágenes con texto incrustado

El texto rasterizado no se traduce, no se indexa, no se lee con lector de pantalla y se ve borroso en pantallas densas. La solución es **texto real superpuesto** (overlay), pero convertir no es "poner un texto encima":

1. **Audita antes de tocar**: clasifica cada imagen como `tiene texto` / `no tiene texto` / `logo o artwork` usando visión sobre las imágenes espejadas. No asumas que hay muchas: en sitios con page builder, buena parte de los bloques que parecen imágenes son **texto real** (encabezados del builder) y no requieren trabajo.
2. **Recupera la cadena, no la inventes**: si el texto está incrustado y no existe en el HTML ni en los datos del builder, sácalo por **OCR** y contrástalo con lo que sí tengas. Es el principio rector aplicado.
3. **Triaje por imagen** con decisión del usuario caso por caso: `overlay traducible` / `se queda como imagen` / `cortar en dos (fondo + texto)`. Un logotipo o un artwork es imagen y se queda imagen; superponerle texto lo duplicaría. Guarda las decisiones en un archivo, no en la memoria del agente.
4. **La tipografía coincide o no es fiel**: fuente, tamaño, tracking y efectos se copian del original medidos, y se verifican contra la captura.

## Fase 5 — Bucle de verificación visual (captura vs captura)

Por cada página: `npm run build` → `npm run preview` → captura con browser-use a los mismos viewports → compara con la referencia → corrige → repite.

Lecciones duras:

- **Capturas con AOS**: espera ~3s tras load e inyecta `[data-aos]{opacity:1!important;transform:none!important;transition:none!important}` antes de capturar; sin `transition:none` pillas la animación a medias.
- **Modo oscuro del navegador de pruebas**: fuerza el tema claro quitando la clase `dark` antes de comparar contra un original claro.
- **Cola de capturas**: los screenshots se atascan tras un timeout. Patrón fiable: una captura por pestaña (crear → goto → capturar → cerrar). `fullPage:true` da timeout en páginas largas: captura por tramos con `window.scrollTo({top:N,behavior:'instant'})` (el `smooth` del CSS impide el salto exacto).
- **Ante una discrepancia de color, haz zoom a la captura original** (crop con sharp) antes de "corregir": a tamaño reducido un botón azul parece coral. Confía en la medición, no en la impresión.
- **Verifica en producción con mediciones reales**, no solo comprobando que el HTML desplegado contiene el marcador: lee estilos computados (`getComputedStyle`), valores de `transform`, respuestas HTTP. Si el usuario dice "no veo el cambio", mide; y recuérdale **Ctrl+F5** (la caché del navegador explica la mayoría de "no funciona").
- Antes del deploy, pasa un judge subagent con parejas de imágenes re-escaladas (~720px). Excluye páginas sensibles (Fase 6).
- Funciones de animación extra que se piden a menudo: reveal con stagger (IntersectionObserver), hover-lift en tarjetas, zoom sutil en banners, brillo deslizante en botones, botón flotante de llamada en móvil. Todas deben respetar `prefers-reduced-motion`.

## Fase 6 — Páginas legales/sensibles: por script, sin leerlas

Las políticas de privacidad contienen lenguaje que dispara falsos positivos de filtros de seguridad al leerlas o citarlas (error [1301] real). Regla: migrarlas **mecánicamente por script**:

1. Un script Node extrae el contenido del HTML renderizado, sanea atributos (solo href/src/alt/colspan/rowspan), elimina tags de layout (**todos**, apertura y cierre, o el build fallará con "closing tag has no matching opening tag"), descarga sus imágenes y escribe el `.astro` final.
2. El script reporta solo métricas (bytes, nodos, imágenes). El texto legal nunca pasa por el chat ni por subagentes.
3. Verificación: build + métricas + captura de marco (banner/header/footer).

Plantilla lista: `scripts/build-legal-page.cjs` (adaptar rutas y slug; `ROOT = __dirname/..` asume que el script vive en `<proyecto>/tools/` y el sitio en `<proyecto>/astro-site/`).

En proyectos multi-idioma, además: si falta el texto legal en un idioma, **enlaza a la versión autoritativa en vez de traducirlo automáticamente** (ver Fase 3).

## Fase 7 — SEO: igualar y luego superar al original

1. **Punto de partida obligatorio**: los `<title>` y meta descriptions del HTML renderizado. Luego compara las **focus keywords** del JSON de extracción (Rank Math: `seo.focus_keyword`) con el contenido propio y asegura que cada término aparezca de forma natural en su página. Verifica programáticamente que todas las keywords están presentes tras el build.
2. **Traduce también los metadatos**: es habitual encontrar la home de un idioma secundario con el `<title>` en el idioma principal (defecto real y frecuente). Cada idioma lleva su título y su meta description.
3. JSON-LD: el tipo correcto (`Pharmacy`, `Restaurant`, `Organization`…) con `sameAs`, `faxNumber`, `logo`, `foundingDate`, `openingHoursSpecification`, `geo`; `WebSite`; `BreadcrumbList` por página. Valida que TODOS los bloques parsean tras el build.
4. **Busca los huecos básicos del original**: es común que falten `<h1>` en la home, `og:image`, `robots.txt` (404) y sitemaps en las rutas estándar. Son victorias fáciles y verificables.
5. **Rich results**: añade secciones FAQ visibles + schema `FAQPage` (respuestas derivadas del contenido real de la página, nunca inventadas).
6. **og:image a 1200x630** generada del original con sharp (una foto cuadrada de 450px se ve recortada al compartir).
7. Sitemap con `@astrojs/sitemap`, `robots.txt` apuntando al dominio final, breadcrumbs `sr-only` si el original no los muestra visualmente.
8. El día del cutover: canónicos, `site` de astro.config, `siteUrl` del store, sitemap y robots deben apuntar al **dominio principal** (el que Google ya indexa; normalmente el que el WordPress original canóniza).

## Fase 8 — Consolidar docs externas (Read the Docs) en el mismo pipeline

Si el proyecto tiene documentación en un servicio externo, consolidarla es casi siempre rentable **si el volumen es pequeño** — mide primero: cuántos documentos, cuántos idiomas, cuántas imágenes. Un repo de docs con dos documentos y dos índices es una tarde; con 200 páginas, no lo toques.

**Señales de que hay que consolidar**: el servicio externo devuelve 429 o limita a tus propios visitantes; mete publicidad, analítica o marca propia (y quitarlo es de pago); el contenido está duplicado con páginas del sitio; o los idiomas se mantienen como **árboles de build independientes en paralelo** (p. ej. `docs/en/` y `docs/es/` con sendos `conf.py`), lo que obliga a editar dos veces y garantiza que se desincronicen.

**Lo que se pierde y con qué se reemplaza** (comprobado antes de decidir):
- Búsqueda del servicio → **Pagefind**, índice estático generado en el build: sin backend, sin terceros, sin analítica. Es una mejora, no un downgrade.
- PDF/EPUB → comprueba si están activos en la config del proyecto (en Sphinx, `formats: pdf/epub` en `.readthedocs.yaml`): es frecuente que estén **comentados y sin enlace de descarga**, en cuyo caso no hay nada que reemplazar.
- Versionado (`/latest/`) → normalmente innecesario si el documento no se versiona. Mover a rutas limpias con **301 desde las URLs indexadas**.
- El build del servicio → el build de Cloudflare Pages que ya vas a montar.

**Migración a Starlight** cuando el volumen es pequeño: mismo stack que el sitio, mismos tokens de marca, misma memoria de traducción, Pagefind incluido, y un solo deploy. Los docs dejan de parecer otro sitio web. Con Starlight, el idioma por defecto vive en la raíz del proyecto de docs y el resto bajo prefijo, y la búsqueda viene incluida.

**Runbook del dominio de docs** (es un cambio de bajo riesgo y sirve de ensayo, ver Fase 9): desplegar primero a la URL `.pages.dev` y verificar → añadir el dominio propio en Pages → **quitar el dominio propio del proyecto del servicio viejo** (si no, los dos sirven y el certificado puede quedar partido) → verificar TLS, los 301 desde las rutas viejas y que la búsqueda indexa → decidir qué pasa con las URLs del dominio del proveedor (`*.readthedocs.io`): comprobar si están indexadas antes de borrar el proyecto, porque borrarlo pierde lo que tengan.

**Cierre**: si el contenido de los docs solapa con una página del sitio, deja **una sola copia canónica** que alimente ambas. Y actualiza los enlaces del sitio viejo que apuntan a las URLs antiguas de los docs.

## Fase 9 — Deploy y cutover de dominio (runbook)

### 9.1 Deploy inicial (dominio de prueba)
- Commit → push a GitHub → auto-build CF Pages (framework Astro, build `npm run build`, output `dist`, Node 22).
- **Output `static`, SIN adapter `@astrojs/cloudflare`**.
- `_redirects` para rutas (301s de URLs antiguas + typos del original + `<subdir>/wp-content/uploads/*` → `/images/:splat`). Nunca añadas reglas de trailing slash.

### 9.2 Redirects por dominio
`_redirects` de Cloudflare **solo acepta rutas, no hosts**. Para redirigir `www` → apex y dominios secundarios → principal hace falta una **Pages Function**: `functions/[[path]].js` que compare `url.hostname` y devuelva `Response.redirect(target, 301)` para todo host distinto del principal. (Se despliega con el repo; no requiere config extra.)

### 9.3 Cutover DNS (el paso delicado)
Requisito: los nameservers del dominio ya están en Cloudflare (si no, mover la zona primero).

1. **Ensaya primero en un subdominio** (típicamente `docs.subdominio`): mismo pipeline completo, sin apex ni correo de por medio. Cuando llegues al apex, ya habrás probado build → Pages → dominio propio → TLS → redirects de punta a punta, y el paso irreversible deja de ser el primero.
2. En CF Pages → proyecto → **Custom domains**: añadir apex, `www` y los dominios secundarios. El asistente detecta el DNS en la cuenta y propone los CNAME; aceptar.
3. Al reemplazar el **registro A del apex** (que apunta al hosting viejo), aceptar el conflicto: en ese momento el WordPress antiguo deja de servirse y Pages toma el relevo.
4. **⚠️ El correo**: si `mail.*` era un CNAME/alias del dominio raíz, al cambiar el A quedará apuntando a Cloudflare (que no reenvía SMTP) y **el email se cae**. Tras el cutover, restaurar en CADA zona: registro **A `mail` → IP del servidor de correo, proxy DNS-only (nube gris)**. Revisar también `smtp`/`imap`/`pop`/`webmail` si existen. Los MX y SPF no se tocan. Si el MX apunta al propio apex, el correo vive en ese servidor: el riesgo es máximo y el runbook no es opcional.
5. Verificar post-cutover con curl: apex 200 con canonical correcto; dominios secundarios y `www.*` → 301 al principal; `nslookup mail.*` resuelve a la IP de correo; MX/SPF intactos. Pedir al usuario un email de prueba real.
6. Sugerir el cutover en hora de bajo tráfico, con acceso al panel del hosting viejo por si hay que revertir (restaurar el A).

### 9.4 Cierre
Quitar el dominio de prueba del proyecto, revocar cualquier token de GitHub usado para pushes, y avisar de que los cambios de CNAME/DNS pueden tardar minutos.

## Gotchas (validados en producción)

- `<script>` sin atributos: Astro los procesa como módulos. NO añadas `client:load`/`is:inline` a scripts con `import`.
- `npm run deploy` no existe en Pages (eso es Workers). Solo build + push.
- Valida `package.json` tras ediciones: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"`.
- Script PHP de extracción (si hay acceso admin al WP): en la raíz del WP (o del subdirectorio donde viva), guarda `wp-export.json` con páginas, SEO Rank Math, Elementor data e inventario de imágenes. Amplíalo con `icl_get_languages()` + `apply_filters('wpml_object_id', ...)` para exportar los grupos de traducción si el sitio usa WPML. Sin acceso: REST API `/wp-json/wp/v2/pages` (acepta `?lang=xx`) o scraping del HTML renderizado.
- Optimiza imágenes con sharp (paquete local en `tools/`) manteniendo dimensiones fieles.
- **El usuario percibe sutil ≠ funciona**: un efecto medido al 12% de intensidad es correcto en tests y "no se ve" en la vida real. Calibra para que se perciba, y ofrece el parámetro de ajuste (más/menos intensidad).
- Cuando el usuario reporta "no funciona / no veo el cambio": verifica en producción con medición real, y descarta caché (Ctrl+F5) antes de tocar código.
