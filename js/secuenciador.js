/* ACID LAB · PORTADA · secuenciador.js
   Nueve filas (ingredientes y material de lab) por 32 pasos (dos compases),
   con tempo ajustable de 100 a 140 bpm (de a 2, en vivo). En escritorio se ve
   un compás a la vez (1-16 / 17-32); en celular, un cuarto del loop (1-8,
   9-16, 17-24, 25-32). Mientras suena, la pestaña sigue sola al pulso. Cada
   casilla es un botón con aria-pressed; la columna que suena se marca con .ahora. */

import { FILAS, PASOS } from './sonido.js';

export function iniciarSecuenciador({ raiz, sonido, figuras, t }) {
  const rejilla = raiz.querySelector('.seq-rejilla');
  const btnPlay = raiz.querySelector('[data-seq="play"]');
  const btnAcid = raiz.querySelector('[data-seq="acid"]');
  const btnLimpiar = raiz.querySelector('[data-seq="limpiar"]');
  const pestanas = [...raiz.querySelectorAll('[data-cuarto], [data-compas]')];
  const celdas = Object.fromEntries(FILAS.map(f => [f, []]));
  const etiquetas = [];

  for (const f of FILAS) {
    const fila = document.createElement('div');
    fila.className = 'seq-fila';
    fila.dataset.f = f;
    const et = document.createElement('button');
    et.type = 'button';
    et.className = 'seq-et';
    et.dataset.f = f;
    et.innerHTML = figuras[f];
    et.addEventListener('click', () => { sonido.tocar(f); });
    etiquetas.push(et);
    fila.appendChild(et);
    for (let i = 0; i < PASOS; i++) {
      const c = document.createElement('button');
      c.type = 'button';
      // sep: separador cada cuatro pasos dentro del compás; sep-m: el del medio de cada cuarto (celular)
      c.className = 'seq-c' + (i % 4 === 0 ? ' tiempo' : '') + (i % 16 && i % 4 === 0 ? ' sep' : '') + (i % 8 === 4 ? ' sep-m' : '');
      c.dataset.m = String(Math.floor(i / 8) + 1);
      c.dataset.c = String(Math.floor(i / 16) + 1);
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', () => {
        sonido.asegurar();
        const on = sonido.alternar(f, i);
        c.setAttribute('aria-pressed', String(on));
        if (on && !sonido.tocando) sonido.oir(f, i);
      });
      fila.appendChild(c);
      celdas[f][i] = c;
    }
    rejilla.appendChild(fila);
  }

  function rotular(tt) {
    for (const f of FILAS) {
      etiquetas[FILAS.indexOf(f)].setAttribute('aria-label', tt(f));
      celdas[f].forEach((c, i) => c.setAttribute('aria-label', `${tt(f)}, ${tt('paso')} ${i + 1}`));
    }
    estadoPlay(tt);
  }
  function pintar() {
    for (const f of FILAS) celdas[f].forEach((c, i) => c.setAttribute('aria-pressed', String(!!sonido.patron[f][i])));
  }
  // en play pero sin audio todavía (falta el primer toque): el botón dice "play" y late
  function estadoPlay(tt = t) {
    const espera = sonido.tocando && !sonido.sonando;
    btnPlay.setAttribute('aria-pressed', String(sonido.tocando && !espera));
    btnPlay.classList.toggle('espera', espera);
    btnPlay.textContent = tt(espera || !sonido.tocando ? 'play' : 'stop');
  }
  sonido.alEstado(() => estadoPlay());

  // cuarto del loop a la vista (1 a 4); el compás (1 o 2) sale de ahí
  let cuarto = 0;
  function verCuarto(q) {
    if (q === cuarto) return;
    cuarto = q;
    const compas = Math.ceil(q / 2);
    rejilla.dataset.cuarto = String(q);
    rejilla.dataset.compas = String(compas);
    pestanas.forEach(p => p.setAttribute('aria-pressed', String(p.dataset.cuarto ? +p.dataset.cuarto === q : +p.dataset.compas === compas)));
  }
  verCuarto(1);
  pestanas.forEach(p => p.addEventListener('click', () => verCuarto(p.dataset.cuarto ? +p.dataset.cuarto : +p.dataset.compas * 2 - 1)));

  // tempo
  const bpmVal = raiz.querySelector('.bpm-val');
  const pintarBpm = () => { bpmVal.textContent = String(sonido.bpm); };
  raiz.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
    sonido.fijarBpm(sonido.bpm + (b.dataset.bpm === '+' ? 2 : -2));
    pintarBpm();
  }));
  pintarBpm();

  btnPlay.addEventListener('click', () => {
    // la portada arranca en play pero muda hasta el primer toque: si ese toque es este botón, suena en vez de parar
    if (sonido.tocando && !sonido.sonando) sonido.desbloquear();
    else sonido.tocando ? sonido.stop() : sonido.play();
    estadoPlay();
  });
  function azar() {
    sonido.asegurar();
    sonido.azar();
    pintar();
    if (!sonido.tocando) sonido.play();
    estadoPlay();
  }
  btnAcid.addEventListener('click', azar);
  btnLimpiar.addEventListener('click', () => { sonido.limpiar(); pintar(); });

  let ahora = -1;
  sonido.alPaso(paso => {
    if (ahora >= 0) for (const f of FILAS) celdas[f][ahora].classList.remove('ahora');
    ahora = paso;
    if (paso < 0) return;
    for (const f of FILAS) celdas[f][paso].classList.add('ahora');
    if (paso % 8 === 0) verCuarto(paso / 8 + 1);
  });

  rotular(t);
  return { azar, pintar, rotular };
}
