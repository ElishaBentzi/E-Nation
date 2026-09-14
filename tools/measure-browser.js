/*
 * Snippet de medicion para ejecutar EN EL NAVEGADOR sobre el sitio original.
 *
 * POR QUE EXISTE
 *   Hay dos preguntas que NO se pueden responder leyendo el CSS, porque dependen
 *   de la cascada y de lo que el navegador calcula al final:
 *
 *   1. COLOR. `#1ebbf0` (acento del tema The7) y `#ff7100` (el naranja que usa
 *      el CSS de Elementor) conviven en hojas distintas que apuntan a selectores
 *      distintos. Puede haber botones cian y textos naranjas en la misma pagina.
 *      Solo el color COMPUTADO de los elementos visibles lo resuelve.
 *
 *   2. PARALLAX. Hay 420 referencias a `parallax` y 63 elementos con
 *      `elementor-motion-effects`. Son dos tecnicas que se perciben distinto
 *      (fondo fijo vs desplazamiento por transform) y no se distinguen leyendo
 *      el CSS. Hay que leer `background-attachment` y `transform` computados.
 *
 * COMO SE USA
 *   Con browser-use: cargar la pagina, esperar ~3 s, e inyectar este archivo
 *   entero con `page.evaluate`. Devuelve un objeto JSON serializable.
 *   NO usa `console.log` para el resultado: lo DEVUELVE, para poder guardarlo.
 *
 *   El mismo barrido debe hacerse en las 4 paginas construidas con Elementor
 *   (las dos homes y las dos presentaciones) y al menos en una interior plana.
 */
(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (parseFloat(s.opacity) < 0.05) return false;
    return true;
  };

  const hex = (c) => {
    // Normaliza rgb()/rgba() a #rrggbb
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(',').map((x) => parseFloat(x.trim()));
    if (p.length > 3 && p[3] === 0) return null; // transparente
    return '#' + p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  };

  // ---------------------------------------------------------------------
  // 1. COLOR: que colores se ven DE VERDAD, y en que elementos
  // ---------------------------------------------------------------------
  const coloresTexto = {};
  const coloresFondo = {};
  const coloresBorde = {};
  const ejemplos = {};

  const registrar = (bolsa, color, el, prop) => {
    if (!color) return;
    bolsa[color] = (bolsa[color] || 0) + 1;
    const clave = color + '|' + prop;
    if (!ejemplos[clave]) {
      ejemplos[clave] = {
        selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
        texto: (el.textContent || '').trim().slice(0, 60),
        tamanoFuente: getComputedStyle(el).fontSize,
      };
    }
  };

  const textos = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,button,div')];
  for (const el of textos) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    // Solo cuenta el texto propio del elemento, no el de sus hijos
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (propio) registrar(coloresTexto, hex(s.color), el, 'color');

    const bg = hex(s.backgroundColor);
    if (bg && bg !== '#ffffff') registrar(coloresFondo, bg, el, 'background-color');

    const bc = hex(s.borderTopColor);
    if (bc && parseFloat(s.borderTopWidth) > 0 && bc !== bg) registrar(coloresBorde, bc, el, 'border-color');
  }

  // El color de fondo real del body y de las secciones grandes
  const fondosGrandes = {};
  for (const el of document.querySelectorAll('body,section,.elementor-section,.elementor-top-section,footer,header')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const bg = hex(s.backgroundColor);
    if (bg && bg !== '#ffffff') fondosGrandes[bg] = (fondosGrandes[bg] || 0) + 1;
    if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('linear')) {
      const clave = 'IMAGEN:' + s.backgroundImage.slice(0, 70);
      fondosGrandes[clave] = (fondosGrandes[clave] || 0) + 1;
    }
  }

  // ---------------------------------------------------------------------
  // 2. PARALLAX / EFECTOS DE FONDO: tecnica REAL por elemento
  // ---------------------------------------------------------------------
  const fondos = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.backgroundImage === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) continue; // solo fondos con entidad
    fondos.push({
      selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
      attachment: s.backgroundAttachment,
      size: s.backgroundSize,
      repeat: s.backgroundRepeat,
      position: s.backgroundPosition,
      imagen: s.backgroundImage.slice(0, 120),
      transform: s.transform === 'none' ? null : s.transform,
      alto: Math.round(r.height),
      // Pistas de los plugins, que es donde se declara la intencion
      dataThe7: el.getAttribute('data-prlx') || el.getAttribute('data-bg') || el.getAttribute('data-prlx-mouse') || null,
      clases: (el.className && typeof el.className === 'string' ? el.className : '')
        .split(/\s+/).filter((c) => /prlx|parallax|motion|fixed|bg-|aos|rev_|jet-/.test(c)).slice(0, 6),
    });
  }
  // Resumen por tecnica: es lo que decide como se replica cada familia
  const porTecnica = {};
  for (const f of fondos) {
    const t = f.attachment === 'fixed' ? 'FIJO (background-attachment)'
      : f.transform ? 'TRANSFORM (js)'
      : 'estatico';
    porTecnica[t] = (porTecnica[t] || 0) + 1;
  }

  // ---------------------------------------------------------------------
  // 3. Elementos con animacion por JS declarada (motion effects de Elementor)
  // ---------------------------------------------------------------------
  const motionElements = [...document.querySelectorAll('[data-settings*="motion_fx"], .elementor-motion-effects-element, [class*="elementor-motion-effects"]')]
    .slice(0, 40)
    .map((el) => {
      const s = getComputedStyle(el);
      let settings = null;
      try { settings = JSON.parse(el.getAttribute('data-settings') || 'null'); } catch (e) { /* noop */ }
      return {
        selector: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        transform: s.transform,
        opacity: s.opacity,
        translateY: settings && settings.motion_fx_translateY_speed ? settings.motion_fx_translateY_speed : null,
        transition: s.transition.slice(0, 60),
      };
    });

  // ---------------------------------------------------------------------
  // 4. Tipografia realmente aplicada a los titulos
  // ---------------------------------------------------------------------
  const tipografia = {};
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const k = `${s.fontFamily.split(',')[0].replace(/["']/g, '')} ${s.fontWeight} ${s.fontSize}`;
    tipografia[k] = (tipografia[k] || 0) + 1;
  }

  // ---------------------------------------------------------------------
  // 5. Contenedor
  // ---------------------------------------------------------------------
  const contenedores = {};
  for (const el of document.querySelectorAll('.elementor-container,.elementor-section-wrap > *, .content, .wf-wrap, .container')) {
    const s = getComputedStyle(el);
    const w = s.maxWidth;
    if (w && w !== 'none') contenedores[w] = (contenedores[w] || 0) + 1;
  }

  const orden = (o, n = 15) => Object.fromEntries(
    Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n)
  );

  return {
    url: location.href,
    titulo: document.title,
    h1Count: document.querySelectorAll('h1').length,
    colorTexto: orden(coloresTexto),
    colorFondo: orden(coloresFondo),
    colorBorde: orden(coloresBorde),
    fondosGrandes: orden(fondosGrandes),
    ejemplos: Object.fromEntries(Object.entries(ejemplos).slice(0, 40)),
    parallax: { porTecnica, total: fondos.length, elementos: fondos.slice(0, 30) },
    motionElements,
    tipografia: orden(tipografia),
    contenedores: orden(contenedores),
  };
})();
