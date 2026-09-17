/*
 * Geometria del carrusel, sobre TODAS las diapositivas a la vez.
 *
 * POR QUE NO BASTA CON MEDIR LA VISIBLE
 *   El carrusel solo marca `aria-hidden="false"` en la diapositiva activa, pero
 *   todas estan en el DOM y todas tienen maquetacion calculada. Los defectos que
 *   reporto el usuario (textos solapados, logo descentrado y cortado, texto de
 *   abajo pisado) estan repartidos entre diapositivas, asi que hay que medirlas
 *   todas o se escapan.
 *
 * QUE MIDE
 *   1. DESBORDE del texto fuera de su propia capa (scrollWidth/Height vs
 *      clientWidth/Height). Delata una capa demasiado estrecha para su contenido.
 *   2. DESBORDE de la capa fuera de la diapositiva (por arriba o por abajo).
 *   3. SOLAPE entre pares de capas de texto, con el area en px2 y el porcentaje
 *      sobre la menor. Se mide DOS veces: con la ola parada (posicion de reposo)
 *      y con la ola en su punto mas alto (-8 px), porque una animacion puede
 *      crear un choque que en reposo no existe.
 *   4. ENCUADRE de cada imagen contra su capa y contra la diapositiva: si el
 *      centro de la imagen no coincide con el de su capa (descentrado) o si
 *      sobresale del borde de la diapositiva (cortado).
 *
 * LAS LETRAS DE LA OLA NO ROMPEN LINEA
 *   Los espacios de una capa con ola se pintan como espacio duro (U+00A0) para
 *   que la onda no se coma el hueco. Eso impide el salto de linea dentro de la
 *   capa: si el texto es largo, se sale. Por eso el punto 1 es critico en las
 *   capas con ola y hay que comprobarlo en TODOS los idiomas.
 */
async function medirGeometria() {
  const esp = (ms) => new Promise((r) => setTimeout(r, ms));
  const caja = (el) => {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const limpio = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const area = (a, b) => {
    const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return x * y;
  };

  // Las capas de la ola se congelan para tener una base estable, y luego se
  // lleva el reloj al punto mas alto de la onda para medir otra vez. La flotacion
  // tambien se congela: si no, su desplazamiento se lee como un descentrado.
  const estilo = document.createElement('style');
  estilo.id = 'congelar-ola';
  estilo.textContent = '.banner-slider__letra{animation:none !important}' +
                       '.banner-slider__flota{animation:none !important}' +
                       '.banner-slider__capa[data-loop]{animation:none !important}' +
                       '.banner-slider__capa[data-anim]{animation:none !important}';
  document.head.appendChild(estilo);

  /*
   * GUARDIAN DE DECLARACIONES DESCARTADAS.
   *
   * Una declaracion invalida no da error: el navegador la tira y sigue. Es la
   * clase de fallo que mas caro sale aqui (ya van dos), asi que se comprueba en
   * cada `style` del documento: se recorre lo ESCRITO y se pregunta al navegador
   * por cada propiedad. Si responde vacio, la descarto y hay que arreglarla.
   */
  const descartadas = [];
  for (const el of document.querySelectorAll('[style]')) {
    const crudo = el.getAttribute('style') || '';
    const escritas = crudo.split(';').map((s) => s.trim()).filter(Boolean);
    const rechazadas = [];
    for (const d of escritas) {
      const i = d.indexOf(':');
      if (i < 0) { rechazadas.push(d); continue; }
      const prop = d.slice(0, i).trim();
      if (!el.style.getPropertyValue(prop)) rechazadas.push(d.slice(0, 80));
    }
    if (rechazadas.length) {
      descartadas.push({ clases: String(el.className || '').slice(0, 70), rechazadas: rechazadas.slice(0, 3) });
    }
  }

  const salida = { diapositivas: [], avisos: [] };
  const slides = [...document.querySelectorAll('.banner-slider__slide')];

  for (const [i, s] of slides.entries()) {
    const cs = caja(s);
    const info = { i, enlace: s.getAttribute('href'), visible: s.getAttribute('aria-hidden') === 'false',
                   caja: cs, capas: [], desbordes: [], solapesReposo: [], solapesOla: [], encuadre: [], idioma: null };

    const capas = [...s.querySelectorAll('.banner-slider__capa')].filter(
      (c) => c.tagName === 'SPAN' && (c.textContent || '').trim().length > 1
    );

    for (const c of capas) {
      const conOla = !!c.querySelector('.banner-slider__letra');
      if (!info.idioma) {
        const t = limpio(c.textContent).toLowerCase();
        if (/\b(les|des|pour|avec|notre|société|jouer|conçue|nouvelle)\b/.test(t)) info.idioma = 'fr';
        else if (/\b(the|and|for|with|our|society|play|economy|designed)\b/.test(t)) info.idioma = 'en';
        else info.idioma = 'es';
      }
      const cc = caja(c);
      const ec = getComputedStyle(c);
      info.capas.push({ texto: limpio(c.textContent), ola: conOla, caja: cc,
        // Diagnostico del posicionamiento: si `transform` no se aplica, la capa
        // se queda en `left`/`top` crudos y varias acaban apiladas en el mismo sitio.
        display: ec.display, position: ec.position, transform: ec.transform,
        left: ec.left, top: ec.top, translate: ec.translate, zIndex: ec.zIndex });

      // 1. Desborde del contenido dentro de su capa
      const dx = c.scrollWidth - c.clientWidth;
      const dy = c.scrollHeight - c.clientHeight;
      if (dx > 2 || dy > 2) {
        info.desbordes.push({ texto: limpio(c.textContent), ola: conOla, dx, dy,
          scroll: [c.scrollWidth, c.scrollHeight], cliente: [c.clientWidth, c.clientHeight] });
      }
      // 2. Desborde de la capa fuera de la diapositiva
      const fueraArriba = Math.max(0, cs.y - cc.y);
      const fueraAbajo = Math.max(0, cc.y + cc.h - (cs.y + cs.h));
      if (fueraArriba > 2 || fueraAbajo > 2) {
        info.desbordes.push({ texto: limpio(c.textContent), fueraDeDiapositiva: { arriba: fueraArriba, abajo: fueraAbajo } });
      }
    }

    // 3. Solapes, en reposo y con la ola arriba.
    // Se comparan las LINEAS REALES, no la caja del elemento: una capa puede tener
    // una caja mas alta que su texto y eso no es un solape que se vea.
    //
    // Y no basta con `Range.getClientRects()` a secas: en una capa con ola CADA
    // LETRA es un elemento propio, asi que el rango devuelve un rectangulo por
    // letra y no por linea. Esos rectangulos sueltos se agrupan por fila (misma
    // banda vertical) y de cada fila se toma el ancho completo: eso si es la linea
    // que se ve.
    const lineas = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((b) => b.width > 1 && b.height > 1);
      const filas = [];
      for (const b of rects.sort((p, q) => p.top - q.top)) {
        const centro = (b.top + b.bottom) / 2;
        const fila = filas.find((f) => Math.abs(f.centro - centro) < Math.min(f.alto, b.height) * 0.5);
        if (fila) {
          fila.x0 = Math.min(fila.x0, b.left);
          fila.x1 = Math.max(fila.x1, b.right);
          fila.y0 = Math.min(fila.y0, b.top);
          fila.y1 = Math.max(fila.y1, b.bottom);
          fila.alto = Math.max(fila.alto, b.height);
          fila.centro = (fila.y0 + fila.y1) / 2;
        } else {
          filas.push({ x0: b.left, x1: b.right, y0: b.top, y1: b.bottom, alto: b.height, centro });
        }
      }
      return filas.map((f) => ({ x: Math.round(f.x0), y: Math.round(f.y0),
                                 w: Math.round(f.x1 - f.x0), h: Math.round(f.y1 - f.y0) }));
    };
    const medirSolapes = () => {
      const porCapa = capas.map((c) => ({ texto: limpio(c.textContent), lineas: lineas(c) }));
      const res = [];
      for (let a = 0; a < porCapa.length; a++) {
        for (let b = a + 1; b < porCapa.length; b++) {
          for (const la of porCapa[a].lineas) {
            for (const lb of porCapa[b].lineas) {
              const sol = area(la, lb);
              const menor = Math.min(la.w * la.h, lb.w * lb.h);
              // Un solape real de glifos es grande; el roce de cajas, no cuenta.
              if (sol > 0 && sol / menor > 0.25) {
                res.push({ a: porCapa[a].texto.slice(0, 26), b: porCapa[b].texto.slice(0, 26),
                           lineaA: la, lineaB: lb, px2: Math.round(sol), pct: Math.round((sol / menor) * 100) });
              }
            }
          }
        }
      }
      // Se agrupa por pareja de capas para que el informe no se repita linea a linea
      const porPareja = new Map();
      for (const s of res) {
        const k = s.a + ' || ' + s.b;
        const previo = porPareja.get(k);
        if (!previo || s.pct > previo.pct) porPareja.set(k, s);
      }
      return { parejas: [...porPareja.values()], paresDeLineas: res.length };
    };
    const reposo = medirSolapes();
    info.solapesReposo = reposo.parejas;
    info.lineasPisadasReposo = reposo.paresDeLineas;

    // Llevar todas las letras al 50% de la onda
    for (const letra of s.querySelectorAll('.banner-slider__letra')) {
      for (const an of letra.getAnimations()) { try { an.currentTime = 1250; an.pause(); } catch (e) { /* noop */ } }
    }
    await esp(60);
    const conOla = medirSolapes();
    info.solapesOla = conOla.parejas;
    info.lineasPisadasConOla = conOla.paresDeLineas;
    for (const letra of s.querySelectorAll('.banner-slider__letra')) {
      for (const an of letra.getAnimations()) { try { an.currentTime = 0; } catch (e) { /* noop */ } }
    }

    // 4. Encuadre de las imagenes
    for (const img of s.querySelectorAll('img')) {
      const padre = img.parentElement;
      if (!padre || !padre.classList.contains('banner-slider__capa')) {
        if (padre && padre.tagName === 'DIV' && !img.classList.contains('banner-slider__capa')) continue; // fondo
        if (!img.classList.contains('banner-slider__capa')) continue;
      }
      const ci = caja(img);
      const cp = padre && padre.classList.contains('banner-slider__capa') ? caja(padre) : null;
      const desvio = cp ? { x: Math.round((ci.x - cp.x) - (cp.w - ci.w) / 2), y: Math.round((ci.y - cp.y) - (cp.h - ci.h) / 2) } : null;
      const cortaArriba = Math.max(0, Math.round(cs.y - ci.y));
      const cortaAbajo = Math.max(0, Math.round(ci.y + ci.h - (cs.y + cs.h)));
      if ((desvio && (Math.abs(desvio.x) > 3 || Math.abs(desvio.y) > 3)) || cortaArriba > 2 || cortaAbajo > 2) {
        info.encuadre.push({ src: (img.getAttribute('src') || '').split('/').pop(),
          cajaImagen: ci, cajaCapa: cp, desvioDelCentro: desvio, cortado: { arriba: cortaArriba, abajo: cortaAbajo } });
      }
    }

    salida.diapositivas.push(info);
  }

  estilo.remove();
  salida.total = slides.length;
  salida.descartadas = descartadas.slice(0, 20);
  salida.totalDescartadas = descartadas.length;
  if (descartadas.length) salida.avisos.push(`DECLARACIONES DESCARTADAS por el navegador: ${descartadas.length}`);
  for (const d of salida.diapositivas) {
    if (d.solapesReposo.length) salida.avisos.push(`diapositiva ${d.i} (${d.idioma}): ${d.solapesReposo.length} solape(s) EN REPOSO`);
    if (d.solapesOla.length > d.solapesReposo.length) salida.avisos.push(`diapositiva ${d.i} (${d.idioma}): la ola CREA solapes`);
    if (d.desbordes.some((x) => 'dx' in x)) salida.avisos.push(`diapositiva ${d.i} (${d.idioma}): texto desbordado de su capa`);
    if (d.encuadre.length) salida.avisos.push(`diapositiva ${d.i} (${d.idioma}): imagen descentrada o cortada`);
  }
  return salida;
}
