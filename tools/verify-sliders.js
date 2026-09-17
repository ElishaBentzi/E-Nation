/*
 * Verificacion del carrusel de banners EN EL NAVEGADOR, sobre NUESTRO build.
 *
 * POR QUE EXISTE
 *   Buscar el marcador en el HTML no prueba nada (esta escrito en AGENTS.md y ya
 *   nos mordio dos veces). Este script lee el ESTADO COMPUTADO de las animaciones
 *   y la GEOMETRIA RENDERIZADA, que es lo unico que el usuario percibe.
 *
 * QUE RESPONDE
 *   1. OLA   : la letra se mueve de verdad? (`translate` computado cambia entre
 *              dos instantes separados ~180 ms, que es el 7% del ciclo de 2500 ms)
 *   2. FLOTE : lo mismo para las imagenes con `efectoImagen: flotar`
 *   3. LATIDO: `scale` computado del corazon y de las monedas
 *   4. SOLAPE: pares de capas de texto cuyos rectangulos se pisan, con el area
 *              de interseccion en px2. Es el defecto que reporto el usuario.
 *   5. ENCUADRE: cada imagen, comparada con la caja de su diapositiva, para
 *              detectar el logo descentrado o cortado.
 *   6. IDIOMA: que idiomas se ven a la vez (debe haber UNO solo por pagina)
 *
 * COMO SE USA
 *   Se inyecta con page.evaluate() en la pagina construida (preview local o
 *   desplegada). Devuelve un objeto serializable; no imprime nada.
 */
async function verificarSliders() {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const caja = (el) => {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const limpio = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 46);
  const area = (a, b) => {
    const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return x * y;
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (parseFloat(s.opacity) < 0.05) return false;
    const b = el.getBoundingClientRect();
    return b.width > 2 && b.height > 2;
  };

  const contenedores = [...document.querySelectorAll('[data-banner-slider]')];
  const salida = { url: location.href, carruseles: contenedores.length, slides: [], idiomasVisibles: [], avisos: [] };

  const visibles = [...document.querySelectorAll('.banner-slider__slide')]
    .filter((s) => s.getAttribute('aria-hidden') === 'false');

  // ---- 6. IDIOMAS: un slide visible a la vez, y de un solo idioma ----
  // Los botones/puntos no dicen el idioma; lo delata el texto de las capas.
  const pistas = { es: /\b(que|para|con|los|las|del|una|sociedad|economía|juega)\b/i,
                   en: /\b(the|and|for|with|our|society|play|economy|designed)\b/i,
                   fr: /\b(les|des|pour|avec|notre|société|jouer|conçue|une nouvelle)\b/i };
  for (const s of visibles) {
    for (const c of s.querySelectorAll('.banner-slider__capa')) {
      const t = limpio(c.textContent);
      if (t.length < 8) continue;
      for (const [k, re] of Object.entries(pistas)) if (re.test(t)) salida.idiomasVisibles.push(k);
    }
  }
  salida.idiomasVisibles = [...new Set(salida.idiomasVisibles)];
  if (salida.idiomasVisibles.length > 1) salida.avisos.push('IDIOMAS MEZCLADOS a la vez: ' + salida.idiomasVisibles.join('+'));

  for (const [i, s] of visibles.entries()) {
    const cajaSlide = caja(s);
    const info = { indice: i, enlace: s.getAttribute('href') || null, caja: cajaSlide, animaciones: [], solapes: [], encuadre: [] };

    // ---- 1/2/3. ANIMACION: nombre declarado + movimiento real medido ----
    const objetivos = [
      ...[...s.querySelectorAll('.banner-slider__letra')].slice(0, 4).map((el) => ({ el, que: 'letra' })),
      ...[...s.querySelectorAll('.banner-slider__flota')].map((el) => ({ el, que: 'flota' })),
      ...[...s.querySelectorAll('[data-loop]')].map((el) => ({ el, que: 'bucle:' + el.getAttribute('data-loop') })),
    ];
    const antes = objetivos.map((o) => {
      const st = getComputedStyle(o.el);
      return { t: st.translate, s: st.scale, r: st.rotate };
    });
    await esperar(180);
    objetivos.forEach((o, k) => {
      const st = getComputedStyle(o.el);
      const movido = ['translate', 'scale', 'rotate'].some((p) => {
        const ahora = p === 'translate' ? st.translate : p === 'scale' ? st.scale : st.rotate;
        return ahora !== (p === 'translate' ? antes[k].t : p === 'scale' ? antes[k].s : antes[k].r);
      });
      if (k < 6 || !movido) {
        info.animaciones.push({
          que: o.que,
          nombre: st.animationName,
          duracion: st.animationDuration,
          retardo: st.animationDelay,
          antes: antes[k],
          ahora: { t: st.translate, s: st.scale, r: st.rotate },
          movido,
        });
      }
    });

    // ---- 4. SOLAPES entre capas de TEXTO ----
    const textos = [...s.querySelectorAll('.banner-slider__capa')].filter(
      (c) => c.tagName === 'SPAN' && visible(c) && limpio(c.textContent).length > 1
    );
    for (let a = 0; a < textos.length; a++) {
      for (let b = a + 1; b < textos.length; b++) {
        const ca = caja(textos[a]);
        const cb = caja(textos[b]);
        const sol = area(ca, cb);
        // Un solape de mas del 12% del area del menor es defecto, no kerning
        const menor = Math.min(ca.w * ca.h, cb.w * cb.h);
        if (sol > 0 && sol / menor > 0.12) {
          info.solapes.push({
            a: limpio(textos[a].textContent), ca,
            b: limpio(textos[b].textContent), cb,
            px2: Math.round(sol), pct: Math.round((sol / menor) * 100),
          });
        }
      }
    }

    // ---- 5. ENCUADRE de imagenes contra la caja de la diapositiva ----
    for (const img of s.querySelectorAll('img')) {
      if (img.closest('.banner-slider__slide') !== s) continue;
      if (img.parentElement && img.parentElement.tagName === 'DIV' && !img.classList.contains('banner-slider__capa')) continue;
      if (!visible(img)) continue;
      const ci = caja(img);
      const padre = img.parentElement && img.parentElement.classList.contains('banner-slider__capa')
        ? caja(img.parentElement) : null;
      // Recorte: cuanto sobresale de la diapositiva por arriba/abajo
      const cortaArriba = Math.max(0, cajaSlide.y - ci.y);
      const cortaAbajo = Math.max(0, ci.y + ci.h - (cajaSlide.y + cajaSlide.h));
      if (cortaArriba > 2 || cortaAbajo > 2 || (padre && (Math.abs(ci.y - padre.y) > 4 || Math.abs(ci.x - padre.x) > 4))) {
        info.encuadre.push({
          src: (img.getAttribute('src') || '').split('/').pop(),
          caja: ci, capa: padre, cortaArriba, cortaAbajo,
        });
      }
    }

    salida.slides.push(info);
  }

  return salida;
}
