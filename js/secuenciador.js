/* ACID LAB · PORTADA · secuenciador.js
   Nueve filas (ingredientes y material de lab) por 16 pasos, con tempo
   ajustable de 100 a 140 bpm (de a 2, en vivo). En escritorio el compás va en
   una línea; en celular se ve una mitad a la vez (1-8 / 9-16) con dos
   pestañas, y mientras suena la pestaña sigue sola al pulso. Cada casilla es
   un botón con aria-pressed; la columna que suena se marca con .ahora. */

import { FILAS } from './sonido.js';

export function iniciarSecuenciador({ raiz, sonido, figuras, t }) {
  const rejilla = raiz.querySelector('.seq-rejilla');
  const btnPlay = raiz.querySelector('[data-seq="play"]');
  const btnAcid = raiz.querySelector('[data-seq="acid"]');
  const btnLimpiar = raiz.querySelector('[data-seq="limpiar"]');
  const pestanas = [...raiz.querySelectorAll('[data-mitad]')];
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
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'seq-c' + (i % 4 === 0 ? ' tiempo' : '');
      c.dataset.m = i < 8 ? '1' : '2';
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
  function estadoPlay(tt = t) {
    btnPlay.setAttribute('aria-pressed', String(sonido.tocando));
    btnPlay.textContent = tt(sonido.tocando ? 'stop' : 'play');
  }

  let mitad = '1';
  function verMitad(m) {
    if (m === mitad) return;
    mitad = m;
    rejilla.dataset.mitad = m;
    pestanas.forEach(p => p.setAttribute('aria-pressed', String(p.dataset.mitad === m)));
  }
  rejilla.dataset.mitad = mitad;
  pestanas.forEach(p => p.addEventListener('click', () => verMitad(p.dataset.mitad)));

  // tempo
  const bpmVal = raiz.querySelector('.bpm-val');
  const pintarBpm = () => { bpmVal.textContent = String(sonido.bpm); };
  raiz.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
    sonido.fijarBpm(sonido.bpm + (b.dataset.bpm === '+' ? 2 : -2));
    pintarBpm();
  }));
  pintarBpm();

  btnPlay.addEventListener('click', () => { sonido.tocando ? sonido.stop() : sonido.play(); estadoPlay(); });
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
    if (paso === 0 || paso === 8) verMitad(paso < 8 ? '1' : '2');
  });

  rotular(t);
  return { azar, pintar, rotular };
}
