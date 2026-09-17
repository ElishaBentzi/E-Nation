# E-Nation — sitio y documentación

Migración de todo el contenido digital de E-Nation a una infraestructura propia en Astro + Cloudflare Pages.

| | |
|---|---|
| **Sitio actual** | https://e-nation.org — WordPress + The7 + Elementor, 16 páginas en 3 idiomas |
| **Docs actuales** | https://docs.e-nation.org/en/latest/ — Read the Docs (Sphinx) |
| **Destino** | Astro 7 + Tailwind v4 en Cloudflare Pages, un solo pipeline para sitio y docs |
| **Repo** | `ElishaBentzi/E-Nation` (monorepo) |
| **Origen** | https://unitycoin.net |

## Qué hay aquí

```
brand/            tokens de marca compartidos por las dos apps (paleta, tipografías)
astro-docs/       documentación del Pacto Social — Astro Starlight + Pagefind
astro-site/       el sitio — Astro 7 + Tailwind v4
tools/            scripts de build, i18n y extracción
reference/        material extraído del original (HTML renderizado, CSS, uploads, sliders)
screenshots/      capturas de referencia y de verificación
.zcode/skills/    skill wordpress-to-cloudflare, específica de este proyecto
```

Los archivos de marca de la raíz (`E-NATION Logo.ai/.pdf`, `Snake-Gear-Vector.eps`, los PNG de logotipo y los banners) son el material original de diseño. Los dos `Pacto-Social-*.md` son los documentos del Pacto Social que hoy alimentan los docs.

## Memoria del proyecto

`task_plan.md`, `findings.md` y `progress.md` son la memoria de trabajo y viven en la raíz a propósito: el hook `SessionStart` reinyecta `task_plan.md` después de cada `/clear` o compactación. Están versionados para que el historial de decisiones no se pierda.

- **`task_plan.md`** — el objetivo, el siguiente paso y las 8 fases. Actualizar al cerrar cada fase.
- **`findings.md`** — todo lo que hemos descubierto del original: stack, DNS, correo, tokens de marca, estructura de los docs. Consultar antes de decidir nada.
- **`progress.md`** — registro cronológico, resultados de pruebas y errores.

## Comandos

```bash
# Sitio
cd astro-site && npm install && npm run dev        # desarrollo
cd astro-site && npm run build && npm run preview  # build y previsualización

# Docs
cd astro-docs && npm install && npm run dev

# Traducciones (desde la raíz)
npm run i18n:status    # matriz página×idioma; falla si hay cadenas ausentes u obsoletas
npm run i18n:build     # materializa los archivos por idioma desde la memoria
```

## Cómo funciona el multi-idioma

El **español es el idioma de autoría**. El inglés y el francés se generan desde una **memoria de traducción** versionada (`src/i18n/tm/<locale>.jsonl`), indexada por clave estable + hash del texto fuente. Si el español no cambia, la traducción se reutiliza idéntica; si cambia, la entrada queda marcada como obsoleta y `i18n:status` lo detecta. Las traducciones que ya existían en el sitio original entran en la memoria como entradas definitivas y **no se regeneran**.

Publicar algo nuevo: editar el español → `npm run i18n:status` → traducir solo las cadenas nuevas con el agente → revisar y marcar → desplegar.

Para añadir un idioma nuevo: una línea en `src/i18n/config.ts`, la matriz marca todo como ausente, se traduce en una sesión. No hay que tocar componentes, rutas, hreflang ni sitemap.

Los tokens de marca se extraen del CSS real del original y **nunca se inventan**. La paleta medida es naranja `#ff7100` (principal), azul `#095287`, azul oscuro `#003f7f` y rojo `#ff3a2d`, con Roboto y Roboto Slab.

## Despliegue

Dos proyectos de Cloudflare Pages sobre este mismo repositorio:

| proyecto | Root directory | dominio | estado |
|---|---|---|---|
| `e-nation-docs` | `astro-docs` | `docs.unitygenerator.com` | desplegado y verificado |
| `e-nation-site` | `astro-site` | `web.unitygenerator.com` | pendiente de crear |

En los dos: build `npm run build`, output `dist`, y **Node 22** por variable de entorno.

**El Root directory es lo que más importa**: es un monorepo, y sin él el build corre en la raíz del repositorio, donde el `package.json` no tiene script `build`. El síntoma es un 404 en la URL de Pages, que despista bastante.

El dominio vive en un solo archivo por app (`site.config.mjs` en cada una), con la lista de cambio al dominio definitivo escrita dentro. En el sitio, ese archivo gobierna además el `robots.txt`: el despliegue de prueba bloquea el rastreo, porque el WordPress de `e-nation.org` sigue siendo el que debe posicionar.

## Aviso crítico: el correo vive en el servidor del sitio

```
MX     e-nation.org.  → 5 e-nation.org.      (el correo está en el propio servidor web)
A      e-nation.org   → 157.173.108.34       (VPS Contabo, DNS-only / nube gris)
mail   → CNAME al apex        ← se rompe al cambiar el A
www    → CNAME al apex
DMARC  → v=DMARC1; p=reject;
```

Al reemplazar el registro A del apex para apuntar a Cloudflare Pages, `mail` y `www` quedan apuntando a Cloudflare, que **no reenvía SMTP**: el correo se cae. Hay que restaurar `mail` (y `www`) como registro A **DNS-only** a `157.173.108.34` inmediatamente después del cutover. **MX, SPF y DMARC no se tocan nunca.**

Por eso el orden del proyecto es: **docs primero**, sobre `docs.e-nation.org`, que es un subdominio de la zona propia y no toca ni el apex ni el correo. Sirve de ensayo general del pipeline antes del paso irreversible.

## Orden de trabajo

1. **Andamiaje** — skill, documentación del repo, memoria, tokens de marca.
2. **Docs: verificación y contenido** — paridad EN↔ES, conversión de `.rst` a Markdown.
3. **Docs: Starlight, i18n y deploy** — el ensayo general del pipeline completo.
4. **Captura del sitio** — extractor PHP en `/zero/`, capturas, CSS, config de sliders, auditoría de imágenes con texto.
5. **Stack del sitio** — Astro 7, Tailwind v4, manifiesto i18n desde los grupos de traducción de WPML.
6. **Reconstrucción** — header/footer, home con los sliders, interiores, legales por script.
7. **SEO y verificación visual** — captura contra captura, más el juez visual antes del deploy.
8. **Cutover del dominio** — con el runbook del correo y un email de prueba real.

El detalle de cada fase, las decisiones tomadas y por qué están en `task_plan.md` y `findings.md`.

## Reglas que no se negocian

Recogidas también en `AGENTS.md`: nunca inventar diseño, colores ni efectos (se extraen del original); las páginas legales se migran por script sin que el texto pase por el chat; no tocar MX, SPF ni DMARC; y verificar con medición real antes de afirmar que algo funciona.
