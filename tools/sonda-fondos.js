/*
 * SONDA DE FONDOS Y PARALLAX, a varios desplazamientos.
 *
 * POR QUE A VARIOS DESPLAZAMIENTOS
 *   Un fondo puede estar quieto respecto a la PAGINA (se mueve con el scroll), quieto
 *   respecto a la VENTANA (`background-attachment: fixed`, no se mueve nunca), o
 *   moverse a otra velocidad por un `transform` que alguien actualiza con JavaScript.
 *   Las tres cosas se ven iguales en una captura fija: hay que comparar la posicion
 *   del elemento y la del fondo en dos desplazamientos distintos para distinguirlas.
 *
 * QUE DEVUELVE
 *   Por cada elemento con imagen de fondo: la tecnica, la posicion del fondo, su
 *   tamano, su `transform`, y la posicion del elemento en la ventana en cada
 *   desplazamiento. Con eso se calcula si el fondo se mueve y cuanto.
 *
 * Se inyecta con evaluate() en la pagina. Devuelve un objeto serializable.
 */
async function sondarFondos(desplazamientos) {
  const esp = (ms) => new Promise((r) => setTimeout(r, ms));

  const conFondo = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.backgroundImage === 'none' || !s.backgroundImage.includes('url(')) continue;
    const r = el.getBoundingClientRect();
    // Solo fondos con entidad: los iconos y los degradados pequenos no son parallax
    if (r.width < 200 || r.height < 120) continue;
    conFondo.push(el);
  }

  const instantanea = () => conFondo.map((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      arriba: Math.round(r.top),
      alto: Math.round(r.height),
      ancho: Math.round(r.width),
      attachment: s.backgroundAttachment,
      posicion: s.backgroundPosition,
      tamano: s.backgroundSize,
      transform: s.transform === 'none' ? null : s.transform.slice(0, 40),
      opacity: s.opacity,
      imagen: (s.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/) || [, ''])[1].split('/').pop().slice(0, 40),
    };
  });

  const muestras = [];
  for (const y of desplazamientos) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await esp(450);
    muestras.push({ scroll: Math.round(window.scrollY), fondos: instantanea() });
  }
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Se resume por elemento: cuantos px se movio respecto a la ventana mientras el
  // scroll avanzo. Si no se movio nada y la ventana si, el fondo es FIJO.
  const resumen = conFondo.map((el, i) => {
    const primera = muestras[0].fondos[i];
    const ultima = muestras[muestras.length - 1].fondos[i];
    const scrollRecorrido = muestras[muestras.length - 1].scroll - muestras[0].scroll;
    const movimientoElemento = primera.arriba - ultima.arriba;
    // Un elemento normal se mueve con el scroll: tantos px como scroll.
    // Un fondo `fixed` no se mueve respecto a la ventana: 0 px.
    return {
      i,
      imagen: primera.imagen,
      tecnica: primera.attachment === 'fixed' ? 'FIJO (attachment)'
        : primera.transform ? 'TRANSFORM (js)'
        : 'se mueve con la pagina',
      ancho: primera.ancho,
      alto: primera.alto,
      posicion: primera.posicion,
      tamano: primera.tamano,
      desplazamientoElemento: movimientoElemento,
      desplazamientoScroll: scrollRecorrido,
      // Si el fondo tuviera parallax por transform, el transform cambiaria
      transformCambia: primera.transform !== ultima.transform,
      posicionesTop: muestras.map((m) => m.fondos[i].arriba),
    };
  });

  const porTecnica = {};
  for (const r of resumen) porTecnica[r.tecnica] = (porTecnica[r.tecnica] || 0) + 1;

  return { total: resumen.length, porTecnica, fondos: resumen };
}
