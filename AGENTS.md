# AGENTS.md — instrucciones para agentes en el proyecto E-Nation

Este archivo se carga como instrucciones del workspace y **narrowa** los defaults de `~/.zcode/AGENTS.md` para este repositorio. Léelo antes de tocar nada.

## Qué es este proyecto

Migración de `e-nation.org` (WordPress + The7 + Elementor, 16 páginas en 3 idiomas) y de la documentación del Pacto Social (hoy en Read the Docs) a **Astro + Tailwind v4 en Cloudflare Pages**, con un solo pipeline para ambos.

**Antes de tomar cualquier decisión de diseño o arquitectura, lee `findings.md` y `task_plan.md`.** Contienen el recon completo del original, las decisiones ya tomadas con su justificación, y lo que falta por verificar. No vuelvas a investigar lo que ya está ahí.

## Memoria obligatoria

Mantén los tres archivos de la raíz actualizados. El hook `SessionStart` reinyecta `task_plan.md` después de cada `/clear` o compactación, así que si no lo actualizas, el contexto perdido no se recupera.

- **`findings.md`** — después de **cada** descubrimiento. Regla de las 2 acciones: tras dos operaciones de navegación, búsqueda o visión, escribe lo aprendido **inmediatamente**. El contenido visual (capturas, imágenes) **no persiste** en contexto: descríbelo en prosa antes de que desaparezca.
- **`progress.md`** — después de cada acción relevante, durante las pruebas y en **todos** los errores. Sin excepciones.
- **`task_plan.md`** — al cerrar una fase o cuando cambie el siguiente paso.

Nunca repitas un enfoque que ya falló: está registrado en la tabla de errores.

## La skill del proyecto

Usa `.zcode/skills/wordpress-to-cloudflare/SKILL.md` como metodología. **Vive aquí a propósito**: la copia de usuario se eliminó porque en ZCode el scope de usuario tiene precedencia y shadowea la del proyecto, así que la única forma de que esta versión cargue es que no exista la otra. Si alguien "restaura" la skill en `~/.zcode/skills/`, esta dejará de cargar en silencio.

## Stack fijo

- **Astro 7**, `output: 'static'`, **sin adapter `@astrojs/cloudflare`** (Pages sirve estáticos; el adapter es para Workers).
- **Tailwind v4 vía `@tailwindcss/vite`**. `@astrojs/tailwind` está deprecado. **Sin `tailwind.config.mjs`**: la config vive en `src/styles/global.css` con `@theme`.
- Los estilos base de elementos (`body`, `a`, `h1`) van **dentro de `@layer base`**. Sin capa pisan todas las utilidades de Tailwind y verás colores incorrectos **sin errores de build**: el bug es invisible hasta que inspeccionas el color computado.
- **Propiedades lógicas** (`ps-`/`pe-`, `ms-`/`me-`, `text-start`/`text-end`) en vez de izquierda/derecha. Cuesta lo mismo y habilita RTL para futuros idiomas.
- **Node 22** en Cloudflare Pages. La máquina local puede tener otra: el `.nvmrc` manda.
- `@astrojs/sitemap` para el sitemap; **Pagefind** (incluido en Starlight) para la búsqueda. Sin servicios de búsqueda externos.

## Reglas de contenido

- **Nunca inventes diseño, colores, tipografías ni efectos.** Se extraen del CSS y el HTML renderizado real del original. La paleta medida y los ficheros de donde sale están en `findings.md`. Ojo con los falsos positivos: el tema The7 trae `#1ebbf0` y `#39dfaa` con cientos de apariciones que **no son la marca**.
- **Páginas legales** (privacidad y términos): se migran **mecánicamente por script**. El texto legal **nunca** pasa por el chat, ni citado, ni a subagentes (dispara falsos positivos de filtros de seguridad — error [1301] real). El script reporta solo métricas. Ver la Fase 6 de la skill.
- **Idioma de autoría: español.** El inglés y el francés se generan desde la memoria de traducción. Las traducciones existentes del original entran como entradas definitivas y **no se regeneran**.
- **Los archivos por idioma se generan en el build** desde la memoria. No los edites a mano: la siguiente regeneración los pisa. Las correcciones van a la memoria.
- **Documenta en español**, incluido este archivo, el README y los comentarios de código.

## Trampas verificadas

- Empareja **simétricamente** los duplicados desktop/móvil: `lg:hidden` con `lg:flex`. Un `sm:flex` con `lg:hidden` produce dos iconos visibles entre 640 y 1023 px.
- Para el wrap infinito de carruseles usa **`setTimeout` ajustado a la duración de la transición**, no `transitionend`: no dispara de forma fiable en pestañas en segundo plano y el flag de animación se queda trabado.
- Al capturar con AOS: espera ~3 s e inyecta `[data-aos]{opacity:1!important;transform:none!important;transition:none!important}`. Sin `transition:none` pillas la animación a medias.
- `fullPage: true` da timeout en páginas largas: captura por tramos con `window.scrollTo({top:N,behavior:'instant'})` (`smooth` impide el salto exacto). Una captura por pestaña.
- Si una utilidad negativa no compila (`-translate-x-full`), usa el valor arbitrario (`translate-x-[-100%]`) y **verifica la clase en el CSS de `dist/`**, no solo en el HTML.
- **Parallax: mide, no deduzcas.** Hay que reportar por elemento el `background-attachment` y el `transform` computados. Fondo fijo y transform se perciben distinto y el ojo lee el transform como estático aunque "funcione".
- Cuando el usuario reporte "no funciona", **mide en real** (estilos computados, respuestas HTTP, `transform`) y descarta la caché del navegador (Ctrl+F5) antes de tocar código.

## Aviso de seguridad: el correo

```
MX     5 e-nation.org.        ← el correo vive en el MISMO servidor que el sitio
A      e-nation.org → 157.173.108.34   (DNS-only, VPS Contabo)
mail   → CNAME al apex        ← se rompe al cambiar el A
www    → CNAME al apex
DMARC  v=DMARC1; p=reject;
```

**No toques nunca MX, SPF ni DMARC.** Al cambiar el A del apex para el cutover, `mail` y `www` quedan apuntando a Cloudflare (que no reenvía SMTP) y el correo se cae: hay que restaurarlos como A **DNS-only** a `157.173.108.34` en el mismo movimiento. El cutover solo se ejecuta con el runbook de la Fase 9 de la skill delante, en hora de bajo tráfico, con acceso al panel del VPS para revertir, y **no se da por cerrado sin un email de prueba real del usuario**.

Por eso el orden es docs primero: `docs.e-nation.org` es un subdominio de la zona propia, no toca el apex ni el correo, y sirve de ensayo general del pipeline completo.

## Verificación antes de afirmar

- **Verifica antes de dar algo por hecho**: corre el build, lee el estilo computado, mira la respuesta HTTP. Un HTML que contiene el marcador correcto **no** prueba que el estilo se aplique.
- Ante una discrepancia de color, **haz zoom a la captura original** antes de "corregir": a tamaño reducido un botón azul parece coral. Confía en la medición, no en la impresión.
- Antes del deploy, pasa un juez visual (subagente) con parejas de imágenes re-escaladas a ~720 px. Excluye las páginas legales.
- Si un efecto queda medido pero el usuario no lo percibe, **no está bien calibrado**. Ofrece el parámetro de ajuste.

## Intervenciones del usuario necesarias

Tres puntos requieren al usuario, no los intentes resolver solo: **acceso a la cuenta de Read the Docs** (para quitar el dominio propio), **repo de GitHub**, y **cuenta de Cloudflare Pages**. Y para el cutover, un **email de prueba real**.

## Fuera de alcance

La migración del otro WordPress que aloja los artículos (otro dominio) **la hará otro agente más adelante**. Aquí solo se reproducen fielmente los enlaces que apuntan allí, sin arreglarlos, y se anota la dependencia en `findings.md`.
