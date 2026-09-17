# banner-slider — carrusel de banners con enlaces

Componente de Astro **autónomo y reutilizable** para los banners que enlazan a
otros proyectos. Nació de migrar los sliders de **Slider Revolution** del sitio de
E-Nation, pero **no sabe nada de E-Nation**: se alimenta de un JSON con el formato
que se describe abajo.

## Para qué sirve, en una frase

Reemplaza a Slider Revolution en un sitio estático: un carrusel de banners con
imagen, capas de texto encima y **un enlace por banner**, sin jQuery, sin licencia
y sin el peso del plugin.

## Cómo se usa en otro proyecto

1. **Copia esta carpeta entera** (`shared/banner-slider/`) a tu proyecto. No
   depende de nada más: los estilos van dentro del propio componente.
2. **Copia también `tools/revslider-to-config.cjs`** si vas a migrar sliders de
   Slider Revolution. Necesita el JSON extraído de la base de datos del WordPress
   (ver «Extraer los sliders del WordPress», abajo).
3. Añade tu configuración en JSON y renderiza:

```astro
---
import BannerSlider from '../shared/banner-slider/BannerSlider.astro';
import config from '../sliders/mi-slider.json';
---

<BannerSlider
  config={config}
  etiqueta="Banners de proyectos"
  etiquetaAnterior="Anterior"
  etiquetaSiguiente="Siguiente"
/>
```

Los textos de accesibilidad se pasan traducidos desde fuera, para que el
componente no imponga ningún idioma.

## El formato de configuración

```jsonc
{
  "id": "mi-slider",
  "lienzo": { "ancho": "100%", "alto": "auto" },
  "comportamiento": {
    "autoplay": true,
    "intervaloMs": 6000,
    "bucle": true,
    "pausaAlPasarRaton": true
  },
  "slides": [
    {
      "id": 1,
      "titulo": "Nombre del proyecto",
      // EL ENLACE DEL BANNER. En Slider Revolution vive en `params.seo.link`.
      "enlace": { "href": "https://otro-proyecto.com", "target": "_blank", "externo": true },
      "fondo": { "imagen": "https://.../banner.jpg", "color": null },
      "capas": [
        {
          "uid": 10,
          "tipo": "texto",              // "texto" | "imagen" | "forma"
          "texto": "Juega y Coopera para Crecer",
          "posicion": {
            "horizontal": "center",      // "left" | "center" | "right"
            "vertical": "middle",        // "top" | "middle" | "bottom"
            "offsetX": "20px",           // opcional
            "offsetY": null,             // opcional
            "zIndex": 5
          },
          "tamano": { "ancho": "650px", "alto": null },
          "variantes": {                 // SOLO lo que difiere del escritorio
            "movil": { "ancho": "300px" }
          }
        }
      ]
    }
  ]
}
```

### Decisiones del formato que conviene conocer

- **Los enlaces viven en el slide, no en la capa.** Un banner es clicable entero.
  Si el original tuviera enlaces por capa, también se soportan (`capa.enlace`).
- **Las variantes responsive solo se escriben cuando difieren.** Repetir el valor
  de escritorio en los cuatro dispositivos, como hace Slider Revolution, multiplica
  el archivo por cuatro sin aportar nada.
- **`externo: true`** añade `rel="noopener noreferrer"`. Importante para enlaces a
  otros dominios.

## Qué cubre y qué no

**Cubre**: imagen de fondo, capas de texto e imagen posicionadas, enlace por slide,
autoplay con pausa al pasar el ratón **y al recibir el foco**, navegación con
flechas y puntos, teclado, bucle, y respeto a `prefers-reduced-motion`.

**No cubre, a propósito**: las animaciones de entrada capa por capa de Slider
Revolution (fotogramas con transformaciones por eje y por dispositivo). Replicarlas
obligaría a arrastrar toda la complejidad del plugin a cada proyecto. El generador
**avisa de cuántas quedan sin mapear**, para que no se pierdan en silencio.

## Extraer los sliders del WordPress

El generador necesita las tablas del plugin, no el HTML. Con acceso al panel:

```sql
SELECT * FROM wp_revslider_sliders;
SELECT * FROM wp_revslider_slides;
```

El extractor de este proyecto (`tools/wp-extract.php`) ya las vuelca a un JSON
junto con lo demás. Luego:

```bash
node tools/revslider-to-config.cjs            # todos
node tools/revslider-to-config.cjs bann        # solo los que coincidan
```

El generador escribe en `src/sliders/` y **reporta al final lo que no ha podido
mapear**, incluyendo los slides que se quedan **sin ningún enlace**: si estos
banners existen para enlazar a otros proyectos, un banner sin destino es
sospechoso de mapeo perdido y hay que mirarlo.

## Detalles de implementación que no conviene cambiar

- **El bucle usa `setTimeout` ajustado a la duración de la transición, no
  `transitionend`.** Ese evento no dispara de forma fiable en pestañas en segundo
  plano; cuando falla, el indicador de animación se queda trabado y el carrusel
  deja de responder. Es un fallo que solo se ve al cambiar de pestaña, así que se
  detecta tarde y se atribuye a otra cosa.
- **La pausa también al recibir el foco**, no solo al pasar el ratón: quien navega
  con teclado no debe ver cómo el banner cambia bajo sus pies mientras lo lee.
- **`prefers-reduced-motion` se respeta de verdad**: sin transiciones y sin
  autoplay, no solo acortando la duración.
- **El HTML sale ya con el aspecto correcto** sin que el JavaScript haya cargado:
  las posiciones de las capas se calculan en el servidor. Si el JS falla, el primer
  banner se ve bien (lo único que no habrá es el cambio de slide).
